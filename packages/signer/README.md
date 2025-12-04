# @25xcodes/llmfeed-signer

Ed25519 key generation and LLMFeed signing tool for the WebMCP ecosystem.

## Installation

```bash
npm install @25xcodes/llmfeed-signer
```

Or use directly with npx:

```bash
npx @25xcodes/llmfeed-signer keygen
```

## CLI Usage

### Generate Keypair

Generate a new Ed25519 keypair for feed signing:

```bash
# Generate keys in ./keys directory
llmfeed-sign keygen

# Custom output directory and name
llmfeed-sign keygen --output ./my-keys --name mysite
```

This creates:
- `mysite.private.pem` - Private key (keep secret!)
- `mysite.public.pem` - Public key (publish to your server)
- `mysite.private.base64` - Base64 key for environment variables

### Sign a Feed

Sign an LLMFeed JSON file:

```bash
# Basic signing
llmfeed-sign sign mcp.llmfeed.json --key ./keys/mysite.private.pem

# With public key URL (recommended)
llmfeed-sign sign mcp.llmfeed.json \
  --key ./keys/mysite.private.pem \
  --public-url https://example.com/.well-known/public.pem

# Sign specific blocks only
llmfeed-sign sign feed.json \
  --key private.pem \
  --blocks metadata,capabilities,agent_guidance

# Modify in place
llmfeed-sign sign feed.json --key private.pem --in-place
```

### Verify a Signature

Verify a signed feed:

```bash
# With local public key
llmfeed-sign verify signed.json --key ./keys/mysite.public.pem

# Auto-fetch from public_key_hint in feed
llmfeed-sign verify signed.json

# JSON output for scripting
llmfeed-sign verify signed.json --json
```

## Library Usage

```typescript
import {
  generateKeyPair,
  signFeed,
  verifyFeed,
} from '@25xcodes/llmfeed-signer'

// Generate keypair
const keyPair = await generateKeyPair()
console.log(keyPair.publicKeyPem)  // PEM for publishing
console.log(keyPair.privateKey)    // Base64 for env vars

// Sign a feed
const feed = {
  feed_type: 'mcp',
  metadata: {
    title: 'My API',
    origin: 'https://example.com',
    description: 'My awesome API'
  },
  capabilities: [/* ... */]
}

const signed = await signFeed(feed, keyPair.privateKey, {
  publicKeyUrl: 'https://example.com/.well-known/public.pem',
  signedBlocks: ['metadata', 'capabilities'],
  trustLevel: 'self-signed'
})

console.log(signed.feed)           // Feed with trust & signature blocks
console.log(signed.signature)      // Base64 Ed25519 signature
console.log(signed.payloadHash)    // SHA-256 of canonical payload

// Verify a feed
const result = await verifyFeed(signed.feed, keyPair.publicKey)
console.log(result.valid)          // true
console.log(result.signedBlocks)   // ['metadata', 'capabilities']
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Sign LLMFeed

on:
  push:
    paths:
      - 'mcp.llmfeed.json'

jobs:
  sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Sign feed
        env:
          MCP_PRIVATE_KEY: ${{ secrets.MCP_PRIVATE_KEY }}
        run: |
          npx @25xcodes/llmfeed-signer sign mcp.llmfeed.json \
            --key <(echo "$MCP_PRIVATE_KEY") \
            --public-url https://example.com/.well-known/public.pem \
            --in-place
      
      - name: Commit signed feed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add mcp.llmfeed.json
          git commit -m "chore: re-sign LLMFeed" || exit 0
          git push
```

### Cloudflare Workers

```typescript
// Sign at request time
import { signFeed } from '@25xcodes/llmfeed-signer'

export default {
  async fetch(request: Request, env: Env) {
    const manifest = buildManifest()
    
    const signed = await signFeed(manifest, env.MCP_PRIVATE_KEY, {
      publicKeyUrl: 'https://example.com/.well-known/public.pem'
    })
    
    return new Response(JSON.stringify(signed.feed, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

## Security Notes

1. **Never commit private keys** - Use environment variables or secrets management
2. **Rotate keys periodically** - Generate new keypairs and update signatures
3. **Verify before trusting** - Always verify signatures before consuming feed data
4. **Use HTTPS** - Host public keys only over HTTPS

## API Reference

### `generateKeyPair(): Promise<KeyPair>`

Generate a new Ed25519 keypair.

### `signFeed(feed, privateKey, options?): Promise<SignedFeed>`

Sign an LLMFeed with Ed25519.

Options:
- `signedBlocks?: string[]` - Blocks to include (default: all except trust/signature)
- `publicKeyUrl?: string` - URL for public_key_hint
- `trustLevel?: string` - Trust level descriptor
- `addTimestamp?: boolean` - Add created_at (default: true)

### `verifyFeed(feed, publicKey): Promise<VerificationResult>`

Verify a signed feed's signature.

### `deepSortObject(obj): unknown`

Deep sort object keys for canonical JSON.

## License

MIT
