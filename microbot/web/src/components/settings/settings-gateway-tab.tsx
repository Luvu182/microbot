// Gateway tab — server host/port, web UI toggle, auth token, CORS origins, allowed users
import { TextInput, SecretInput, Toggle, TagListInput } from './settings-form-fields'

interface GatewayTabProps {
  gateway: Record<string, unknown>
  onChange: (gateway: Record<string, unknown>) => void
}

export function GatewayTab({ gateway, onChange }: GatewayTabProps) {
  const web = (gateway.web ?? {}) as Record<string, unknown>

  function update(key: string, value: unknown) {
    onChange({ ...gateway, [key]: value })
  }

  function updateWeb(key: string, value: unknown) {
    onChange({ ...gateway, web: { ...web, [key]: value } })
  }

  return (
    <div className="space-y-4">
      {/* Server settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Server</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Host"
            value={(gateway.host as string) ?? '0.0.0.0'}
            onChange={(v) => update('host', v)}
            placeholder="0.0.0.0"
          />
          <TextInput
            label="Port"
            type="number"
            value={String(gateway.port ?? 18790)}
            onChange={(v) => update('port', v ? Number(v) : 18790)}
          />
        </div>
      </div>

      {/* Web UI settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Web UI</h3>

        <Toggle
          label="Enable Web UI"
          checked={(web.enabled as boolean) ?? true}
          onChange={(v) => updateWeb('enabled', v)}
        />

        <SecretInput
          label="Auth Token"
          value={(web.token as string) ?? ''}
          onChange={(v) => updateWeb('token', v)}
          placeholder="Leave empty for no authentication"
        />

        <TagListInput
          label="CORS Origins"
          values={(web.corsOrigins as string[]) ?? ['http://localhost:5173']}
          onChange={(v) => updateWeb('corsOrigins', v)}
          placeholder="http://localhost:5173"
          helpText="Allowed origins for cross-origin requests"
        />

        <TagListInput
          label="Allowed Users"
          values={(web.allowFrom as string[]) ?? ['*']}
          onChange={(v) => updateWeb('allowFrom', v)}
          placeholder="* (allow all)"
          helpText="Use * to allow all web users"
        />
      </div>
    </div>
  )
}
