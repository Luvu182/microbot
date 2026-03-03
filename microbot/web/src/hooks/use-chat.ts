// Chat hook — manages WebSocket lifecycle, message state, and agent activity
import { useCallback, useEffect, useRef, useState } from 'react'
import { createApiClient } from '../lib/api-client'
import { WsClient } from '../lib/ws-client'
import type { WsStatus } from '../lib/ws-client'
import type { AgentActivity, ChatMessage, ToolResult, WsServerFrame } from '../types/messages'
import { STREAMING_MSG_ID } from '../types/messages'

let msgIdCounter = 0
function nextId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`
}

export interface UseChatReturn {
  messages: ChatMessage[]
  agentActivity: AgentActivity | null
  isConnected: boolean
  isThinking: boolean
  wsStatus: WsStatus
  sendMessage: (content: string) => void
  sendStop: () => void
  resetSession: () => void
  clearMessages: () => void
}

interface UseChatOptions {
  sessionKey: string
  token?: string
}

export function useChat({ sessionKey, token }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [agentActivity, setAgentActivity] = useState<AgentActivity | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting')

  // Stable ref to avoid stale closures in WsClient callbacks
  const clientRef = useRef<WsClient | null>(null)

  // Track whether we are currently in a streaming turn
  const streamingRef = useRef(false)

  const handleFrame = useCallback((frame: WsServerFrame) => {
    switch (frame.type) {
      case 'auth_ok':
        break

      case 'stream_chunk':
        // Append chunk to the in-progress streaming message
        setIsThinking(true)
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.id === STREAMING_MSG_ID) {
            // Append to existing streaming message
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + frame.content },
            ]
          }
          // Create new streaming message
          streamingRef.current = true
          return [
            ...prev,
            {
              id: STREAMING_MSG_ID,
              role: 'assistant' as const,
              content: frame.content,
              timestamp: new Date().toISOString(),
              streaming: true,
            },
          ]
        })
        break

      case 'progress':
        setIsThinking(true)
        setAgentActivity({ type: 'progress', content: frame.content })
        break

      case 'tool_hint':
        setIsThinking(true)
        setAgentActivity({ type: 'tool_hint', content: frame.content })
        break

      case 'response':
        setIsThinking(false)
        setAgentActivity(null)
        setMessages((prev) => {
          // If we were streaming, finalise the streaming message
          const last = prev[prev.length - 1]
          if (last && last.id === STREAMING_MSG_ID) {
            streamingRef.current = false
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                id: nextId(),
                // Prefer the complete response content if backend sends it
                content: frame.content || last.content,
                streaming: false,
              },
            ]
          }
          return [
            ...prev,
            {
              id: nextId(),
              role: 'assistant' as const,
              content: frame.content,
              timestamp: new Date().toISOString(),
            },
          ]
        })
        break

      case 'error':
        setIsThinking(false)
        setAgentActivity(null)
        // Remove any dangling streaming message on error
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== STREAMING_MSG_ID)
          streamingRef.current = false
          return [
            ...filtered,
            {
              id: nextId(),
              role: 'error' as const,
              content: frame.content,
              timestamp: new Date().toISOString(),
            },
          ]
        })
        break

      case 'queued':
        setAgentActivity({ type: 'progress', content: 'Queued — agent is busy…' })
        break
    }
  }, [])

  // Reconnect whenever sessionKey or token changes; load history on connect
  useEffect(() => {
    const api = createApiClient(token)
    const client = new WsClient({
      sessionKey,
      token,
      onFrame: handleFrame,
      onStatusChange: setWsStatus,
      onConnect: () => {
        setAgentActivity(null)
        setIsThinking(false)
        // Load session history from REST API
        api.getSession(sessionKey).then((detail) => {
          const history: ChatMessage[] = []
          const msgs = detail.messages
          // Collect tool results that follow an assistant message with tool_calls
          let pendingTools: ToolResult[] = []
          for (let i = 0; i < msgs.length; i++) {
            const m = msgs[i]
            if (m.role === 'tool') {
              // Accumulate tool results — attach to previous or next assistant message
              const output = typeof m.content === 'string' ? m.content : ''
              const lines = output.split('\n')
              pendingTools.push({
                name: m.name || 'tool',
                output: lines.slice(-30).join('\n'), // last 30 lines
              })
              continue
            }
            if (m.role === 'assistant') {
              const content = typeof m.content === 'string' ? m.content : ''
              if (!content) {
                // Tool-call-only turn — skip but keep collecting tool results
                continue
              }
              history.push({
                id: nextId(),
                role: 'assistant',
                content,
                timestamp: m.timestamp || new Date().toISOString(),
                reasoning: m.reasoning_content || undefined,
                toolResults: pendingTools.length > 0 ? pendingTools : undefined,
              })
              pendingTools = []
              continue
            }
            if (m.role === 'user') {
              // Flush any pending tools to previous assistant message
              if (pendingTools.length > 0 && history.length > 0) {
                const last = history[history.length - 1]
                if (last.role === 'assistant') {
                  last.toolResults = [...(last.toolResults || []), ...pendingTools]
                }
                pendingTools = []
              }
              history.push({
                id: nextId(),
                role: 'user',
                content: typeof m.content === 'string' ? m.content : '',
                timestamp: m.timestamp || new Date().toISOString(),
              })
            }
          }
          setMessages(history)
        }).catch(() => {
          // New session or API error — start empty
          setMessages([])
        })
      },
    })
    clientRef.current = client
    client.connect()

    return () => {
      client.destroy()
      clientRef.current = null
    }
  }, [sessionKey, token, handleFrame])

  const sendMessage = useCallback((content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', content: trimmed, timestamp: new Date().toISOString() },
    ])
    setIsThinking(true)
    clientRef.current?.send({ type: 'message', content: trimmed })
  }, [])

  const sendStop = useCallback(() => {
    clientRef.current?.send({ type: 'stop' })
    setIsThinking(false)
    setAgentActivity(null)
    streamingRef.current = false
    // Remove dangling streaming message if stop was pressed mid-stream
    setMessages((prev) => prev.filter((m) => m.id !== STREAMING_MSG_ID))
  }, [])

  const resetSession = useCallback(() => {
    clientRef.current?.send({ type: 'new_session' })
    setMessages([])
    setAgentActivity(null)
    setIsThinking(false)
    streamingRef.current = false
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    streamingRef.current = false
  }, [])

  return {
    messages,
    agentActivity,
    isConnected: wsStatus === 'connected',
    isThinking,
    wsStatus,
    sendMessage,
    sendStop,
    resetSession,
    clearMessages,
  }
}
