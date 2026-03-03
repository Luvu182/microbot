/**
 * Zalo client wrapper using zca-js.
 * Handles QR login, message listener, and reconnection.
 * Reference: openzca client.ts (login patterns), cli.ts line 4784 (listener)
 */

import {
  Zalo,
  ThreadType,
  LoginQRCallbackEventType,
  type API,
  type Credentials,
} from 'zca-js';
import { imageSize } from 'image-size';
import { readFile } from 'fs/promises';
import * as qrcodeTerminal from 'qrcode-terminal';
import { loadCredentials, saveCredentials } from './credential-store.js';

export interface InboundMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isGroup: boolean;
  threadId: string;
  msgType: string;
  senderName?: string;
}

export interface ZaloClientOptions {
  credentialsPath: string;
  onMessage: (msg: InboundMessage) => void;
  onQR: (qr: string) => void;
  onStatus: (status: string) => void;
}

/** Image metadata getter required by zca-js (openzca client.ts line 148-165) */
async function imageMetadataGetter(filePath: string) {
  const data = await readFile(filePath);
  const info = imageSize(data);
  if (!info.width || !info.height) {
    throw new Error(`Cannot read image size: ${filePath}`);
  }
  return { width: info.width, height: info.height, size: data.length };
}

export class ZaloClient {
  private _api: API | null = null;
  private options: ZaloClientOptions;
  private reconnecting = false;

  constructor(options: ZaloClientOptions) {
    this.options = options;
  }

  /** Expose API for command handlers */
  get api(): API {
    if (!this._api) throw new Error('Not connected to Zalo');
    return this._api;
  }

  get isConnected(): boolean {
    return this._api !== null;
  }

  async connect(): Promise<void> {
    const zalo = new Zalo({ imageMetadataGetter, logging: false });

    // Try stored credentials first (openzca client.ts line 185-197)
    const creds = await loadCredentials(this.options.credentialsPath);
    if (creds) {
      console.log('Logging in with stored credentials...');
      try {
        this._api = await zalo.login(creds);
      } catch {
        console.warn('Stored credentials failed, falling back to QR login');
        this._api = await this.loginWithQR(zalo);
      }
    } else {
      this._api = await this.loginWithQR(zalo);
    }

    this.setupListeners();
  }

  /** QR login following openzca client.ts line 214-314 */
  private async loginWithQR(zalo: Zalo): Promise<API> {
    let captured: Credentials | null = null;

    const api = await zalo.loginQR({ qrPath: undefined }, async (event) => {
      switch (event.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
          console.log('\nScan QR code with Zalo app:\n');
          qrcodeTerminal.generate(event.data.code, { small: true });
          this.options.onQR(event.data.code);
          break;
        case LoginQRCallbackEventType.QRCodeScanned:
          console.log(`Scanned by: ${event.data.display_name}`);
          break;
        case LoginQRCallbackEventType.QRCodeDeclined:
          console.log('QR login declined.');
          break;
        case LoginQRCallbackEventType.QRCodeExpired:
          console.log('QR expired. Retrying...');
          break;
        case LoginQRCallbackEventType.GotLoginInfo:
          captured = {
            imei: event.data.imei,
            cookie: event.data.cookie,
            userAgent: event.data.userAgent,
          };
          break;
      }
    });

    // Fallback credential extraction (openzca client.ts line 291-304)
    if (!captured) {
      const ctx = api.getContext();
      const cookieJar = api.getCookie();
      captured = {
        imei: ctx.imei,
        cookie: cookieJar?.toJSON()?.cookies ?? [],
        userAgent: ctx.userAgent,
        language: ctx.language,
      };
    }

    await saveCredentials(this.options.credentialsPath, captured);
    return api;
  }

  /** Setup message and lifecycle listeners (openzca cli.ts line 4767-4784) */
  private setupListeners(): void {
    if (!this._api) return;
    const api = this._api;

    api.listener.on('message', (message: any) => {
      if (message.isSelf) return;
      const data = message.data || {};
      const rawContent = data.content;
      const content =
        typeof rawContent === 'string'
          ? rawContent
          : rawContent
            ? JSON.stringify(rawContent)
            : '';
      if (!content) return;

      this.options.onMessage({
        id: data.msgId || String(Date.now()),
        sender: String(data.uidFrom || message.threadId),
        content,
        timestamp: data.ts || Math.floor(Date.now() / 1000),
        isGroup: message.type === ThreadType.Group,
        threadId: String(message.threadId),
        msgType: data.msgType || '',
        senderName: data.dName || undefined,
      });
    });

    api.listener.on('connected', () => {
      console.log('Connected to Zalo websocket');
      this.options.onStatus('connected');
    });

    api.listener.on('closed', () => {
      console.log('Disconnected from Zalo');
      this.options.onStatus('disconnected');
      this.handleReconnect();
    });

    api.listener.on('error', (err: unknown) => {
      console.error(
        'Listener error:',
        err instanceof Error ? err.message : String(err),
      );
    });

    api.listener.start({ retryOnClose: true });
    console.log('Zalo listener started');
  }

  private handleReconnect(): void {
    if (this.reconnecting) return;
    this.reconnecting = true;
    console.log('Reconnecting in 5 seconds...');
    setTimeout(() => {
      this.reconnecting = false;
      this.connect().catch((err) => {
        console.error('Reconnection failed:', err);
      });
    }, 5000);
  }

  async disconnect(): Promise<void> {
    if (this._api?.listener) {
      this._api.listener.stop();
    }
    this._api = null;
  }
}
