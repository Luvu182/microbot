// Advanced tab — raw JSON editor for power users, syncs with form tabs bidirectionally
import { useEffect, useState } from 'react'

interface AdvancedTabProps {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

function isValidJson(text: string): boolean {
  try { JSON.parse(text); return true } catch { return false }
}

export function AdvancedTab({ config, onChange }: AdvancedTabProps) {
  const [text, setText] = useState(() => JSON.stringify(config, null, 2))

  // Sync text when config changes externally (e.g., other tab edits or reset)
  useEffect(() => {
    setText(JSON.stringify(config, null, 2))
  }, [config])

  function handleChange(newText: string) {
    setText(newText)
    if (isValidJson(newText)) {
      onChange(JSON.parse(newText) as Record<string, unknown>)
    }
  }

  const jsonValid = isValidJson(text)

  return (
    <div className="space-y-3">
      {/* Masked values warning */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg
        bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Fields shown as{' '}
          <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">***</code>
          {' '}are masked secrets. They will be preserved on save — do not replace them unless you want to change the value.
        </p>
      </div>

      <div className="relative">
        {!jsonValid && text && (
          <div className="absolute top-2 right-2 z-10 text-xs text-red-500 dark:text-red-400
            bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
            Invalid JSON
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          spellCheck={false}
          className="w-full h-[55vh] font-mono text-xs rounded-xl border
            border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-900
            text-gray-800 dark:text-gray-200
            p-4 resize-y
            focus:outline-none focus:ring-2 focus:ring-blue-400
            leading-relaxed"
          aria-label="Config JSON editor"
        />
      </div>
    </div>
  )
}
