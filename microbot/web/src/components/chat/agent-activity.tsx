// Agent activity indicator — shows live tool hints and progress text with animated dots
import type { AgentActivity } from '../../types/messages'

interface AgentActivityProps {
  activity: AgentActivity | null
}

function AnimatedDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

export function AgentActivityIndicator({ activity }: AgentActivityProps) {
  if (!activity) return null

  const isToolHint = activity.type === 'tool_hint'

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%]">
        <div className="flex items-end gap-2">
          {/* Avatar matching assistant bubble */}
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0">
            N
          </div>

          <div
            className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs flex items-center gap-2 ${
              isToolHint
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
            role="status"
            aria-live="polite"
          >
            {isToolHint ? (
              <>
                {/* Tool icon */}
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-4.613m5.672-1.862a3.993 3.993 0 00-.75-4.472 4 4 0 00-6.364.525"
                  />
                </svg>
                <span className="font-mono truncate max-w-xs">{activity.content}</span>
                <AnimatedDots />
              </>
            ) : (
              <>
                <span className="truncate max-w-xs">{activity.content}</span>
                <AnimatedDots />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
