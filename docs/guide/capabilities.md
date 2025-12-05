# Capabilities

Capabilities are the heart of your LLMFeed—they describe what your service can do and how AI agents can interact with it.

::: info Format Support
Capability schemas with JSON Schema validation are fully supported in **LLMFeed JSON** format. The **llm.txt** markdown format does not support structured capability definitions—use LLMFeed JSON for rich capability metadata.
:::

## What Are Capabilities?

Capabilities are machine-callable functions that your service exposes. Each capability describes:

- **What** it does (name, description)
- **How** to call it (endpoint, method, parameters)
- **What** it returns (response schema)
- **Constraints** (rate limits, authentication)

## Capability Structure

```json
{
  "capabilities": [
    {
      "name": "searchProducts",
      "description": "Search our product catalog",
      "endpoint": "/api/v1/products/search",
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
          }
        },
        "required": ["query"]
      },
      "response": {
        "type": "object",
        "properties": {
          "products": {
            "type": "array",
            "items": { "$ref": "#/definitions/Product" }
          }
        }
      },
      "rateLimit": {
        "requests": 100,
        "window": "1m"
      }
    }
  ]
}
```

## Writing Good Capabilities

### 1. Clear Naming

Use descriptive, action-oriented names:

```json
// ❌ Bad
{ "name": "data" }
{ "name": "api1" }
{ "name": "doStuff" }

// ✅ Good
{ "name": "searchProducts" }
{ "name": "createOrder" }
{ "name": "getCustomerHistory" }
```

### 2. Detailed Descriptions

Help AI agents understand when to use each capability:

```json
{
  "name": "searchProducts",
  "description": "Search the product catalog by keyword, category, or attributes. Returns paginated results sorted by relevance. Use this when users want to find products matching specific criteria. Supports fuzzy matching and filters for price, brand, and availability."
}
```

### 3. Complete Parameter Schemas

Use JSON Schema to fully describe parameters:

```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search keywords",
        "minLength": 1,
        "maxLength": 500,
        "examples": ["wireless headphones", "laptop under $1000"]
      },
      "filters": {
        "type": "object",
        "description": "Optional filters to narrow results",
        "properties": {
          "category": {
            "type": "string",
            "description": "Product category",
            "enum": ["electronics", "clothing", "home", "sports"]
          },
          "priceRange": {
            "type": "object",
            "properties": {
              "min": { "type": "number", "minimum": 0 },
              "max": { "type": "number", "minimum": 0 }
            }
          },
          "inStock": {
            "type": "boolean",
            "description": "Only show in-stock items",
            "default": false
          }
        }
      },
      "pagination": {
        "type": "object",
        "properties": {
          "page": { "type": "integer", "minimum": 1, "default": 1 },
          "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20 }
        }
      }
    },
    "required": ["query"]
  }
}
```

### 4. Response Schemas

Document what the API returns:

```json
{
  "response": {
    "type": "object",
    "properties": {
      "products": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string" },
            "name": { "type": "string" },
            "price": { "type": "number" },
            "description": { "type": "string" },
            "imageUrl": { "type": "string", "format": "uri" },
            "inStock": { "type": "boolean" }
          }
        }
      },
      "pagination": {
        "type": "object",
        "properties": {
          "total": { "type": "integer" },
          "page": { "type": "integer" },
          "totalPages": { "type": "integer" }
        }
      }
    }
  }
}
```

## Authentication

Specify how agents should authenticate:

### Bearer Token

```json
{
  "authentication": {
    "type": "bearer",
    "header": "Authorization"
  }
}
```

### API Key

```json
{
  "authentication": {
    "type": "apiKey",
    "header": "X-API-Key"
  }
}
```

### OAuth 2.0

```json
{
  "authentication": {
    "type": "oauth2",
    "flows": {
      "clientCredentials": {
        "tokenUrl": "https://auth.example.com/oauth/token",
        "scopes": {
          "read:products": "Read product data",
          "write:orders": "Create orders"
        }
      }
    }
  }
}
```

### No Authentication

```json
{
  "authentication": {
    "type": "none"
  }
}
```

## Rate Limiting

Help agents respect your limits:

```json
{
  "rateLimit": {
    "requests": 100,
    "window": "1m",
    "scope": "user"
  }
}
```

| Field | Description |
|-------|-------------|
| `requests` | Maximum requests allowed |
| `window` | Time window (e.g., "1m", "1h", "1d") |
| `scope` | Rate limit scope: "global", "user", "ip" |

## Capability Categories

### Read Operations

```json
{
  "name": "getProduct",
  "description": "Get details for a specific product",
  "method": "GET",
  "endpoint": "/api/products/{id}",
  "parameters": {
    "type": "object",
    "properties": {
      "id": { "type": "string", "description": "Product ID" }
    },
    "required": ["id"]
  }
}
```

### Search Operations

```json
{
  "name": "searchProducts",
  "description": "Search products with filters",
  "method": "POST",
  "endpoint": "/api/products/search",
  "parameters": { ... }
}
```

### Write Operations

```json
{
  "name": "createOrder",
  "description": "Create a new order",
  "method": "POST",
  "endpoint": "/api/orders",
  "parameters": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "productId": { "type": "string" },
            "quantity": { "type": "integer", "minimum": 1 }
          },
          "required": ["productId", "quantity"]
        }
      },
      "shippingAddress": { "$ref": "#/definitions/Address" }
    },
    "required": ["items", "shippingAddress"]
  }
}
```

### Action Operations

```json
{
  "name": "sendNotification",
  "description": "Send a notification to a user",
  "method": "POST",
  "endpoint": "/api/notifications",
  "parameters": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" },
      "message": { "type": "string", "maxLength": 1000 },
      "channel": { "type": "string", "enum": ["email", "sms", "push"] }
    },
    "required": ["userId", "message", "channel"]
  }
}
```

## Schema Validation

The validator checks your capability schemas:

```typescript
import { validateCapabilitySchemas } from '@25xcodes/llmfeed-validator'

const result = validateCapabilitySchemas(feed.capabilities)

if (!result.valid) {
  console.error('Schema errors:', result.errors)
}
```

Common validation checks:
- JSON Schema is valid
- Required fields are present
- Types are correct
- Enums have valid values

## Best Practices

### 1. Group Related Capabilities

```json
{
  "capabilities": [
    // Product capabilities
    { "name": "searchProducts", ... },
    { "name": "getProduct", ... },
    { "name": "getProductReviews", ... },
    
    // Order capabilities
    { "name": "createOrder", ... },
    { "name": "getOrder", ... },
    { "name": "cancelOrder", ... }
  ]
}
```

### 2. Version Your API

Include version in endpoints:

```json
{
  "endpoint": "/api/v1/products/search"
}
```

### 3. Document Errors

Include error responses:

```json
{
  "response": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "data": { ... }
        }
      },
      {
        "type": "object",
        "properties": {
          "error": {
            "type": "object",
            "properties": {
              "code": { "type": "string" },
              "message": { "type": "string" }
            }
          }
        }
      }
    ]
  }
}
```

### 4. Use Semantic Naming

Follow consistent naming conventions:
- `get*` - Retrieve a single resource
- `list*` - Retrieve multiple resources
- `search*` - Search with filters
- `create*` - Create new resource
- `update*` - Update existing resource
- `delete*` - Delete resource
