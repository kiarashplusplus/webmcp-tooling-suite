# What is WebMCP Tooling Suite?

WebMCP Tooling Suite is a comprehensive toolkit for the **Model Context Protocol (MCP)** feed ecosystem. It provides everything you need to create, validate, sign, publish, and monitor feeds that enable AI agents to discover and interact with your services.

## Supported Feed Formats

WebMCP tools support two complementary feed formats:

| Format | Status | Best For |
|--------|--------|----------|
| **LLMFeed JSON** (`.json`) | ✅ **Fully Supported** | Structured data, cryptographic signing, machine consumption |
| **llm.txt** (`.txt`) | 🚧 **Work in Progress** | Human-readable documentation, simple discovery |

::: info Current Tooling Status
All LLMFeed packages (**validator**, **signer**, **health-monitor**, **github-action**) are fully built and tested for **LLMFeed JSON** format. Support for parsing and validating **llm.txt** (the markdown-based format) is planned for future releases. You can still serve llm.txt files for discovery, but our tooling currently processes JSON feeds.
:::

## The Problem

As AI agents become more capable, they need standardized ways to discover what services and APIs are available to them. Without a standard:

- **AI agents** can't reliably discover new capabilities
- **Service providers** have no standard way to advertise their offerings
- **Platforms** struggle to verify the authenticity of capability claims
- **Everyone** suffers from fragmented, incompatible approaches

## The Solution: MCP Feeds

The Model Context Protocol defines standardized feed formats that:

1. **Describes capabilities** - What your service can do
2. **Provides context** - How AI agents should interact with you
3. **Establishes trust** - Cryptographic signatures verify authenticity
4. **Enables discovery** - Standard locations and directory listings

### LLMFeed JSON (Fully Supported ✅)

A structured JSON format with cryptographic signing support:

```json
{
  "feed_type": "llmfeed",
  "metadata": {
    "title": "My Service",
    "origin": "https://example.com",
    "description": "What my service does"
  },
  "capabilities": [...],
  "items": [...],
  "trust": { ... }
}
```

### llm.txt (Coming Soon 🚧)

A markdown-based format for human-readable documentation:

```markdown
# My Service

> What my service does

## Capabilities

- Search: Query our knowledge base
- Create: Generate new content

## Documentation

- [API Reference](https://example.com/docs/api)
- [Getting Started](https://example.com/docs/start)
```

::: warning llm.txt Support Status
While you can create and serve llm.txt files, our tooling (validator, signer, health-monitor) does not yet parse or validate this format. JSON feeds are recommended for full tooling support.
:::

## WebMCP Toolkit

This project provides the core tooling to work with MCP feeds:

### 📦 [@25xcodes/llmfeed-validator](/packages/validator/)

Validate LLMFeed JSON structure and verify cryptographic signatures. Use it to:
- Check feeds against the official JSON schema
- Verify Ed25519 signatures for authenticity
- Integrate validation into your CI/CD pipeline

### 📦 [@25xcodes/llmfeed-signer](/packages/signer/)

Generate keys and sign your LLMFeed JSON feeds. Use it to:
- Generate Ed25519 key pairs
- Sign feeds for cryptographic authenticity
- Export keys in PEM or base64 format

### 📦 [@25xcodes/llmfeed-health-monitor](/packages/health-monitor/)

Monitor feed health across your infrastructure. Use it to:
- Crawl and validate feeds on a schedule
- Generate health reports (JSON, HTML, Markdown)
- Track feed availability and changes over time

### 📦 [@25xcodes/llmfeed-action](/packages/github-action/)

GitHub Action for CI/CD integration. Use it to:
- Automatically validate feeds on push/PR
- Fail builds on invalid feeds
- Generate validation reports as artifacts

## Who Should Use This?

### Service Providers

If you offer APIs, tools, or services that AI agents could use, you should:

1. Create an LLMFeed JSON file describing your capabilities
2. Sign it with Ed25519 for authenticity
3. Publish it at a well-known location
4. Register in the directory for discovery
5. *(Optional)* Also provide an llm.txt for human readers

### AI Platform Builders

If you're building AI agents or platforms that consume capabilities:

1. Use the validator to verify incoming JSON feeds
2. Verify signatures before trusting capability claims
3. Monitor feed health for your integrations
4. Discover new feeds from the directory

### DevOps & Infrastructure

If you manage MCP infrastructure:

1. Use the GitHub Action to validate feeds in CI
2. Monitor feed health across your fleet
3. Generate reports for compliance and auditing

## Next Steps

<div class="package-grid">
  <a href="/guide/getting-started" class="package-card">
    <h3>🚀 Getting Started</h3>
    <p>Install the packages and create your first feed</p>
  </a>
  <a href="/guide/feed-structure" class="package-card">
    <h3>📄 Feed Structure</h3>
    <p>Understand the LLMFeed JSON format and schema</p>
  </a>
  <a href="/guide/trust-signatures" class="package-card">
    <h3>🔐 Trust & Signatures</h3>
    <p>Learn about cryptographic signing</p>
  </a>
  <a href="/packages/" class="package-card">
    <h3>📦 Packages</h3>
    <p>Explore the full API reference</p>
  </a>
</div>
