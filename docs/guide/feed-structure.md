# Feed Structure

This guide covers the complete structure of feed formats for MCP discovery.

## Feed Formats Overview

LLMFeed tools support two complementary formats:

| Format | File Extension | Status | Use Case |
|--------|---------------|--------|----------|
| **LLMFeed JSON** | `.json` | ✅ **Fully Supported** | Structured data with signing |
| **llm.txt** | `.txt` | 🚧 **Work in Progress** | Human-readable markdown |

::: tip Recommendation
Use **LLMFeed JSON** format for full tooling support including validation, cryptographic signing, and health monitoring. You can additionally provide an **llm.txt** file for human readers.
:::

---

## LLMFeed JSON Format (Fully Supported ✅)

An LLMFeed JSON document is a structured format that describes a service's capabilities for AI agent consumption. It supports:

- **Schema validation** - Strict validation with detailed error messages
- **Cryptographic signing** - Ed25519 signatures for authenticity
- **Capability schemas** - JSON Schema for parameters and responses
- **Health monitoring** - Automated crawling and reporting

### Minimal Valid Feed

The simplest valid LLMFeed JSON requires `feed_type`, `metadata`, and `items`:

```json
{
  "feed_type": "llmfeed",
  "metadata": {
    "title": "My Service",
    "origin": "https://example.com",
    "description": "A brief description of what this service does"
  },
  "items": [
    {
      "title": "About",
      "url": "https://example.com/about"
    }
  ]
}
```

### Complete Schema

#### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `feed_type` | string | ✅ | Must be `"llmfeed"` |
| `metadata` | object | ✅ | Feed metadata (title, origin, description) |
| `capabilities` | array | ❌ | Machine-callable capabilities |
| `items` | array | ✅ | Content items and resources |
| `trust` | object | ❌ | Cryptographic trust information |

#### Metadata Object (Required)

```json
{
  "metadata": {
    "title": "My Awesome Service",
    "origin": "https://api.example.com",
    "description": "A service that helps AI agents do amazing things",
    "logo": "https://example.com/logo.png",
    "contact": {
      "email": "support@example.com",
      "name": "Support Team",
      "url": "https://example.com/contact"
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Human-readable name of the service |
| `origin` | string | ✅ | Primary URL/origin for the service |
| `description` | string | ✅ | Longer description for context |
| `logo` | string | ❌ | URL to service logo |
| `contact` | object | ❌ | Contact information |

#### Capabilities Array

Capabilities are the machine-callable functions your service offers:

```json
{
  "capabilities": [
    {
      "name": "search",
      "description": "Search our knowledge base",
      "endpoint": "/api/search",
      "method": "POST",
      "authentication": {
        "type": "bearer",
        "header": "Authorization"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query"
          },
          "filters": {
            "type": "object",
            "properties": {
              "category": { "type": "string" },
              "dateRange": { "type": "string" }
            }
          }
        },
        "required": ["query"]
      },
      "response": {
        "type": "object",
        "properties": {
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "title": { "type": "string" },
                "url": { "type": "string" },
                "snippet": { "type": "string" }
              }
            }
          }
        }
      },
      "rateLimit": {
        "requests": 100,
        "window": "1h"
      }
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique identifier for the capability |
| `description` | string | ✅ | What this capability does |
| `endpoint` | string | ❌ | API endpoint path |
| `method` | string | ❌ | HTTP method (GET, POST, etc.) |
| `authentication` | object | ❌ | Auth requirements |
| `parameters` | object | ❌ | JSON Schema for input parameters |
| `response` | object | ❌ | JSON Schema for response format |
| `rateLimit` | object | ❌ | Rate limiting information |

#### Items Array

Items are content resources associated with your service:

```json
{
  "items": [
    {
      "title": "API Documentation",
      "description": "Complete API reference",
      "url": "https://docs.example.com/api",
      "type": "documentation",
      "tags": ["api", "reference"],
      "published": "2025-11-15T10:00:00Z",
      "updated": "2025-12-01T14:30:00Z"
    },
    {
      "title": "Getting Started Guide",
      "description": "Quick start tutorial",
      "url": "https://docs.example.com/quickstart",
      "type": "tutorial",
      "tags": ["beginner", "quickstart"]
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Item title |
| `description` | string | ❌ | Item description |
| `url` | string | ✅ | URL to the resource |
| `type` | string | ❌ | Content type (documentation, tutorial, etc.) |
| `tags` | array | ❌ | Categorization tags |
| `published` | string | ❌ | ISO 8601 publish date |
| `updated` | string | ❌ | ISO 8601 last update date |
| `content` | string | ❌ | Inline content (for small resources) |

#### Trust Block

The trust block contains cryptographic signing information:

```json
{
  "trust": {
    "type": "signed",
    "algorithm": "ed25519",
    "publicKey": "MCowBQYDK2VwAyEA...",
    "signature": "base64-signature...",
    "signedBlocks": ["feed_type", "metadata", "capabilities", "items"],
    "timestamp": "2025-12-01T14:30:00Z"
  }
}
```

See [Trust & Signatures](/guide/trust-signatures) for detailed documentation.

### Full Example (LLMFeed JSON)

Here's a complete, production-ready feed:

```json
{
  "feed_type": "llmfeed",
  "metadata": {
    "title": "Acme Analytics API",
    "origin": "https://analytics.acme.com",
    "description": "Real-time analytics and reporting for your applications",
    "logo": "https://acme.com/logo.png",
    "contact": {
      "email": "api-support@acme.com",
      "name": "API Support Team",
      "url": "https://acme.com/support"
    }
  },
  
  "capabilities": [
    {
      "name": "query",
      "description": "Execute analytics queries against your data",
      "endpoint": "/api/v1/query",
      "method": "POST",
      "authentication": {
        "type": "bearer"
      },
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "SQL-like query string"
          },
          "timeRange": {
            "type": "object",
            "properties": {
              "start": { "type": "string", "format": "date-time" },
              "end": { "type": "string", "format": "date-time" }
            }
          }
        },
        "required": ["query"]
      },
      "rateLimit": {
        "requests": 1000,
        "window": "1h"
      }
    },
    {
      "name": "createReport",
      "description": "Generate a formatted analytics report",
      "endpoint": "/api/v1/reports",
      "method": "POST",
      "parameters": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "query": { "type": "string" },
          "format": { 
            "type": "string",
            "enum": ["pdf", "csv", "json"]
          }
        },
        "required": ["name", "query"]
      }
    }
  ],
  
  "items": [
    {
      "title": "API Reference",
      "description": "Complete API documentation",
      "url": "https://docs.acme.com/analytics/api",
      "type": "documentation"
    },
    {
      "title": "Query Language Guide",
      "description": "Learn our SQL-like query language",
      "url": "https://docs.acme.com/analytics/query-language",
      "type": "documentation"
    },
    {
      "title": "Getting Started",
      "description": "Quick start tutorial",
      "url": "https://docs.acme.com/analytics/quickstart",
      "type": "tutorial"
    }
  ],
  
  "trust": {
    "type": "signed",
    "algorithm": "ed25519",
    "publicKey": "MCowBQYDK2VwAyEA7890xyz...",
    "signature": "base64-signature...",
    "signedBlocks": ["feed_type", "metadata", "capabilities", "items"],
    "timestamp": "2025-12-01T14:30:00Z"
  }
}
```

---

## llm.txt Format (Work in Progress 🚧)

::: warning Tooling Status
**llm.txt** is a markdown-based format for human-readable service documentation. Our tools do **not yet** parse or validate this format. Support is planned for future releases. You can serve llm.txt files for discovery, but use LLMFeed JSON for full tooling support.
:::

### What is llm.txt?

`llm.txt` is a proposed standard for providing human-readable (and LLM-readable) documentation about a website or service. It uses markdown format and is typically placed at:

- `/.well-known/llm.txt`
- `/llm.txt`

### Example llm.txt

```markdown
# Acme Analytics

> Real-time analytics and reporting for your applications

Acme Analytics provides powerful analytics APIs for tracking user behavior, generating reports, and visualizing data trends.

## Capabilities

- **Query API**: Execute SQL-like queries against your analytics data
- **Reports**: Generate PDF, CSV, or JSON formatted reports
- **Real-time**: Stream live analytics data via WebSocket

## Authentication

All API requests require a Bearer token. Get your API key from the dashboard.

## Documentation

- [API Reference](https://docs.acme.com/analytics/api)
- [Query Language Guide](https://docs.acme.com/analytics/query-language)
- [Getting Started](https://docs.acme.com/analytics/quickstart)

## Contact

- Email: api-support@acme.com
- Support: https://acme.com/support
```

### llm.txt vs LLMFeed JSON

| Feature | llm.txt | LLMFeed JSON |
|---------|---------|--------------|
| **Format** | Markdown | JSON |
| **Human Readable** | ✅ Excellent | ⚠️ Good |
| **Machine Parseable** | ⚠️ Requires parsing | ✅ Native |
| **Schema Validation** | 🚧 Coming soon | ✅ Full support |
| **Cryptographic Signing** | ❌ Not supported | ✅ Ed25519 |
| **Capability Schemas** | ❌ Not supported | ✅ JSON Schema |
| **Health Monitoring** | 🚧 Coming soon | ✅ Full support |
| **Best For** | Documentation | API integration |

### Recommended Approach

For maximum compatibility, we recommend providing **both formats**:

1. **LLMFeed JSON** (`/llmfeed.json` or `/.well-known/llmfeed.json`) for machine consumption with full tooling support
2. **llm.txt** (`/llm.txt` or `/.well-known/llm.txt`) for human readers and LLMs that prefer markdown

---

## Validation

Validate your LLMFeed JSON before publishing:

```bash
npx llmfeed-validate feed.json
```

The validator checks:
- Required fields are present (`feed_type`, `metadata.title`, `metadata.origin`, `metadata.description`)
- Field types match the schema
- URLs are valid format
- JSON Schema in capabilities is valid
- Signature matches (if present)

::: info llm.txt Validation
Validation for llm.txt format is not yet available. It's on our roadmap for future releases.
:::

## Best Practices

### 1. Be Descriptive

Write clear, detailed descriptions that help AI agents understand your service:

```json
// ❌ Bad
{ "metadata": { "description": "Search API" } }

// ✅ Good
{ "metadata": { "description": "Full-text search across our product catalog with filtering by category, price range, and availability. Returns paginated results with relevance scoring." } }
```

### 2. Document Parameters Thoroughly

Include descriptions and examples for all parameters:

```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query using our query language. Supports AND, OR, NOT operators and field-specific searches like 'category:electronics'",
        "examples": ["laptop", "category:electronics AND price:<1000"]
      }
    }
  }
}
```

### 3. Keep Items Updated

Regularly update the `items` array with your latest documentation:

```json
{
  "items": [
    {
      "title": "v2.0 Migration Guide",
      "url": "https://docs.example.com/migration",
      "published": "2025-11-15",
      "updated": "2025-12-01"
    }
  ]
}
```

### 4. Sign Your Feeds

Always sign production LLMFeed JSON feeds for trust and verification. See [Trust & Signatures](/guide/trust-signatures).

### 5. Provide Both Formats

For the best experience, serve both LLMFeed JSON (for tooling) and llm.txt (for humans):

```
https://example.com/llmfeed.json      # For tooling (validator, signer, etc.)
https://example.com/llm.txt           # For humans and LLMs (coming soon)
```
