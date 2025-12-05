# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-12-05

### Changed

#### @25xcodes/llmfeed-validator (`1.1.0`)
- **Scoring Alignment** — Unified scoring formula across all tools
  - Unsigned feeds now receive `-30` penalty (consistent with GitHub Action)
  - Failed signature verification: `-50` penalty
  - Verified signature: `+10` bonus
  - Formula: `100 - (errors×20) - (warnings×5) - (unsigned?30:0) + (verified?10:0)`

#### @25xcodes/llmfeed-health-monitor (`1.1.1`)
- **Scoring Alignment** — Crawler scoring now matches validator (65/100 for unsigned)
- **Added Unsigned Warning** — CLI now shows "Feed is not cryptographically signed" warning
- **Improved GitHub Issues** — Retry issue creation without labels if permission denied
- **Fixed Issue Templates** — Reference GitHub Action instead of broken llm-feed.org link
- **Raw GitHub URL Detection** — Support `raw.githubusercontent.com` URLs for one-click PRs
- **Path Normalization** — Fixed double-slash bug in PR URLs

---

## [1.1.0] - 2025-12-05

### Added

#### npm Packages
- **@25xcodes/llmfeed-health-monitor** (`1.0.0`) — NEW: Feed health monitoring & outreach automation
  - **Feed Crawler** — Crawl and validate LLMFeeds with opt-out detection
    - Respects `robots.txt` for `LLMFeed-Health-Monitor` user-agent
    - Detects feed metadata opt-out signals (`health-monitor: noindex`)
    - Detects HTML meta tag opt-outs (`llmfeed-monitor`, `robots: noai`)
  - **Discovery Engine** — Auto-discover feeds from sitemaps and well-known paths
  - **Multi-channel Notifier** — Automated outreach via:
    - GitHub Issues (creates issues on detected repos)
    - Email (via SMTP/nodemailer)
    - Twitter DMs (via Twitter API)
  - **Report Generator** — Beautiful HTML & JSON health reports
    - Visual score ring with color coding
    - One-click fix PR generation for GitHub repos
    - Detailed issue breakdowns with remediation suggestions
  - **Storage Adapters** — Flexible persistence options
    - In-memory storage for testing
    - SQLite/better-sqlite3 for production
  - **Scheduler** — Cron-based monitoring with node-cron
  - **CLI Tool** (`llmfeed-health`) — Full CLI for all operations
    - `check <url>` — Check a single feed
    - `crawl <urls...>` — Crawl multiple feeds
    - `discover <domain>` — Discover feeds from a domain
    - `report <url>` — Generate HTML report
    - `monitor` — Start scheduled monitoring
    - `stats` — View monitoring statistics
  - TypeScript support with full type definitions
  - Peer dependency on `@25xcodes/llmfeed-validator`

#### GitHub Action
- **Dynamic Badge Generation** — New shields.io integration via GitHub Gist
  - New inputs: `badge-gist-id`, `badge-filename`
  - New output: `badge-url` for README embedding
  - Color-coded badges by score (brightgreen/green/yellow/orange/red)
  - Automatic Gist updates on each validation run
  - Backwards compatible with existing SVG badge generation

### Changed
- GitHub Action now generates both `.svg` and `.json` badge files when `create-badge: true`

---

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

[1.1.1]: https://github.com/kiarashplusplus/webmcp-tooling-suite/releases/tag/v1.1.1
[1.1.0]: https://github.com/kiarashplusplus/webmcp-tooling-suite/releases/tag/v1.1.0
[1.0.0]: https://github.com/kiarashplusplus/webmcp-tooling-suite/releases/tag/v1.0.0
