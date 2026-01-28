# ⟡ MirrorDNA MCP Server

<div align="center">

**Model Context Protocol Bridge for Sovereign AI Memory**

[![npm version](https://img.shields.io/npm/v/@mirrordna/mcp-server?color=cb3837&logo=npm)](https://www.npmjs.com/package/@mirrordna/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node 18+](https://img.shields.io/badge/Node-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MirrorDNA](https://img.shields.io/badge/MirrorDNA-Protocol-10b981)](https://github.com/MirrorDNA-Reflection-Protocol/MirrorDNA)
[![N1 Intelligence](https://img.shields.io/badge/N1-Intelligence-6366f1)](https://n1intelligence.com)

*Connect Claude Desktop, Cursor, or any MCP client to your sovereign memory.*

[Documentation](https://mirrordna-reflection-protocol.github.io/MirrorDNA-Docs/) · [Active Mirror](https://activemirror.ai) · [MCP Spec](https://modelcontextprotocol.io)

</div>

---

## What is This?

This MCP server bridges **any MCP-compatible client** (Claude Desktop, Cursor, etc.) to the **MirrorDNA Memory Bus** — giving AI assistants access to your sovereign memory layer without sending data to cloud providers.

```
┌─────────────────┐     MCP Protocol     ┌──────────────────┐
│  Claude Desktop │ ◄──────────────────► │  mirrordna-mcp   │
│  / Cursor / *   │                      │     server       │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │   Memory Bus     │
                                         │  (~/.mirrordna/) │
                                         └──────────────────┘
```

## Why Use This?

| Without MirrorDNA MCP | With MirrorDNA MCP |
|----------------------|-------------------|
| Claude forgets between sessions | Claude has persistent memory |
| No handoff between clients | Seamless context transfer |
| You re-explain everything | AI picks up where you left off |
| State is ephemeral | State is sovereign and auditable |

## Quick Start

### 1. Install

```bash
# Clone
git clone https://github.com/MirrorDNA-Reflection-Protocol/mirrordna-mcp.git
cd mirrordna-mcp

# Install dependencies
npm install

# Or install globally
npm install -g @mirrordna/mcp-server
```

### 2. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mirrordna": {
      "command": "node",
      "args": ["/path/to/mirrordna-mcp/src/mcp-server.js"],
      "env": {
        "MIRRORDNA_BUS_PATH": "~/.mirrordna/bus"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Claude now has access to your memory bus.

## Available Tools

| Tool | Description | Example Use |
|------|-------------|-------------|
| `mirrordna_sync` | Read current bus state | "What's the current project phase?" |
| `mirrordna_pickup` | Claim pending work items | "What tasks are waiting for me?" |
| `mirrordna_complete` | Mark work as done | "Mark the auth feature complete" |
| `mirrordna_handoff` | Write handoff for next client | "Prepare handoff for tomorrow" |
| `mirrordna_health` | Check system health | "Is the memory bus healthy?" |
| `mirrordna_write` | Write state updates | "Update phase to 'testing'" |
| `mirrordna_history` | Read provenance chain | "Who made changes today?" |
| `mirrorgate_status` | Get governance state | "What are my current constraints?" |
| `mirrorgate_check` | Validate against rules | "Can I execute this action?" |
| `mirrorgate_scan` | Scan for violations | "Check this response for assumptions" |
| `mirrorgate_refresh_presence` | Update presence state | "I'm now at home, high bandwidth" |

## Architecture

```
mirrordna-mcp/
├── src/
│   ├── mcp-server.js      # Main MCP server entry
│   ├── tools/             # Tool implementations
│   │   ├── sync.js
│   │   ├── pickup.js
│   │   ├── complete.js
│   │   ├── handoff.js
│   │   ├── health.js
│   │   └── mirrorgate.js
│   └── lib/
│       ├── bus.js         # Memory bus client
│       └── gate.js        # MirrorGate client
├── package.json
└── README.md
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MIRRORDNA_BUS_PATH` | `~/.mirrordna/bus` | Memory bus directory |
| `MIRRORDNA_GATE_PATH` | `~/.mirrordna/gate` | MirrorGate config directory |
| `MIRRORDNA_LOG_LEVEL` | `info` | Logging verbosity |
| `MIRRORDNA_TIMEOUT` | `30000` | Tool timeout in ms |

## Example Workflows

### Morning Pickup

```
You: "What should I focus on today?"
Claude: [Uses mirrordna_sync + mirrordna_pickup]
        "Based on your bus state, you have 3 pending items:
         1. Complete auth feature (high priority)
         2. Review PR #42
         3. Update docs for v2 release"
```

### End of Day Handoff

```
You: "I'm done for today. Prepare handoff."
Claude: [Uses mirrordna_handoff]
        "Handoff written. Tomorrow's Claude will know:
         - Auth feature 80% complete (blocked on OAuth config)
         - PR #42 approved, ready to merge
         - You're feeling good about the v2 progress"
```

### Context Switching

```
You: "I'm heading to the beach, low bandwidth"
Claude: [Uses mirrorgate_refresh_presence]
        "Presence updated. I'll keep responses short and
         avoid code-heavy suggestions until you're back."
```

## MirrorDNA Ecosystem

This server is part of the MirrorDNA stack:

| Layer | Component | Role |
|-------|-----------|------|
| **Protocol** | [MirrorDNA](https://github.com/MirrorDNA-Reflection-Protocol/MirrorDNA) | Core specification |
| **Protocol** | [SCD-Protocol](https://github.com/MirrorDNA-Reflection-Protocol/SCD-Protocol) | Memory encoding |
| **Runtime** | [MirrorBrain](https://github.com/MirrorDNA-Reflection-Protocol/MirrorBrain) | Execution environment |
| **Runtime** | [MirrorGate](https://github.com/MirrorDNA-Reflection-Protocol/MirrorGate) | Governance enforcement |
| **Integration** | **mirrordna-mcp** ← you are here | MCP bridge |
| **Identity** | [AMI](https://github.com/MirrorDNA-Reflection-Protocol/active-mirror-identity) | Portable AI identity |
| **Product** | [ActiveMirrorOS](https://github.com/MirrorDNA-Reflection-Protocol/ActiveMirrorOS) | Consumer interface |

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## Troubleshooting

### "Bus path not found"

```bash
# Create the bus directory
mkdir -p ~/.mirrordna/bus/canonical
echo '{"version": 1, "state": {}}' > ~/.mirrordna/bus/state.json
```

### "Permission denied"

```bash
# Fix permissions
chmod 755 ~/.mirrordna
chmod 644 ~/.mirrordna/bus/state.json
```

### "Tools not appearing in Claude"

1. Check Claude Desktop config path is correct
2. Restart Claude Desktop completely (Cmd+Q, reopen)
3. Check logs: `tail -f ~/Library/Logs/Claude/mcp.log`

## Research

- **Structured Contextual Distillation** — DOI: [10.5281/zenodo.17787619](https://doi.org/10.5281/zenodo.17787619)
- **Model Context Protocol** — [modelcontextprotocol.io](https://modelcontextprotocol.io)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © [N1 Intelligence](https://n1intelligence.com)

---

<div align="center">

**Created by [Paul Desai](https://pauldesai.me)**

*Sovereign AI infrastructure for everyone.*

[![Twitter](https://img.shields.io/badge/Twitter-@pdesai878-1DA1F2?logo=twitter&logoColor=white)](https://twitter.com/pdesai878)
[![GitHub](https://img.shields.io/badge/GitHub-pdesai878-181717?logo=github)](https://github.com/pdesai878)

⟡ *Reflection over prediction*

</div>
