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
- **Storage**: localStorage (default) + GitHub Gist sync (optional)
- **Auth**: GitHub OAuth (optional, via Cloudflare Worker)
- **Crypto**: Web Crypto API (native Ed25519)
- **State**: @tanstack/react-query + localStorage

## Deployment

This is a fully static site that can be deployed to:

- **GitHub Pages** - Zero configuration needed
- **Cloudflare Pages** - Connect repo and deploy
- **Netlify** - Automatic deploys from GitHub

### Optional: GitHub OAuth

For authenticated publishing to the directory, deploy a Cloudflare Worker:

```bash
# In a separate worker project
npx wrangler init webmcp-auth
```

Set these environment variables:
- `VITE_GITHUB_OAUTH_URL` - OAuth initiation endpoint
- `VITE_GITHUB_TOKEN_URL` - Token exchange endpoint

## Installation

```bash
# Clone the repository
git clone https://github.com/websearch-via-camera/webmcp-tooling-suite.git
cd webmcp-tooling-suite

# Install dependencies
npm install

# Start development server
npm run dev

# Build all packages
npm run build:packages
```

## Packages

The tooling suite includes standalone packages for CI/CD integration:

### @webmcp/validator (CLI)

Validate LLMFeed files with full Ed25519 signature verification.

```bash
npm install -g @webmcp/validator

llmfeed-validate https://25x.codes/.well-known/mcp.llmfeed.json
llmfeed-validate ./feed.json --verbose --json
```

### @webmcp/signer (CLI)

Generate Ed25519 keypairs and sign LLMFeed files.

```bash
npm install -g @webmcp/signer

llmfeed-sign keygen -o ./keys -n mysite
llmfeed-sign sign feed.json --key ./keys/mysite.private.pem \
  --public-url https://example.com/.well-known/public.pem
```

### @webmcp/github-action

GitHub Action for automated feed validation in CI/CD pipelines.

```yaml
# .github/workflows/validate-feed.yml
name: Validate LLMFeed
on:
  push:
    paths: ['**/*.llmfeed.json']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: websearch-via-camera/webmcp-tooling-suite/packages/github-action@v1
        with:
          feed: '.well-known/mcp.llmfeed.json'
          create-badge: 'true'
```

**Features:**
- ✅ Automatic PR checks for feed changes
- ✅ Ed25519 signature verification
- ✅ Status badge generation
- ✅ Security score output (0-100)

See individual package READMEs for complete documentation.

## Roadmap

### ✅ Completed

1. **CLI Validator Package** — `@webmcp/validator`
   - Full Ed25519 signature verification
   - Structural and schema validation  
   - Security scoring with detailed diagnostics
   - JSON output mode for CI/CD scripting

2. **Feed Signing Tool** — `@webmcp/signer`
   - Ed25519 keypair generation (PKCS#8 format)
   - Feed signing with configurable `signed_blocks`
   - PEM and base64 key formats
   - CI/CD-friendly CLI interface

3. **GitHub Action** — `@webmcp/github-action`
   - Automatic PR checks for feed changes
   - Ed25519 signature verification in CI
   - Dynamic SVG badge generation
   - Outputs for downstream workflow steps

### 📋 Planned

4. **Feed Schema Generator**
   - Generate LLMFeed from OpenAPI/Swagger specs
   - Import from existing MCP server definitions
   - TypeScript type generation from feed schemas
   - Reduce manual feed authoring friction

5. **Multi-Feed Aggregator**
   - Combine multiple feeds into unified index
   - Namespace collision detection
   - Cross-feed capability search
   - Agent-optimized merged output

6. **Feed Health Monitor** (Community Interest)
   - Uptime tracking for registered feeds
   - Signature expiration warnings
   - Broken public_key_hint detection
   - Optional status badges

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
