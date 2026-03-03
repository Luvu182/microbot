// REST API client for nanobot backend
// All endpoints: /api/*

import type {
  ApiStatus,
  ApiSessionsResponse,
  ApiSessionDetail,
  ApiChannelsResponse,
  ConfigResponse,
  CronJobsResponse,
  CronJob,
  CronAddRequest,
} from '../types/messages'

function makeApiError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number }
  err.name = 'ApiError'
  err.status = status
  return err
}

async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  }

  const res = await fetch(path, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw makeApiError(res.status, text)
  }
  return res.json() as Promise<T>
}

export function createApiClient(token?: string) {
  const get = <T>(path: string) => apiFetch<T>(path, token)
  const del = <T>(path: string) => apiFetch<T>(path, token, { method: 'DELETE' })
  const put = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, token, { method: 'PUT', body: JSON.stringify(body) })
  const post = <T>(path: string, body: unknown) =>
    apiFetch<T>(path, token, { method: 'POST', body: JSON.stringify(body) })

  return {
    getStatus(): Promise<ApiStatus> {
      return get<ApiStatus>('/api/status')
    },

    getSessions(): Promise<ApiSessionsResponse> {
      return get<ApiSessionsResponse>('/api/sessions')
    },

    getSession(key: string): Promise<ApiSessionDetail> {
      return get<ApiSessionDetail>(`/api/sessions/${encodeURIComponent(key)}`)
    },

    deleteSession(key: string): Promise<{ deleted: string }> {
      return del<{ deleted: string }>(`/api/sessions/${encodeURIComponent(key)}`)
    },

    getChannels(): Promise<ApiChannelsResponse> {
      return get<ApiChannelsResponse>('/api/channels')
    },

    getConfig(): Promise<ConfigResponse> {
      return get<ConfigResponse>('/api/config')
    },

    putConfig(config: Record<string, unknown>): Promise<{ saved: boolean }> {
      return put<{ saved: boolean }>('/api/config', config)
    },

    getCronJobs(): Promise<CronJobsResponse> {
      return get<CronJobsResponse>('/api/cron')
    },

    addCronJob(job: CronAddRequest): Promise<{ job: CronJob }> {
      return post<{ job: CronJob }>('/api/cron', job)
    },

    deleteCronJob(id: string): Promise<{ deleted: string }> {
      return del<{ deleted: string }>(`/api/cron/${encodeURIComponent(id)}`)
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
