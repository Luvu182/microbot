// Single channel form — renders fields dynamically from ChannelDef, plus allowFrom tag list
import { SecretInput, TextInput, Toggle, TagListInput, SelectInput } from './settings-form-fields'
import type { ChannelDef } from '../../types/settings'

interface ChannelFormProps {
  def: ChannelDef
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

export function SettingsChannelForm({ def, data, onChange }: ChannelFormProps) {
  function update(key: string, value: unknown) {
    onChange({ ...data, [key]: value })
  }

  return (
    <div className="space-y-3">
      {/* Enable toggle */}
      <Toggle
        label={`Enable ${def.label}`}
        checked={(data.enabled as boolean) ?? false}
        onChange={(v) => update('enabled', v)}
      />

      {/* Dynamic fields from channel definition */}
      {def.fields.map((field) => {
        const value = data[field.key]
        switch (field.type) {
          case 'secret':
            return (
              <SecretInput
                key={field.key}
                label={field.label}
                value={(value as string) ?? ''}
                onChange={(v) => update(field.key, v)}
                placeholder={field.placeholder}
              />
            )
          case 'boolean':
            return (
              <Toggle
                key={field.key}
                label={field.label}
                checked={(value as boolean) ?? false}
                onChange={(v) => update(field.key, v)}
              />
            )
          case 'number':
            return (
              <TextInput
                key={field.key}
                label={field.label}
                type="number"
                value={String(value ?? '')}
                onChange={(v) => update(field.key, v === '' ? '' : Number(v))}
                placeholder={field.placeholder}
              />
            )
          case 'select':
            return (
              <SelectInput
                key={field.key}
                label={field.label}
                value={(value as string) ?? ''}
                onChange={(v) => update(field.key, v)}
                options={field.options ?? []}
              />
            )
          default:
            return (
              <TextInput
                key={field.key}
                label={field.label}
                value={(value as string) ?? ''}
                onChange={(v) => update(field.key, v)}
                placeholder={field.placeholder}
              />
            )
        }
      })}

      {/* allowFrom tag list — all channels support this */}
      <TagListInput
        label="Allowed Users"
        values={(data.allowFrom as string[]) ?? []}
        onChange={(v) => update('allowFrom', v)}
        placeholder="User ID or username"
        helpText="Leave empty to allow all users"
      />
    </div>
  )
}
