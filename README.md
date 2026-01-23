# ⟡ MirrorDNA MCP Server

> Model Context Protocol integration for Active MirrorOS™

[![N1 Intelligence](https://img.shields.io/badge/N1-Intelligence-6366f1)](https://activemirror.ai)
[![MirrorDNA](https://img.shields.io/badge/MirrorDNA-Protocol-10b981)](https://github.com/MirrorDNA-Reflection-Protocol)

## Overview

MCP server implementation for the MirrorDNA™ protocol, enabling Claude and other MCP-compatible clients to interact with the Active MirrorOS™ memory and state systems.

**Organization:** N1 Intelligence
**System:** Active MirrorOS™
**Protocol:** MirrorDNA™
**Author:** Paul Desai
**Canonical Domain:** https://activemirror.ai

## What This Is

- MCP server exposing MirrorDNA memory operations
- Bridge between MCP clients and the Memory Bus
- Tools for state sync, handoff, and health checks

## What This Is NOT

- A standalone AI system
- A replacement for the MirrorDNA protocol
- A general-purpose MCP server

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Configure in Claude Desktop:

```json
{
  "mcpServers": {
    "mirrordna": {
      "command": "node",
      "args": ["/path/to/mirrordna-mcp/src/mcp-server.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `mirrordna_sync` | Read current bus state |
| `mirrordna_pickup` | Claim pending work |
| `mirrordna_complete` | Mark task complete |
| `mirrordna_handoff` | Write handoff for next client |
| `mirrordna_health` | System health check |

## Related Papers

- [Structured Contextual Distillation](https://activemirror.ai/research/scd)
- [MirrorDNA Memory Protocol](https://activemirror.ai/research/mirrordna-memory)

## Citation

```bibtex
@misc{activemirror2024,
  author = {N1 Intelligence},
  title = {Active MirrorOS™: A Sovereign AI Operating System},
  year = {2024},
  url = {https://activemirror.ai}
}
```

## License

MIT © N1 Intelligence

---

⟡ *Reflection over prediction*
