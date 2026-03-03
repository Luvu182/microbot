// Single chat message — plain text for user, markdown for assistant/error
import { MarkdownRenderer } from '../common/markdown-renderer'
import type { ChatMessage } from '../../types/messages'

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[80%]">
          <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{time}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        {/* Avatar */}
        <div className="flex items-end gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-5 ${
              isError
                ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {isError ? '!' : 'N'}
          </div>

          <div>
            <div
              className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ${
                isError
                  ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {isError ? (
                <span className="whitespace-pre-wrap break-words">{message.content}</span>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{time}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
