// Cron jobs page — list, add, and delete scheduled jobs
import { useCallback, useEffect, useState } from 'react'
import { createApiClient } from '../lib/api-client'
import type { CronJob, CronAddRequest } from '../types/messages'

interface CronPageProps {
  token?: string
}

function formatNextRun(ms: number | null): string {
  if (!ms) return 'N/A'
  const diff = ms - Date.now()
  if (diff < 0) return 'overdue'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'in <1m'
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `in ${hours}h`
  return `in ${Math.floor(hours / 24)}d`
}

// ---- Add job form ----
interface AddJobFormProps {
  onAdd: (req: CronAddRequest) => Promise<void>
  onCancel: () => void
}

function AddJobForm({ onAdd, onCancel }: AddJobFormProps) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [schedType, setSchedType] = useState<'every' | 'cron' | 'at'>('every')
  const [schedValue, setSchedValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    if (!name.trim() || !message.trim() || !schedValue.trim()) {
      setError('All fields are required')
      return
    }
    setSubmitting(true)
    try {
      await onAdd({
        name: name.trim(),
        message: message.trim(),
        schedule: { type: schedType, value: schedValue.trim() },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add job')
    } finally {
      setSubmitting(false)
    }
  }

  const placeholder = schedType === 'every'
    ? 'e.g. 30m, 1h, 2h30m'
    : schedType === 'cron'
    ? 'e.g. 0 9 * * 1-5'
    : 'e.g. 2024-12-01T09:00:00'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add Job</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Job name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-job"
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
              px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Schedule type</label>
          <select
            value={schedType}
            onChange={(e) => setSchedType(e.target.value as 'every' | 'cron' | 'at')}
            className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
              px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="every">Every (interval)</option>
            <option value="cron">Cron expression</option>
            <option value="at">At (datetime)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Schedule value</label>
        <input
          value={schedValue}
          onChange={(e) => setSchedValue(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
            px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="What should the agent do?"
          className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
            px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
            text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
            transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-sm px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600
            disabled:opacity-50 text-white font-medium transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {submitting ? 'Adding…' : 'Add Job'}
        </button>
      </div>
    </div>
  )
}

// ---- Main page ----
export function CronPage({ token }: CronPageProps) {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const api = createApiClient(token)
      const res = await api.getCronJobs()
      setJobs(res.jobs)
    } catch {
      setError('Failed to load cron jobs')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleAdd(req: CronAddRequest) {
    const api = createApiClient(token)
    await api.addCronJob(req)
    setShowForm(false)
    await load()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const api = createApiClient(token)
      await api.deleteCronJob(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch {
      setError('Failed to delete job')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cron Jobs</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600
              text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            + Add Job
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <AddJobForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          Loading jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
          No cron jobs configured
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Schedule</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Next Run</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{job.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {job.schedule.type}
                    {job.schedule.value ? `: ${job.schedule.value}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                      ${job.enabled
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {formatNextRun(job.state.next_run_at_ms)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deletingId === job.id}
                      className="text-xs text-red-500 hover:text-red-600 dark:text-red-400
                        disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
                    >
                      {deletingId === job.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
