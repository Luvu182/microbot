// Scrollable message history with auto-scroll on new messages
import { useEffect, useRef } from 'react'
import { MessageBubble } from './message-bubble'
import type { ChatMessage } from '../../types/messages'

interface MessageListProps {
  messages: ChatMessage[]
  /** Extra content rendered after the last message (e.g. agent activity) */
  footer?: React.ReactNode
}

export function MessageList({ messages, footer }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect whether the last message is still streaming
  const lastMsg = messages[messages.length - 1]
  const isStreaming = lastMsg?.streaming === true

  // Auto-scroll when message count changes OR while streaming (tokens arriving)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // During streaming, keep scrolling to bottom as content grows
  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [isStreaming, lastMsg?.content])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scroll-smooth"
      aria-label="Chat messages"
      role="log"
      aria-live="polite"
    >
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-600 select-none pointer-events-none pt-16">
          <div className="text-5xl mb-4 opacity-30">N</div>
          <p className="text-sm">Start a conversation with Microbot</p>
          <p className="text-xs mt-1 opacity-60">Messages are streamed in real-time</p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {footer}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}
