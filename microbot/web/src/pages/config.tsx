// Config page — JSON editor for nanobot config, load from GET /api/config, save via PUT /api/config
import { useEffect, useState } from 'react'
import { createApiClient } from '../lib/api-client'

interface ConfigPageProps {
  token?: string
}

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

export function ConfigPage({ token }: ConfigPageProps) {
  const [text, setText] = useState('')
  const [original, setOriginal] = useState('')
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
        const pretty = JSON.stringify(res.config, null, 2)
        setText(pretty)
        setOriginal(pretty)
      })
      .catch(() => { if (alive) setError('Failed to load config') })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [token])

  async function handleSave() {
    setError('')
    setSuccess(false)

    if (!isValidJson(text)) {
      setError('Invalid JSON — fix syntax errors before saving')
      return
    }

    const parsed = JSON.parse(text) as Record<string, unknown>
    setSaving(true)
    try {
      const api = createApiClient(token)
      await api.putConfig(parsed)
      setOriginal(text)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setText(original)
    setError('')
    setSuccess(false)
  }

  const isDirty = text !== original
  const jsonValid = isValidJson(text)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Config</h1>
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
            disabled={saving || !isDirty || !jsonValid}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600
              disabled:opacity-50 disabled:cursor-not-allowed
              text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Masked values warning */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg
        bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Fields shown as <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">***</code> are masked secrets.
          They will not be overwritten when you save — edit them directly in the config file on disk.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
          Config saved successfully
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          Loading config…
        </div>
      ) : (
        <div className="relative">
          {/* JSON validity indicator */}
          {!jsonValid && text && (
            <div className="absolute top-2 right-2 z-10 text-xs text-red-500 dark:text-red-400
              bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
              Invalid JSON
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setSuccess(false) }}
            spellCheck={false}
            className="w-full h-[60vh] font-mono text-xs rounded-xl border
              border-gray-200 dark:border-gray-700
              bg-gray-50 dark:bg-gray-900
              text-gray-800 dark:text-gray-200
              p-4 resize-y
              focus:outline-none focus:ring-2 focus:ring-blue-400
              leading-relaxed"
            aria-label="Config JSON editor"
          />
        </div>
      )}
    </div>
  )
}
