---
layout: home

hero:
  name: LLMFeed
  text: MCP Feed Ecosystem Tools
  tagline: The complete toolkit for discovering, validating, signing, and monitoring feeds that power AI agent integrations
  image:
    src: /logo.svg
    alt: LLMFeed
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/kiarashplusplus/webmcp-tooling-suite
    - theme: alt
      text: Try Playground
      link: https://kiarashplusplus.github.io/webmcp-tooling-suite/

features:
  - icon: ✅
    title: Feed Validation
    details: Comprehensive schema validation for LLMFeed JSON feeds with detailed error reporting. Ensure your feeds are AI-ready. (llm.txt support coming soon)
    link: /packages/validator/
    linkText: Learn more

  - icon: 🔐
    title: Cryptographic Signing
    details: Ed25519 signatures for feed authenticity. PEM & base64 key support. Build trust in the MCP ecosystem with LLMFeed JSON.
    link: /packages/signer/
    linkText: Learn more

  - icon: 📊
    title: Health Monitoring
    details: Crawl, track, and generate reports on feed health across your infrastructure. Catch issues before your users do.
    link: /packages/health-monitor/
    linkText: Learn more

  - icon: 🚀
    title: GitHub Action
    details: Automate feed validation in your CI/CD pipeline. Fail builds on invalid feeds. Zero configuration required.
    link: /packages/github-action/
    linkText: Learn more

  - icon: 🌐
    title: Discovery & Directory
    details: Register feeds in the public directory. Enable AI agents to discover your capabilities automatically.
    link: /guide/discovery
    linkText: Learn more

  - icon: 🎯
    title: Capability Schemas
    details: Define rich capability metadata with JSON Schema validation. Describe what your service can do for AI agents.
    link: /guide/capabilities
    linkText: Learn more
---

<div class="vp-doc" style="padding: 2rem;">

## Supported Feed Formats

LLMFeed tools support two feed formats for the **Model Context Protocol (MCP)** ecosystem:

<div class="format-comparison">

| Format | File | Status | Description |
|--------|------|--------|-------------|
| **LLMFeed JSON** | `llmfeed.json`, `feed.json` | ✅ **Fully Supported** | Structured JSON format with cryptographic signing, capability schemas, and full validation |
| **llm.txt** | `llm.txt`, `/.well-known/llm.txt` | 🚧 **Work in Progress** | Markdown-based format for human-readable documentation (parsing support coming soon) |

</div>

::: tip Current Focus
Our tooling is fully built for **LLMFeed JSON** format. This includes validation, signing, health monitoring, and CI/CD integration. Support for **llm.txt** (the markdown-based format) is planned for future releases.
:::

## The MCP Feed Ecosystem

LLMFeed provides the foundational tooling for the **Model Context Protocol (MCP)** feed ecosystem. Whether you're a service provider exposing capabilities to AI agents, or a platform consuming feeds, these tools ensure interoperability, trust, and reliability.

<div class="ecosystem-diagram">
  <div class="ecosystem-flow">
    <div class="ecosystem-node">
      <strong>📝 Create</strong>
      <small>Author your feed</small>
    </div>
    <span class="ecosystem-arrow">→</span>
    <div class="ecosystem-node highlight">
      <strong>✅ Validate</strong>
      <small>llmfeed-validator</small>
    </div>
    <span class="ecosystem-arrow">→</span>
    <div class="ecosystem-node highlight">
      <strong>🔐 Sign</strong>
      <small>llmfeed-signer</small>
    </div>
    <span class="ecosystem-arrow">→</span>
    <div class="ecosystem-node">
      <strong>🚀 Publish</strong>
      <small>Deploy to web</small>
    </div>
    <span class="ecosystem-arrow">→</span>
    <div class="ecosystem-node highlight">
      <strong>📊 Monitor</strong>
      <small>llmfeed-health</small>
    </div>
  </div>
</div>

## Quick Install

```bash
# Validator - Schema validation & signature verification
npm install @25xcodes/llmfeed-validator

# Signer - Ed25519 key generation & feed signing
npm install @25xcodes/llmfeed-signer

# Health Monitor - Feed crawling & health reports
npm install @25xcodes/llmfeed-health-monitor
```

## Why LLMFeed?

<div class="stats-grid">
  <div class="stat-item">
    <div class="stat-value">3</div>
    <div class="stat-label">Core Packages</div>
  </div>
  <div class="stat-item">
    <div class="stat-value">Ed25519</div>
    <div class="stat-label">Cryptographic Standard</div>
  </div>
  <div class="stat-item">
    <div class="stat-value">100%</div>
    <div class="stat-label">TypeScript</div>
  </div>
  <div class="stat-item">
    <div class="stat-value">MIT</div>
    <div class="stat-label">License</div>
  </div>
</div>

### For Service Providers

Expose your APIs and services to AI agents with a standardized feed format. LLMFeed tools help you:

- **Validate** your feed structure before publishing
- **Sign** feeds cryptographically for authenticity
- **Monitor** feed health and availability
- **Register** in the public directory for discovery

### For AI Platforms

Consume feeds reliably with built-in verification:

- **Validate** incoming feeds against the schema
- **Verify** Ed25519 signatures to ensure authenticity
- **Crawl** feeds and track health metrics
- **Discover** new feeds from the directory

</div>
