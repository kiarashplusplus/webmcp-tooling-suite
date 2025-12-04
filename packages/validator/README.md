# @webmcp/validator

LLMFeed validation library with Ed25519 cryptographic signature verification.

## Features

- ✅ **Structure validation** — Validates required fields (feed_type, metadata, capabilities)
- ✅ **Schema validation** — Validates capability schemas
- ✅ **Ed25519 signatures** — Full cryptographic signature verification
- ✅ **Diagnostics** — Detailed step-by-step verification diagnostics
- ✅ **Bug detection** — Automatically detects common signing implementation bugs
- ✅ **CLI included** — Validate feeds from the command line
- ✅ **Zero dependencies** — Uses native Web Crypto API

## Installation

```bash
npm install @webmcp/validator
```

## CLI Usage

```bash
# Validate from URL (auto-discovers .well-known path)
npx @webmcp/validator example.com

# Validate full URL
npx @webmcp/validator https://example.com/.well-known/mcp.llmfeed.json

# Validate local file
npx @webmcp/validator ./my-feed.json

# JSON output (for CI/CD)
npx @webmcp/validator example.com --json

# Skip signature verification
npx @webmcp/validator example.com --skip-signature

# Verbose output
npx @webmcp/validator example.com --verbose
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Feed is valid |
| 1 | Feed is invalid (has errors) |
| 2 | Could not fetch or parse feed |

## Programmatic Usage

```typescript
import { validateLLMFeed, fetchLLMFeed } from '@webmcp/validator'

// Validate from URL
const feed = await fetchLLMFeed('https://example.com')
const result = await validateLLMFeed(feed)

console.log(result.valid)          // true/false
console.log(result.score)          // 0-100
console.log(result.signatureValid) // true/false/undefined
console.log(result.errors)         // ValidationError[]
console.log(result.warnings)       // ValidationWarning[]

// With options
const result = await validateLLMFeed(feed, {
  skipSignatureVerification: true,
  timeout: 5000
})
```

### Signature Diagnostics

When signature verification fails, detailed diagnostics are available:

```typescript
const result = await validateLLMFeed(feed)

if (!result.signatureValid && result.signatureDiagnostics) {
  const diag = result.signatureDiagnostics
  
  // Step-by-step verification status
  for (const step of diag.steps) {
    console.log(`${step.status}: ${step.message}`)
  }
  
  // Detected issues with recommendations
  for (const issue of diag.detectedIssues) {
    console.log(`[${issue.code}] ${issue.title}`)
    console.log(`  Recommendation: ${issue.recommendation}`)
  }
  
  // Canonical payload for debugging
  console.log('Canonical JSON:', diag.canonicalPayload?.json)
  console.log('SHA-256:', diag.canonicalPayload?.hash)
}
```

### Custom Fetch / Node.js

For environments without global `fetch` or for testing:

```typescript
import { validateLLMFeed } from '@webmcp/validator'

const result = await validateLLMFeed(feed, {
  fetch: customFetchFunction,
  publicKeyResolver: async (url) => {
    // Return PEM-encoded public key string
    return '-----BEGIN PUBLIC KEY-----\n...'
  }
})
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Validate LLMFeed
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx @webmcp/validator ./mcp.llmfeed.json --json > validation.json
      - run: |
          if [ $(jq '.valid' validation.json) != "true" ]; then
            echo "Feed validation failed!"
            jq '.errors' validation.json
            exit 1
          fi
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
npx @webmcp/validator ./mcp.llmfeed.json --quiet
```

## API Reference

### `validateLLMFeed(feed, options?)`

Validates an LLMFeed object.

**Parameters:**
- `feed: unknown` — The feed object to validate
- `options?: ValidatorOptions`
  - `fetch?: typeof fetch` — Custom fetch function
  - `skipSignatureVerification?: boolean` — Skip signature checks
  - `publicKeyResolver?: (url: string) => Promise<string>` — Custom key resolver
  - `timeout?: number` — Network timeout in ms

**Returns:** `Promise<ValidationResult>`

### `fetchLLMFeed(input, options?)`

Fetches an LLMFeed from a URL.

**Parameters:**
- `input: string` — URL, domain, or file path
- `options?: ValidatorOptions`

**Returns:** `Promise<LLMFeed>`

### `verifyEd25519Signature(feed, options?)`

Verifies Ed25519 signature with detailed diagnostics.

**Returns:** `Promise<SignatureVerificationResult>`

## Types

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number
  signatureValid?: boolean
  signatureDiagnostics?: SignatureVerificationResult
}

interface ValidationError {
  type: 'structure' | 'schema' | 'signature' | 'format'
  field?: string
  message: string
  severity: 'error' | 'warning'
}

interface SignatureVerificationResult {
  valid: boolean
  error?: string
  steps: SignatureVerificationStep[]
  canonicalPayload?: { json: string; bytes: number; hash?: string }
  detectedIssues: SignatureIssue[]
  // ... more fields
}
```

## License

MIT
