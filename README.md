<div align="center">
  <h1>microbot</h1>
  <p><strong>Lightweight AI Assistant for Vietnamese Communities</strong></p>
  <p>
    <img src="https://img.shields.io/badge/python-≥3.11-blue" alt="Python">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
    <img src="https://img.shields.io/badge/lang-vi%20%7C%20en-red" alt="Language">
  </p>
</div>

## What is microbot?

**microbot** is a lightweight personal AI assistant built on top of two open-source projects:

- [**nanobot**](https://github.com/HKUDS/nanobot) by HKUDS — ultra-lightweight agent framework (~4,000 LOC) with multi-channel support
- [**kioku-agent-kit-lite**](https://github.com/phuc-nt/kioku-agent-kit-lite) by phuc-nt — tri-hybrid memory system (BM25 + vector + knowledge graph) in a single SQLite file

We take nanobot's minimal agent architecture and enhance it with kioku's persistent memory system, then add integrations focused on the Vietnamese market.

## Why microbot?

| | nanobot | microbot |
|---|---------|----------|
| Core architecture | ~4,000 LOC | Slightly more, still minimal |
| Memory | Basic session history | Tri-hybrid persistent memory (kioku) |
| Target audience | General / Chinese communities | Vietnamese communities |
| Integrations | WeChat, Feishu, DingTalk... | Zalo, Vietnamese payment, local services |
| Philosophy | Ultra-lightweight | Lightweight + easy to maintain |

## Key Features

- **Multi-channel**: Telegram, Discord, Slack, Web UI, Zalo, and more
- **Multi-provider**: OpenAI, Anthropic, Google, DeepSeek, local models via LiteLLM
- **Persistent memory**: Long-term agent memory powered by kioku's tri-hybrid search
- **MCP support**: Extend capabilities with Model Context Protocol tools
- **Scheduled tasks**: Cron-based automated agent actions
- **Vietnamese-first**: Optimized prompts, integrations, and UX for Vietnamese users

## Quick Start

### Prerequisites

- Python >= 3.11
- Node.js >= 18 (for web UI)

### Installation

```bash
git clone https://github.com/Luvu182/microbot.git
cd microbot

# Install Python dependencies
pip install -e .
```

### Run

```bash
# Start the gateway (API + Web UI)
microbot gateway
```

Open **http://localhost:18790** in your browser to access the Web UI.

### Configuration

All configuration is done via **Web UI** or `~/.microbot/config.json`:

```bash
# Or copy the example config to get started manually
cp config.example.json ~/.microbot/config.json
```

See [`config.example.json`](config.example.json) for all available options.

## Project Structure

```
microbot/
├── nanobot/           # Core agent engine (from nanobot)
│   ├── agent/         # Agent logic & tool execution
│   ├── channels/      # Chat platform integrations
│   ├── providers/     # LLM provider adapters
│   ├── session/       # Conversation & memory management
│   ├── skills/        # Agent skill system
│   └── config/        # Configuration management
├── bridge/            # Node.js bridge for platform APIs
├── web/               # Web UI (Vite + React)
├── tests/             # Test suite
└── docs/              # Documentation
```

## Supported Channels

| Channel | Status |
|---------|--------|
| Web UI | Supported |
| Telegram | Supported |
| Discord | Supported |
| Slack | Supported |
| Feishu / Lark | Supported |
| DingTalk | Supported |
| WhatsApp | Supported |
| Email | Supported |
| QQ | Supported |
| Matrix | Supported |
| Zalo | Planned |

## Supported Providers

Any model supported by [LiteLLM](https://docs.litellm.ai/docs/providers), including:
OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Mistral, Qwen, local models (Ollama), and more.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Credits & Acknowledgments

This project builds upon the work of:

- **[nanobot](https://github.com/HKUDS/nanobot)** by [HKUDS](https://github.com/HKUDS) — The core agent architecture. nanobot proved that a fully-featured AI assistant can be built in ~4,000 lines of code.
- **[kioku-agent-kit-lite](https://github.com/phuc-nt/kioku-agent-kit-lite)** by [phuc-nt](https://github.com/phuc-nt) — The memory system architecture. kioku's tri-hybrid search (BM25 + vector + knowledge graph) provides persistent, intelligent memory with zero external infrastructure.

Both projects are MIT licensed. We are grateful for their contributions to the open-source AI community.

## License

[MIT](LICENSE) — Same as the upstream projects.
