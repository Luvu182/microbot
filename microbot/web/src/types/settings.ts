// Types for settings form state — matches backend config schema (camelCase aliases)

export interface ProviderFormData {
  apiKey: string
  apiBase: string | null
  extraHeaders: Record<string, string> | null
}

export interface ProvidersFormData {
  custom: ProviderFormData
  anthropic: ProviderFormData
  openai: ProviderFormData
  openrouter: ProviderFormData
  deepseek: ProviderFormData
  groq: ProviderFormData
  zhipu: ProviderFormData
  dashscope: ProviderFormData
  vllm: ProviderFormData
  gemini: ProviderFormData
  moonshot: ProviderFormData
  minimax: ProviderFormData
  aihubmix: ProviderFormData
  siliconflow: ProviderFormData
  volcengine: ProviderFormData
  openaiCodex: ProviderFormData
  githubCopilot: ProviderFormData
}

export interface AgentDefaultsFormData {
  workspace: string
  model: string
  provider: string
  maxTokens: number
  temperature: number
  maxToolIterations: number
  memoryWindow: number
  reasoningEffort: string | null
}

export interface WebConfigFormData {
  enabled: boolean
  token: string
  corsOrigins: string[]
  allowFrom: string[]
}

export interface GatewayFormData {
  host: string
  port: number
  web: WebConfigFormData
}

// Sentinel for masked secrets
export const MASKED_VALUE = '***'

export function isMasked(value: string): boolean {
  return value === MASKED_VALUE
}

// Provider display names for the UI
export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  custom: 'Custom (OpenAI-compatible)',
  zhipu: 'Zhipu AI',
  dashscope: 'Dashscope (Alibaba)',
  vllm: 'vLLM',
  moonshot: 'Moonshot',
  minimax: 'MiniMax',
  aihubmix: 'AiHubMix',
  siliconflow: 'SiliconFlow',
  volcengine: 'VolcEngine',
  openaiCodex: 'OpenAI Codex',
  githubCopilot: 'GitHub Copilot',
}

// Channel credential field definition
export interface ChannelFieldDef {
  key: string
  label: string
  type: 'text' | 'secret' | 'number' | 'boolean' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

export interface ChannelDef {
  name: string
  label: string
  fields: ChannelFieldDef[]
}
