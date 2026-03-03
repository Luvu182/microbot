// Chat hook — manages WebSocket lifecycle, message state, and agent activity
import { useCallback, useEffect, useRef, useState } from 'react'
import { WsClient } from '../lib/ws-client'
import type { WsStatus } from '../lib/ws-client'
import type { AgentActivity, ChatMessage, WsServerFrame } from '../types/messages'

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

  const handleFrame = useCallback((frame: WsServerFrame) => {
    switch (frame.type) {
      case 'auth_ok':
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
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: frame.content,
            timestamp: new Date().toISOString(),
          },
        ])
        break

      case 'error':
        setIsThinking(false)
        setAgentActivity(null)
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'error',
            content: frame.content,
            timestamp: new Date().toISOString(),
          },
        ])
        break

      case 'queued':
        setAgentActivity({ type: 'progress', content: 'Queued — agent is busy…' })
        break
    }
  }, [])

  // Reconnect whenever sessionKey or token changes; reset state on connect
  useEffect(() => {
    const client = new WsClient({
      sessionKey,
      token,
      onFrame: handleFrame,
      onStatusChange: setWsStatus,
      onConnect: () => {
        setMessages([])
        setAgentActivity(null)
        setIsThinking(false)
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
  }, [])

  const resetSession = useCallback(() => {
    clientRef.current?.send({ type: 'new_session' })
    setMessages([])
    setAgentActivity(null)
    setIsThinking(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
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
