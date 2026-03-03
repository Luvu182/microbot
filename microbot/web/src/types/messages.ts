// TypeScript types matching microbot backend WebSocket protocol

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

/** Incremental token chunk during streaming */
export interface WsStreamChunkFrame {
  type: 'stream_chunk'
  content: string
}

export type WsServerFrame =
  | WsAuthOkFrame
  | WsProgressFrame
  | WsToolHintFrame
  | WsResponseFrame
  | WsErrorFrame
  | WsQueuedFrame
  | WsStreamChunkFrame

// ---- Chat message (UI state) ----
export type MessageRole = 'user' | 'assistant' | 'error'

/** Tool call result shown as collapsed terminal block */
export interface ToolResult {
  name: string
  /** Last N lines of output */
  output: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  /** ISO timestamp */
  timestamp: string
  /** True while tokens are still arriving (streaming in progress) */
  streaming?: boolean
  /** Model reasoning/thinking content (Kimi, DeepSeek-R1, etc.) */
  reasoning?: string
  /** Tool call results from this assistant turn */
  toolResults?: ToolResult[]
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
  messages: Array<{
    role: string
    content: string
    timestamp?: string
    reasoning_content?: string
    name?: string // tool name (for role=tool messages)
    tool_call_id?: string
    tool_calls?: Array<{ function: { name: string; arguments: string } }>
  }>
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

/** Streaming message ID constant — always the same ID so chunks update one message */
export const STREAMING_MSG_ID = 'streaming-assistant'
