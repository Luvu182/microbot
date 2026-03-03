// WebSocket protocol handler for microbot backend
// Handles connection lifecycle, JSON frame parsing, and auto-reconnect

import type { WsClientFrame, WsServerFrame } from '../types/messages'

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface WsClientOptions {
  sessionKey: string
  token?: string
  onFrame: (frame: WsServerFrame) => void
  onStatusChange: (status: WsStatus) => void
  onConnect?: () => void
}

const BACKOFF_BASE_MS = 500
const BACKOFF_MAX_MS = 16000
const MAX_RECONNECT_ATTEMPTS = 10

export class WsClient {
  private ws: WebSocket | null = null
  private opts: WsClientOptions
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  constructor(opts: WsClientOptions) {
    this.opts = opts
  }

  connect(): void {
    if (this.destroyed) return
    this.clearReconnectTimer()

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const { sessionKey, token } = this.opts
    const query = token ? `?token=${encodeURIComponent(token)}` : ''
    const url = `${proto}://${host}/ws/chat/${sessionKey}${query}`

    this.opts.onStatusChange(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.opts.onStatusChange('connected')
      this.opts.onConnect?.()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const frame = JSON.parse(event.data as string) as WsServerFrame
        this.opts.onFrame(frame)
      } catch {
        // Malformed frame — ignore
      }
    }

    this.ws.onclose = () => {
      this.ws = null
      if (!this.destroyed) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // onerror always followed by onclose — let onclose drive reconnect
      this.ws?.close()
    }
  }

  send(frame: WsClientFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame))
    }
  }

  destroy(): void {
    this.destroyed = true
    this.clearReconnectTimer()
    this.ws?.close()
    this.ws = null
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.opts.onStatusChange('disconnected')
      return
    }
    const delay = Math.min(BACKOFF_BASE_MS * 2 ** this.reconnectAttempts, BACKOFF_MAX_MS)
    this.reconnectAttempts++
    this.opts.onStatusChange('reconnecting')
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
