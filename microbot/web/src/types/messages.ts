// TypeScript types matching nanobot backend WebSocket protocol

// ---- WebSocket frames: client → server ----
export interface WsAuthFrame {
  type: 'auth'
  token: string
}

export interface WsMessageFrame {
  type: 'message'
  content: string
}

export interface WsStopFrame {
  type: 'stop'
}

export interface WsNewSessionFrame {
  type: 'new_session'
}

export type WsClientFrame = WsAuthFrame | WsMessageFrame | WsStopFrame | WsNewSessionFrame

// ---- WebSocket frames: server → client ----
export interface WsAuthOkFrame {
  type: 'auth_ok'
}

export interface WsProgressFrame {
  type: 'progress'
  content: string
}

export interface WsToolHintFrame {
  type: 'tool_hint'
  content: string
}

export interface WsResponseFrame {
  type: 'response'
  content: string
}

export interface WsErrorFrame {
  type: 'error'
  content: string
}

export interface WsQueuedFrame {
  type: 'queued'
}

export type WsServerFrame =
  | WsAuthOkFrame
  | WsProgressFrame
  | WsToolHintFrame
  | WsResponseFrame
  | WsErrorFrame
  | WsQueuedFrame

// ---- Chat message (UI state) ----
export type MessageRole = 'user' | 'assistant' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  /** ISO timestamp */
  timestamp: string
}

// ---- REST API response types ----
export interface ApiSession {
  key: string
  created_at: string
  updated_at: string
}

export interface ApiSessionsResponse {
  sessions: ApiSession[]
}

export interface ApiSessionDetail {
  key: string
  created_at: string
  updated_at: string
  messages: Array<{ role: string; content: string }>
}

export interface ApiStatus {
  status: string
  version: string
}

export interface ApiChannel {
  name: string
  enabled: boolean
  status: string
}

export interface ApiChannelsResponse {
  channels: ApiChannel[]
}

// ---- Cron job types ----
export interface CronSchedule {
  type: string
  value?: string
}

export interface CronPayload {
  message: string
  deliver?: boolean
  to?: string
  channel?: string
}

export interface CronJobState {
  next_run_at_ms: number | null
}

export interface CronJob {
  id: string
  name: string
  enabled: boolean
  schedule: CronSchedule
  payload: CronPayload
  state: CronJobState
}

export interface CronJobsResponse {
  jobs: CronJob[]
}

export interface CronAddRequest {
  name: string
  message: string
  schedule: CronSchedule
  deliver?: boolean
  to?: string
  channel?: string
}

// ---- Config types ----
export interface ConfigResponse {
  config: Record<string, unknown>
}

// ---- Agent activity (live during agent processing) ----
export interface AgentActivity {
  type: 'progress' | 'tool_hint'
  content: string
}
