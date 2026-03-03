// Channels tab — accordion of channel forms with enable/disable badges and top-level toggles
import { useState } from 'react'
import { Toggle } from './settings-form-fields'
import { SettingsChannelForm } from './settings-channel-form'
import { CHANNEL_DEFS } from './settings-channel-definitions'
import { BridgeChannelStatus } from './bridge-channel-status'

const BRIDGE_CHANNELS = new Set(['zalo', 'whatsapp'])

interface ChannelsTabProps {
  channels: Record<string, unknown>
  onChange: (channels: Record<string, unknown>) => void
}

export function ChannelsTab({ channels, onChange }: ChannelsTabProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  function updateChannel(name: string, data: Record<string, unknown>) {
    onChange({ ...channels, [name]: data })
  }

  function updateTopLevel(key: string, value: unknown) {
    onChange({ ...channels, [key]: value })
  }

  return (
    <div className="space-y-4">
      {/* Top-level channel settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">General</h3>
        <Toggle
          label="Send progress updates to channels"
          checked={(channels.sendProgress as boolean) ?? true}
          onChange={(v) => updateTopLevel('sendProgress', v)}
        />
        <Toggle
          label="Send tool hint messages"
          checked={(channels.sendToolHints as boolean) ?? false}
          onChange={(v) => updateTopLevel('sendToolHints', v)}
        />
      </div>

      {/* Channel accordion — same pattern as providers tab */}
      {CHANNEL_DEFS.map((def) => {
        const isOpen = expanded === def.name
        const data = (channels[def.name] ?? {}) as Record<string, unknown>
        const enabled = (data.enabled as boolean) ?? false

        return (
          <div
            key={def.name}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : def.name)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm
                text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">{def.label}</span>
                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs
                  ${enabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                >
                  {enabled ? 'enabled' : 'disabled'}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                <SettingsChannelForm
                  def={def}
                  data={data}
                  onChange={(d) => updateChannel(def.name, d)}
                />
                {BRIDGE_CHANNELS.has(def.name) && enabled && (
                  <BridgeChannelStatus channel={def.name} active={isOpen && enabled} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
