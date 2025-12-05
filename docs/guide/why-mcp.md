# Why MCP Matters

The **Model Context Protocol (MCP)** is emerging as a standard for how AI agents discover and interact with external services. Understanding why MCP matters is crucial for anyone building in the AI ecosystem.

## The AI Agent Revolution

AI agents are evolving from simple chatbots to autonomous systems that can:

- 🔍 **Search** the web and databases
- 📧 **Send** emails and messages
- 📊 **Analyze** documents and data
- 🛒 **Make** purchases and bookings
- 🔧 **Execute** code and API calls

For these capabilities to work reliably, agents need a standard way to discover what's possible and how to do it.

## The Discovery Problem

Without a standard protocol, AI agents face several challenges:

### Fragmented Ecosystem

Every platform has its own way of describing capabilities:
- OpenAI has plugins and GPTs
- Anthropic has tool use
- Google has function calling
- Each with different formats and conventions

### Trust & Verification

How does an agent know if a capability claim is legitimate?
- Anyone can claim to offer a service
- No standard way to verify authenticity
- Potential for malicious capability injection

### Discovery Bottleneck

How do agents find new capabilities?
- Manual integration is slow and doesn't scale
- No standard directory or registry
- Hard to keep up with new services

## MCP: A Unified Standard

The Model Context Protocol solves these problems by defining standardized feed formats:

### 1. Feed Formats

Two complementary formats serve different needs:

#### LLMFeed JSON (Fully Supported ✅)

A structured JSON format for machine consumption with cryptographic signing:

```json
{
  "feed_type": "llmfeed",
  "metadata": {
    "title": "My Service",
    "origin": "https://example.com",
    "description": "What my service does"
  },
  "capabilities": [
    {
      "name": "search",
      "description": "Search our database",
      "endpoint": "/api/search",
      "parameters": { ... }
    }
  ],
  "items": [...]
}
```

#### llm.txt (Work in Progress 🚧)

A markdown format for human-readable documentation:

```markdown
# My Service

> What my service does

## Capabilities
- Search: Query our database

## Docs
- [API Reference](https://example.com/docs)
```

::: info Tooling Status
LLMFeed tools fully support **LLMFeed JSON** format. Support for **llm.txt** parsing is planned for future releases.
:::

### 2. Trust Block

Cryptographic signatures that verify authenticity:

```json
{
  "trust": {
    "type": "signed",
    "publicKey": "base64-encoded-ed25519-key",
    "signature": "base64-encoded-signature",
    "signedBlocks": ["title", "description", "capabilities"]
  }
}
```

### 3. Discovery Mechanism

Standard locations where agents can find feeds:
- `/.well-known/llmfeed.json` or `/.well-known/llm.txt`
- `/llmfeed.json` or `/llm.txt`
- Public directory listings

::: tip Recommendation
Serve **LLMFeed JSON** for full tooling support. You can also provide **llm.txt** for human readers.
:::

## The Ecosystem Vision

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Platforms                        │
│  (ChatGPT, Claude, Gemini, Custom Agents)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    Discover & Verify
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Feed Directory                        │
│  (Centralized discovery, verification, health tracking)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                      Aggregate
                          │
                          ▼
┌───────────────┬────────────────┬────────────────────────────┐
│  Service A    │   Service B    │   Service C                │
│ /llmfeed.json │ /llmfeed.json  │ /.well-known/llmfeed.json  │
│  (signed)     │   (signed)     │   (signed)                 │
└───────────────┴────────────────┴────────────────────────────┘
```

## Benefits for Everyone

### For Service Providers

- **Reach** - Get discovered by AI agents automatically
- **Trust** - Cryptographic proof of authenticity
- **Standard** - One format works across all platforms
- **Control** - Define exactly what agents can do

### For AI Platforms

- **Discovery** - Find new capabilities programmatically
- **Verification** - Trust only signed, validated feeds
- **Reliability** - Monitor feed health continuously
- **Scale** - Integrate thousands of services efficiently

### For Users

- **Safety** - Know that capabilities are verified
- **Choice** - Access a growing ecosystem of services
- **Quality** - Health monitoring ensures availability
- **Innovation** - New capabilities emerge faster

## Where LLMFeed Fits

This toolkit provides the infrastructure layer for MCP:

| Layer | Component | LLMFeed Tool |
|-------|-----------|--------------|
| Validation | Schema compliance | `llmfeed-validator` |
| Trust | Cryptographic signing | `llmfeed-signer` |
| Monitoring | Health & availability | `llmfeed-health-monitor` |
| CI/CD | Automated validation | `llmfeed-action` |

## Getting Involved

The MCP ecosystem is still evolving. You can contribute by:

1. **Publishing feeds** - Add your service to the ecosystem
2. **Using the tools** - Validate, sign, and monitor feeds
3. **Contributing code** - Help improve the toolkit
4. **Spreading the word** - Share MCP with others

Ready to get started? Check out our [Getting Started Guide](/guide/getting-started).
