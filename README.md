# WebMCP Tooling Suite

A comprehensive toolkit for the **Web Model Context Protocol (WebMCP)** and **LLMFeed** ecosystem—providing validation, discovery, archival, and RAG indexing tools for AI agent-ready websites.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Project Summary

The WebMCP Tooling Suite addresses critical gaps identified in the MCP/WebMCP/LLMFeed ecosystem:

| Gap | Problem | Our Solution |
|-----|---------|--------------|
| **Trust Validation** | No automated validator for LLMFeed cryptographic signatures | Full Ed25519 signature verification with public key fetching |
| **Context Indexing** | Prompt bloat from large tool catalogs degrades LLM performance | RAG-optimized indexing with 50%+ token savings |
| **Feed Discovery** | Fragmented, manual feed discovery across the web | Universal feed directory with .well-known URI support |

## Features

### Implemented

- **Universal LLMFeed Validator** — Comprehensive validation from URL, file upload, or paste
  - Structural validation (feed_type, metadata, capabilities)
  - JSON Schema conformance checking
  - **Full Ed25519 cryptographic signature verification**
  - Security scoring (0-100) with actionable remediation guidance
  - Signature debugger for troubleshooting failed verifications

- **Feed Discovery & Analysis** — Discover feeds from any URL or domain
  - Auto-detection of `.well-known/mcp.llmfeed.json` paths
  - Capability extraction with JSON-RPC invocation examples
  - Token estimation for context planning

- **Feed Directory** — Centralized, public directory of LLMFeeds
  - "Top Feeds" (by capabilities) and "Latest Published" sections
  - Scraper-friendly JSON links with data attributes
  - GitHub authentication for publishing (prevents spam)

- **Universal Archive** — Versioned feed archival with persistence
  - Timestamped snapshots for any feed URL
  - Version history browsing and comparison
  - Export/restore capabilities
  - Immutable versions for cryptographic trust

- **RAG Indexing Preparation** — Transform feeds for vector databases
  - Structured output optimized for embedding models
  - Token efficiency metrics and savings calculation
  - Export to Pinecone, Weaviate, Chroma-compatible format

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WebMCP Tooling Suite                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Directory │  │Validator │  │Discovery │  │ Archive  │        │
│  │          │  │          │  │          │  │          │        │
│  │ • Browse │  │ • Parse  │  │ • Fetch  │  │ • Store  │        │
│  │ • Search │  │ • Verify │  │ • Analyze│  │ • Version│        │
│  │ • Publish│  │ • Score  │  │ • Inspect│  │ • Export │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                        ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Core Library (llmfeed.ts)                    │  │
│  │  • Ed25519 verification  • Schema validation              │  │
│  │  • RAG preparation       • Token estimation               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                        ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   RAG Prep Tool                           │  │
│  │  → Vector-ready embeddings for semantic search            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Security Model

The validator implements the full Ed25519 trust verification chain:

```
Feed → Trust Block → Public Key Hint → Signature Verification
         ↓               ↓                    ↓
    signed_blocks    Fetch PEM key      Verify against
    enumeration      from URL           canonical payload
```

**Signature verification protects against:**
- Tool Poisoning — Malicious tool definition modifications
- Tool Shadowing — Fake tools intercepting legitimate calls
- Supply Chain Attacks — Compromised feed distributions

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **UI**: Radix UI primitives + Tailwind CSS v4 + shadcn/ui
- **Auth**: GitHub OAuth via @github/spark
- **Crypto**: Web Crypto API (native Ed25519)
- **State**: @tanstack/react-query + Spark KV store

## Installation

```bash
# Clone the repository
git clone https://github.com/websearch-via-camera/webmcp-tooling-suite.git
cd webmcp-tooling-suite

# Install dependencies
npm install

# Start development server
npm run dev
```

## Future Roadmap

Based on research findings and PRD analysis, the following priorities are recommended:

### High Priority (Security Critical)

1. **CLI/API Package** — Extract validation logic into standalone `@webmcp/validator` package
   - Enable CI/CD integration for feed signing pipelines
   - Provide programmatic validation for server-side consumption
   - Support offline validation scenarios

2. **Feed Signing Tool** — Generate Ed25519 keypairs and sign feeds
   - Key management with secure storage
   - Automated signing in deployment workflows
   - Key rotation support

### Medium Priority (Ecosystem Growth)

3. **Vector Store Integrations** — Direct export to popular vector DBs
   - Pinecone, Weaviate, Chroma, Qdrant connectors
   - Automated re-indexing on feed updates
   - Embedding model selection (nomic-embed-text, OpenAI, etc.)

4. **Feed Registry API** — RESTful API for directory operations
   - Search by capabilities, domain, topics
   - Webhook notifications for feed updates
   - GraphQL interface for flexible queries

5. **WebMCP Client SDK** — Browser SDK for consuming feeds
   - navigator.modelContext polyfill (MCP-B compatibility)
   - JSON-RPC client with retry/timeout handling
   - TypeScript-first with full type inference

### Lower Priority (Nice-to-Have)

6. **Feed Diff & Migration Tools** — Track changes between feed versions
7. **Health Monitoring Dashboard** — Track feed availability and response times
8. **Certification Program** — Verified publisher badges for trusted feeds

## Reference Implementation

This project validates against the **25x.codes** reference feed:

```
https://25x.codes/.well-known/mcp.llmfeed.json
```

Key features demonstrated:
- Full Ed25519 signature with trust block
- JSON-RPC 2.0 invocation pattern
- Typed capabilities with input/output schemas
- Agent guidance with fallback instructions

## Related Documentation

- [Validator User Guide](VALIDATOR_GUIDE.md) — Detailed validation feature documentation
- [Validator Status](VALIDATOR_STATUS.md) — Implementation completeness report
- [Product Requirements](PRD.md) — Full PRD with design specifications

## Protocol Standards

| Standard | Status | Description |
|----------|--------|-------------|
| **MCP** | Compatible | Anthropic's Model Context Protocol (JSON-RPC 2.0) |
| **WebMCP** | Compatible | W3C Web ML Community Group proposal |
| **LLMFeed** | Primary Focus | Static file-based feed specification |

## Contributing

Contributions are welcome! Areas where help is especially needed:

- [ ] Additional embedding model support
- [ ] Feed schema versioning system
- [ ] Internationalization (i18n)
- [ ] Accessibility improvements
- [ ] E2E test coverage

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built for the AI Agent ecosystem</strong><br>
  <sub>Ensuring trust and efficiency in LLM tool discovery</sub>
</p>
