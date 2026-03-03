// Channel field definitions for the settings channels tab — static config per channel
import type { ChannelDef } from '../../types/settings'

export const CHANNEL_DEFS: ChannelDef[] = [
  {
    name: 'telegram',
    label: 'Telegram',
    fields: [
      { key: 'token', label: 'Bot Token', type: 'secret', placeholder: '123456:ABC-DEF...' },
      { key: 'proxy', label: 'Proxy URL', type: 'text', placeholder: 'http://127.0.0.1:7890' },
      { key: 'replyToMessage', label: 'Reply to Message', type: 'boolean' },
    ],
  },
  {
    name: 'discord',
    label: 'Discord',
    fields: [
      { key: 'token', label: 'Bot Token', type: 'secret', placeholder: 'Bot token from Developer Portal' },
      { key: 'gatewayUrl', label: 'Gateway URL', type: 'text', placeholder: 'wss://gateway.discord.gg/...' },
      { key: 'intents', label: 'Gateway Intents', type: 'number' },
    ],
  },
  {
    name: 'slack',
    label: 'Slack',
    fields: [
      { key: 'botToken', label: 'Bot Token (xoxb-)', type: 'secret', placeholder: 'xoxb-...' },
      { key: 'appToken', label: 'App Token (xapp-)', type: 'secret', placeholder: 'xapp-...' },
      { key: 'replyInThread', label: 'Reply in Thread', type: 'boolean' },
      { key: 'reactEmoji', label: 'React Emoji', type: 'text', placeholder: 'eyes' },
      {
        key: 'groupPolicy', label: 'Group Policy', type: 'select',
        options: [
          { value: 'mention', label: 'Mention only' },
          { value: 'open', label: 'Open' },
          { value: 'allowlist', label: 'Allowlist' },
        ],
      },
    ],
  },
  {
    name: 'whatsapp',
    label: 'WhatsApp',
    fields: [
      { key: 'bridgeUrl', label: 'Bridge URL', type: 'text', placeholder: 'ws://localhost:3001' },
      { key: 'bridgeToken', label: 'Bridge Token', type: 'secret' },
    ],
  },
  {
    name: 'feishu',
    label: 'Feishu / Lark',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'appSecret', label: 'App Secret', type: 'secret' },
      { key: 'encryptKey', label: 'Encrypt Key', type: 'secret' },
      { key: 'verificationToken', label: 'Verification Token', type: 'secret' },
      { key: 'reactEmoji', label: 'React Emoji', type: 'text', placeholder: 'THUMBSUP' },
    ],
  },
  {
    name: 'dingtalk',
    label: 'DingTalk',
    fields: [
      { key: 'clientId', label: 'Client ID (AppKey)', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'secret' },
    ],
  },
  {
    name: 'email',
    label: 'Email (IMAP/SMTP)',
    fields: [
      { key: 'consentGranted', label: 'Consent Granted', type: 'boolean' },
      { key: 'imapHost', label: 'IMAP Host', type: 'text', placeholder: 'imap.gmail.com' },
      { key: 'imapPort', label: 'IMAP Port', type: 'number' },
      { key: 'imapUsername', label: 'IMAP Username', type: 'text' },
      { key: 'imapPassword', label: 'IMAP Password', type: 'secret' },
      { key: 'imapUseSsl', label: 'IMAP Use SSL', type: 'boolean' },
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'smtpPort', label: 'SMTP Port', type: 'number' },
      { key: 'smtpUsername', label: 'SMTP Username', type: 'text' },
      { key: 'smtpPassword', label: 'SMTP Password', type: 'secret' },
      { key: 'smtpUseTls', label: 'SMTP Use TLS', type: 'boolean' },
      { key: 'fromAddress', label: 'From Address', type: 'text', placeholder: 'bot@example.com' },
      { key: 'autoReplyEnabled', label: 'Auto Reply', type: 'boolean' },
      { key: 'pollIntervalSeconds', label: 'Poll Interval (seconds)', type: 'number' },
    ],
  },
  {
    name: 'qq',
    label: 'QQ',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text' },
      { key: 'secret', label: 'App Secret', type: 'secret' },
    ],
  },
  {
    name: 'matrix',
    label: 'Matrix',
    fields: [
      { key: 'homeserver', label: 'Homeserver URL', type: 'text', placeholder: 'https://matrix.org' },
      { key: 'accessToken', label: 'Access Token', type: 'secret' },
      { key: 'userId', label: 'User ID', type: 'text', placeholder: '@bot:matrix.org' },
      { key: 'deviceId', label: 'Device ID', type: 'text' },
      { key: 'e2eeEnabled', label: 'End-to-End Encryption', type: 'boolean' },
      {
        key: 'groupPolicy', label: 'Group Policy', type: 'select',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'mention', label: 'Mention only' },
          { value: 'allowlist', label: 'Allowlist' },
        ],
      },
    ],
  },
  {
    name: 'mochat',
    label: 'Mochat',
    fields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://mochat.io' },
      { key: 'clawToken', label: 'Claw Token', type: 'secret' },
      { key: 'agentUserId', label: 'Agent User ID', type: 'text' },
    ],
  },
]
