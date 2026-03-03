// Single chat message — plain text for user, markdown for assistant/error
import { useState } from 'react'
import { MarkdownRenderer } from '../common/markdown-renderer'
import type { ChatMessage, ToolResult } from '../../types/messages'

interface MessageBubbleProps {
  message: ChatMessage
}

/** Blinking cursor shown at end of streaming messages */
function StreamingCursor() {
  return (
    <span
      className="inline-block w-0.5 h-4 bg-current align-middle ml-0.5 animate-pulse"
      aria-hidden="true"
    />
  )
}

/** Collapsible reasoning/thinking section */
function ReasoningBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mb-2 text-xs"
    >
      <summary className="cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 select-none">
        Thinking {open ? '▾' : '▸'}
      </summary>
      <div className="mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
        {content}
      </div>
    </details>
  )
}

/** Collapsed terminal-style tool results */
function ToolResultsBlock({ results }: { results: ToolResult[] }) {
  const [open, setOpen] = useState(false)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mb-2 text-xs"
    >
      <summary className="cursor-pointer text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 select-none">
        Tool calls ({results.length}) {open ? '▾' : '▸'}
      </summary>
      <div className="mt-1 space-y-1 max-h-64 overflow-y-auto">
        {results.map((tr, i) => (
          <div key={i} className="rounded bg-gray-900 dark:bg-black text-gray-300 p-2 font-mono text-[11px] leading-tight">
            <span className="text-green-400">$ {tr.name}</span>
            <pre className="mt-0.5 whitespace-pre-wrap break-words opacity-80">{tr.output}</pre>
          </div>
        ))}
      </div>
    </details>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const isStreaming = message.streaming === true

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
                <>
                  {message.reasoning && <ReasoningBlock content={message.reasoning} />}
                  {message.toolResults && <ToolResultsBlock results={message.toolResults} />}
                  <MarkdownRenderer content={message.content} />
                  {isStreaming && <StreamingCursor />}
                </>
              )}
            </div>
            {!isStreaming && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{time}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
