// Settings page — tabbed config editor, loads from GET /api/config, saves via PUT /api/config
import { useEffect, useState } from 'react'
import { createApiClient } from '../lib/api-client'
import { SettingsTabBar, type SettingsTab } from '../components/settings/settings-tab-bar'
import { ProvidersTab } from '../components/settings/settings-providers-tab'
import { ChannelsTab } from '../components/settings/settings-channels-tab'
import { AgentTab } from '../components/settings/settings-agent-tab'
import { GatewayTab } from '../components/settings/settings-gateway-tab'
import { AdvancedTab } from '../components/settings/settings-advanced-tab'

interface SettingsPageProps {
  token?: string
}

export function SettingsPage({ token }: SettingsPageProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [original, setOriginal] = useState<Record<string, unknown>>({})
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let alive = true
    const api = createApiClient(token)
    api.getConfig()
      .then((res) => {
        if (!alive) return
        setConfig(res.config)
        setOriginal(res.config)
      })
      .catch(() => { if (alive) setError('Failed to load config') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [token])

  const isDirty = JSON.stringify(config) !== JSON.stringify(original)

  function updateSection(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSuccess(false)
  }

  async function handleSave() {
    setError(''); setSuccess(false); setSaving(true)
    try {
      const api = createApiClient(token)
      await api.putConfig(config)
      setOriginal(config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setConfig(original)
    setError(''); setSuccess(false)
  }

  function renderTab() {
    switch (activeTab) {
      case 'providers':
        return (
          <ProvidersTab
            providers={(config.providers ?? {}) as Record<string, Record<string, unknown>>}
            onChange={(v) => updateSection('providers', v)}
          />
        )
      case 'channels':
        return (
          <ChannelsTab
            channels={(config.channels ?? {}) as Record<string, unknown>}
            onChange={(v) => updateSection('channels', v)}
          />
        )
      case 'agent':
        return (
          <AgentTab
            agents={(config.agents ?? {}) as Record<string, unknown>}
            onChange={(v) => updateSection('agents', v)}
          />
        )
      case 'gateway':
        return (
          <GatewayTab
            gateway={(config.gateway ?? {}) as Record<string, unknown>}
            onChange={(v) => updateSection('gateway', v)}
          />
        )
      case 'advanced':
        return <AdvancedTab config={config} onChange={(c) => setConfig(c)} />
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600
              disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium
              transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
          Settings saved successfully
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Loading settings…</div>
      ) : (
        <>
          <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />
          {renderTab()}
        </>
      )}
    </div>
  )
}
