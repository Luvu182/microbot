// Providers tab — API key and base URL config for each LLM provider
import { useState } from 'react'
import { SecretInput, TextInput } from './settings-form-fields'
import { PROVIDER_LABELS } from '../../types/settings'

interface ProvidersTabProps {
  providers: Record<string, Record<string, unknown>>
  onChange: (providers: Record<string, Record<string, unknown>>) => void
}

// Popular providers first, then regional/niche
const PROVIDER_ORDER = [
  'anthropic', 'openai', 'deepseek', 'gemini', 'openrouter', 'groq',
  'custom', 'moonshot', 'zhipu', 'dashscope', 'minimax', 'aihubmix',
  'siliconflow', 'volcengine', 'vllm', 'openaiCodex', 'githubCopilot',
]

export function ProvidersTab({ providers, onChange }: ProvidersTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function updateProvider(name: string, field: string, value: string) {
    const current = (providers[name] ?? {}) as Record<string, unknown>
    onChange({
      ...providers,
      [name]: { ...current, [field]: value },
    })
  }

  function hasKey(name: string): boolean {
    const p = providers[name] as Record<string, unknown> | undefined
    const key = p?.apiKey as string | undefined
    return !!key && key !== ''
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Configure API keys for LLM providers. Only one provider with a valid key is required.
      </p>

      {PROVIDER_ORDER.map((name) => {
        const isOpen = expanded === name
        const configured = hasKey(name)
        const p = (providers[name] ?? {}) as Record<string, unknown>

        return (
          <div
            key={name}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Accordion header */}
            <button
              onClick={() => setExpanded(isOpen ? null : name)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm
                text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {PROVIDER_LABELS[name] ?? name}
                </span>
                {configured && (
                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-xs
                    bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                    configured
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Accordion body */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                <SecretInput
                  label="API Key"
                  value={(p.apiKey as string) ?? ''}
                  onChange={(v) => updateProvider(name, 'apiKey', v)}
                  placeholder="sk-..."
                />
                <TextInput
                  label="API Base URL (optional)"
                  value={(p.apiBase as string) ?? ''}
                  onChange={(v) => updateProvider(name, 'apiBase', v)}
                  placeholder="https://api.example.com/v1"
                  helpText="Override the default endpoint. Leave empty to use provider's default."
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
