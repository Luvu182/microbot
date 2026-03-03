// Agent tab — model, provider, max tokens, temperature, workspace, and other agent defaults
import { TextInput, SelectInput } from './settings-form-fields'
import { PROVIDER_LABELS } from '../../types/settings'

interface AgentTabProps {
  agents: Record<string, unknown>
  onChange: (agents: Record<string, unknown>) => void
}

const PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  ...Object.entries(PROVIDER_LABELS).map(([k, v]) => ({ value: k, label: v })),
]

const REASONING_OPTIONS = [
  { value: '', label: 'None (disabled)' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function AgentTab({ agents, onChange }: AgentTabProps) {
  const defaults = (agents.defaults ?? {}) as Record<string, unknown>

  function update(key: string, value: unknown) {
    onChange({
      ...agents,
      defaults: { ...defaults, [key]: value },
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Agent Defaults</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput
          label="Model"
          value={(defaults.model as string) ?? ''}
          onChange={(v) => update('model', v)}
          placeholder="anthropic/claude-opus-4-5"
          helpText="Format: provider/model-name"
        />

        <SelectInput
          label="Provider"
          value={(defaults.provider as string) ?? 'auto'}
          onChange={(v) => update('provider', v)}
          options={PROVIDER_OPTIONS}
          helpText="'Auto-detect' matches by model name prefix"
        />

        <TextInput
          label="Max Tokens"
          type="number"
          value={String(defaults.maxTokens ?? 8192)}
          onChange={(v) => update('maxTokens', v ? Number(v) : 8192)}
        />

        <TextInput
          label="Temperature"
          type="number"
          value={String(defaults.temperature ?? 0.1)}
          onChange={(v) => update('temperature', v ? Number(v) : 0.1)}
        />

        <TextInput
          label="Max Tool Iterations"
          type="number"
          value={String(defaults.maxToolIterations ?? 40)}
          onChange={(v) => update('maxToolIterations', v ? Number(v) : 40)}
        />

        <TextInput
          label="Memory Window"
          type="number"
          value={String(defaults.memoryWindow ?? 100)}
          onChange={(v) => update('memoryWindow', v ? Number(v) : 100)}
          helpText="Unconsolidated messages before memory consolidation"
        />

        <SelectInput
          label="Reasoning Effort"
          value={(defaults.reasoningEffort as string) ?? ''}
          onChange={(v) => update('reasoningEffort', v || null)}
          options={REASONING_OPTIONS}
          helpText="Enables LLM thinking mode (low/medium/high)"
        />

        <TextInput
          label="Workspace Path"
          value={(defaults.workspace as string) ?? '~/.nanobot/workspace'}
          onChange={(v) => update('workspace', v)}
          helpText="Default workspace directory for the agent"
        />
      </div>
    </div>
  )
}
