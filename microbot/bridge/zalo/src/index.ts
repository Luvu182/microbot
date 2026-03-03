#!/usr/bin/env node
/**
 * microbot Zalo Bridge — entry point.
 *
 * Connects Zalo to microbot's Python backend via WebSocket.
 *
 * Usage:
 *   npm run build && npm start
 *
 * Environment variables:
 *   BRIDGE_PORT   — WebSocket port (default: 3002)
 *   CREDS_PATH    — Credentials file path (default: ~/.microbot/zalo-creds.json)
 *   BRIDGE_TOKEN  — Optional auth token for Python client
 */

import { ZaloBridgeServer } from './zalo-bridge-server.js';
import { homedir } from 'os';
import { join } from 'path';

const PORT = parseInt(process.env.BRIDGE_PORT || '3002', 10);
const CREDS_PATH =
  process.env.CREDS_PATH || join(homedir(), '.microbot', 'zalo-creds.json');
const TOKEN = process.env.BRIDGE_TOKEN || undefined;

console.log('microbot Zalo Bridge');
console.log('====================\n');

const server = new ZaloBridgeServer(PORT, CREDS_PATH, TOKEN);

const shutdown = async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.start().catch((err) => {
  console.error('Failed to start bridge:', err);
  process.exit(1);
});
