# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-04

### 🎉 Initial Release

First stable release of the WebMCP Tooling Suite—a comprehensive toolkit for the Web Model Context Protocol (WebMCP) and LLMFeed ecosystem.

### Added

#### Web Application
- **Universal LLMFeed Validator** — Validate feeds from URL, file upload, or paste
  - Structural validation (feed_type, metadata, capabilities)
  - JSON Schema conformance checking
  - Full Ed25519 cryptographic signature verification
  - Security scoring (0-100) with actionable remediation guidance
  - Signature debugger for troubleshooting failed verifications
- **Feed Discovery & Analysis** — Auto-detect `.well-known/mcp.llmfeed.json` paths
- **Feed Directory** — Curated directory of verified LLMFeed implementations
- **Feed Submission** — Submit your feed to the directory via GitHub OAuth
- **RAG Prep** — Generate RAG-optimized indexes with 50%+ token savings
- **Sitemap Generator** — Create XML sitemaps from LLMFeed tool catalogs
- **Archive & Versioning** — Snapshot feeds with diff tracking and GitHub Gist publishing

#### npm Packages
- **@25xcodes/llmfeed-validator** (`1.0.0`) — LLMFeed validation library
  - Programmatic API for Node.js/browser
  - CLI tool (`llmfeed-validate`)
  - Ed25519 signature verification
  - TypeScript support with full type definitions
- **@25xcodes/llmfeed-signer** (`1.0.0`) — LLMFeed signing library
  - Generate Ed25519 keypairs
  - Sign LLMFeed JSON files
  - CLI tool (`llmfeed-sign`)
  - TypeScript support

#### GitHub Action
- **@25xcodes/llmfeed-action** — Validate LLMFeeds in CI/CD pipelines
  - Automatic `.well-known/mcp.llmfeed.json` detection
  - Signature verification
  - Configurable failure thresholds
  - GitHub Actions annotations for errors

#### Infrastructure
- **Cloudflare Workers** for API endpoints
  - Feed directory API with D1 database
  - GitHub OAuth proxy
  - CORS proxy for cross-origin feed fetching

### Security
- Ed25519 cryptographic signature verification
- Public key fetching from `public_key_hint` URLs (PEM/SPKI format)
- Security scoring with remediation guidance

---

[1.0.0]: https://github.com/kiarashplusplus/webmcp-tooling-suite/releases/tag/v1.0.0
