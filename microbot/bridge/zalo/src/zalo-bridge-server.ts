/**
 * WebSocket bridge server for Zalo <-> Python communication.
 * Binds to 127.0.0.1 only; optional token auth.
 * Enhanced with request/response pattern for agent tool calls.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { ZaloClient, type InboundMessage } from './zalo-client.js';
import {
  handleCommand,
  type BridgeCommand,
  type BridgeResponse,
} from './command-handler.js';

interface BridgeMessage {
  type: string;
  [key: string]: unknown;
}

export class ZaloBridgeServer {
  private wss: WebSocketServer | null = null;
  private zalo: ZaloClient | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(
    private port: number,
    private credentialsPath: string,
    private token?: string,
  ) {}

  async start(): Promise<void> {
    this.wss = new WebSocketServer({ host: '127.0.0.1', port: this.port });
    console.log(`Bridge listening on ws://127.0.0.1:${this.port}`);
    if (this.token) console.log('Token authentication enabled');

    this.zalo = new ZaloClient({
      credentialsPath: this.credentialsPath,
      onMessage: (msg) => this.broadcast({ type: 'message', ...msg }),
      onQR: (qr) => this.broadcast({ type: 'qr', qr }),
      onStatus: (status) => this.broadcast({ type: 'status', status }),
    });

    this.wss.on('connection', (ws) => {
      if (this.token) {
        const timeout = setTimeout(() => ws.close(4001, 'Auth timeout'), 5000);
        ws.once('message', (data) => {
          clearTimeout(timeout);
          try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'auth' && msg.token === this.token) {
              console.log('Python client authenticated');
              this.setupClient(ws);
            } else {
              ws.close(4003, 'Invalid token');
            }
          } catch {
            ws.close(4003, 'Invalid auth message');
          }
        });
      } else {
        console.log('Python client connected');
        this.setupClient(ws);
      }
    });

    await this.zalo.connect();
  }

  private setupClient(ws: WebSocket): void {
    this.clients.add(ws);

    ws.on('message', async (data) => {
      try {
        const cmd = JSON.parse(data.toString()) as BridgeCommand;
        const response = await handleCommand(this.zalo!.api, cmd);
        ws.send(JSON.stringify(response));
      } catch (error) {
        const msg: BridgeResponse = {
          type: 'error',
          command: 'unknown',
          error: error instanceof Error ? error.message : String(error),
        };
        ws.send(JSON.stringify(msg));
      }
    });

    ws.on('close', () => {
      console.log('Python client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      this.clients.delete(ws);
    });
  }

  private broadcast(msg: BridgeMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  async stop(): Promise<void> {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.zalo) {
      await this.zalo.disconnect();
      this.zalo = null;
    }
  }
}
