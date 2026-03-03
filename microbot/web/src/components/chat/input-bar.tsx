// Text input with send/stop controls — Ctrl+Enter to send, disabled while agent thinks
import { useCallback, useRef, type KeyboardEvent, type ChangeEvent } from 'react'

interface InputBarProps {
  onSend: (content: string) => void
  onStop: () => void
  isThinking: boolean
  isConnected: boolean
}

export function InputBar({ onSend, onStop, isThinking, isConnected }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const value = textareaRef.current?.value.trim() ?? ''
    if (!value || isThinking || !isConnected) return
    onSend(value)
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
  }, [onSend, isThinking, isConnected])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // Auto-resize textarea up to ~6 lines
  const handleInput = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  const canSend = isConnected && !isThinking

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={
            !isConnected ? 'Connecting…' : isThinking ? 'Agent is thinking…' : 'Message Nanobot…'
          }
          disabled={!canSend}
          onKeyDown={handleKeyDown}
          onChange={handleInput}
          aria-label="Message input"
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            px-3.5 py-2.5 text-sm leading-relaxed
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors overflow-y-hidden"
          style={{ minHeight: '42px', maxHeight: '160px' }}
        />

        {isThinking ? (
          <button
            onClick={onStop}
            aria-label="Stop generation"
            className="shrink-0 w-10 h-10 rounded-xl bg-red-500 hover:bg-red-600
              text-white flex items-center justify-center transition-colors"
          >
            {/* Stop square */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="shrink-0 w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-600
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white flex items-center justify-center transition-colors"
          >
            {/* Send arrow */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-1.5">
        Ctrl+Enter to send
      </p>
    </div>
  )
}
