# LLMFeed Validator User Guide

## Overview

The LLMFeed Validator is a comprehensive tool for validating any `.llmfeed.json` file with full Ed25519 cryptographic signature verification support.

## Features

### 1. Universal Feed Support
- **From URL**: Enter any URL hosting a `.llmfeed.json` file
- **From Paste**: Directly paste JSON content
- **From File**: Upload local `.json` or `.llmfeed.json` files

### 2. Comprehensive Validation

#### Structural Validation
- Verifies required fields: `feed_type`, `metadata.title`, `metadata.origin`, `metadata.description`
- Validates feed_type against allowed values: `mcp`, `export`, `llm-index`
- Checks URL format for `metadata.origin`

#### Schema Validation
- Validates all capability definitions
- Checks for required capability fields (`name`, `description`)
- Validates `inputSchema` format and structure
- Ensures JSON Schema compliance

#### Ed25519 Signature Verification
**Full cryptographic trust verification including:**

1. **Trust Block Validation**
   - Checks for presence of `trust` block
   - Verifies `algorithm` is set to `Ed25519`
   - Validates `signed_blocks` array
   - Checks for `public_key_hint` URL

2. **Signature Validation**
   - Confirms `signature.value` exists
   - Decodes Base64 signature
   - Verifies signature length (must be exactly 64 bytes)

3. **Public Key Retrieval**
   - Fetches public key from `public_key_hint` URL
   - Parses PEM format (SPKI)
   - Extracts 32-byte Ed25519 public key

4. **Payload Construction**
   - Extracts fields specified in `signed_blocks`
   - Deep sorts all object keys for canonical form
   - JSON stringifies for consistent byte representation

5. **Cryptographic Verification**
   - Uses Web Crypto API's native Ed25519 implementation
   - Verifies signature matches signed payload
   - Returns detailed error on failure

### 3. Results Display

#### Security Score (0-100)
- Starts at 100
- -20 points per error
- -5 points per warning
- +10 bonus for valid signature

#### Signature Verification Status
- ✅ **Valid**: Green check with confirmation message
- ❌ **Invalid**: Red warning with specific error details

#### Error Reporting
- Categorized by type: `structure`, `schema`, `signature`, `format`
- Shows affected field path (e.g., `capabilities[0].inputSchema`)
- Provides actionable error messages

#### Warning Reporting
- Non-critical issues
- Best practice recommendations
- Optional field suggestions

## Ed25519 Signature Requirements

### Feed Structure
```json
{
  "feed_type": "mcp",
  "metadata": { ... },
  "capabilities": [ ... ],
  "trust": {
    "signed_blocks": ["metadata", "capabilities"],
    "algorithm": "Ed25519",
    "public_key_hint": "https://example.com/.well-known/public-key.pem",
    "trust_level": "high"
  },
  "signature": {
    "value": "BASE64_ENCODED_64_BYTE_SIGNATURE",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Public Key Format (PEM/SPKI)
```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
-----END PUBLIC KEY-----
```

### Signature Generation Process
1. Extract the blocks specified in `signed_blocks` (e.g., `metadata`, `capabilities`)
2. Create an object with only those blocks
3. Deep sort all object keys recursively
4. JSON.stringify the sorted object
5. Sign the UTF-8 encoded bytes with Ed25519 private key
6. Base64 encode the 64-byte signature
7. Store in `signature.value`

### Payload Canonicalization
The validator uses **deterministic JSON** by:
- Recursively sorting all object keys alphabetically
- Preserving array order
- Using standard JSON.stringify (no pretty printing)

Example:
```javascript
// Original (any key order)
{ "capabilities": [...], "metadata": {...} }

// Canonical (sorted keys)
{ "capabilities": [...], "metadata": {...} }
```

## Signature Debugger

When signature verification fails, the **Signature Debugger** provides:

- ✅ Trust block presence
- ✅ Signature presence  
- ✅ Algorithm check
- ✅ Signed blocks list
- ✅ Public key URL accessibility test
- ✅ Signature length validation (64 bytes)
- ✅ **Canonical payload display** - Shows the exact string that should have been signed
- ✅ Copy functionality for debugging

## Common Errors

### "Missing trust block or signature"
**Cause**: Feed doesn't include `trust` and/or `signature` blocks  
**Fix**: Add both blocks if you want cryptographic verification

### "Unsupported algorithm: X"
**Cause**: `trust.algorithm` is not `Ed25519`  
**Fix**: Set `trust.algorithm` to `"Ed25519"`

### "Invalid signature length: expected 64 bytes, got X"
**Cause**: Ed25519 signatures must be exactly 64 bytes  
**Fix**: Check signature generation - Ed25519 always produces 64-byte signatures

### "Invalid base64 signature"
**Cause**: `signature.value` is not valid Base64  
**Fix**: Use proper Base64 encoding (not Base64URL)

### "Failed to fetch public key from ..."
**Cause**: `public_key_hint` URL is unreachable or has CORS issues  
**Fix**: Ensure public key is accessible and CORS-enabled

### "Invalid public key format (missing PEM headers)"
**Cause**: Public key doesn't have PEM format headers  
**Fix**: Use proper PEM format with `-----BEGIN PUBLIC KEY-----` headers

### "Invalid public key length: expected 32 bytes, got X"
**Cause**: After extracting from SPKI, key is not 32 bytes  
**Fix**: Ensure you're using an Ed25519 public key (not RSA or ECDSA)

### "Signature verification failed - signature does not match"
**Cause**: Signature doesn't match the canonical payload  
**Fix**: Check payload construction - use the Signature Debugger to see the exact canonical payload that should have been signed

## Security Recommendations

### DO:
- ✅ Always include `trust` and `signature` blocks
- ✅ Use Ed25519 algorithm
- ✅ Host public keys at stable URLs with CORS enabled
- ✅ Sign only necessary blocks (typically `metadata` and `capabilities`)
- ✅ Use proper PEM/SPKI format for public keys
- ✅ Include `created_at` timestamp in signature block

### DON'T:
- ❌ Don't sign the `signature` block itself
- ❌ Don't include the `trust` block in `signed_blocks`
- ❌ Don't use custom JSON formatting (always use canonical form)
- ❌ Don't rely on unsigned feeds for production
- ❌ Don't use expired or rotated keys

## Example Valid Feed

```json
{
  "feed_type": "mcp",
  "metadata": {
    "title": "Example MCP Server",
    "origin": "https://example.com",
    "description": "A sample MCP server for testing",
    "version": "1.0.0"
  },
  "capabilities": [
    {
      "name": "greet",
      "type": "tool",
      "description": "Greet a user by name",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name to greet"
          }
        },
        "required": ["name"]
      }
    }
  ],
  "trust": {
    "signed_blocks": ["metadata", "capabilities"],
    "algorithm": "Ed25519",
    "public_key_hint": "https://example.com/.well-known/public-key.pem",
    "trust_level": "high"
  },
  "signature": {
    "value": "R3JlYXRTaWduYXR1cmVIZXJlV2l0aDY0Qnl0ZXNPZkVkMjU1MTlTaWduYXR1cmU=",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Browser Compatibility

The validator uses the **Web Crypto API** for Ed25519 verification, which requires:

- ✅ Chrome 93+
- ✅ Edge 93+
- ✅ Firefox 113+
- ✅ Safari 16+

Modern browsers have native Ed25519 support - no external libraries needed!

## Testing

To test the validator:

1. **Valid Feed**: Use the "Load Example" button in the Paste JSON tab
2. **Invalid Structure**: Remove required fields like `metadata.title`
3. **Invalid Schema**: Add a capability without a `name` field
4. **Signature Testing**: Add `trust` and `signature` blocks and verify

## API Reference

### Main Function

```typescript
async function validateLLMFeed(feed: any): Promise<ValidationResult>
```

**Returns:**
```typescript
{
  valid: boolean              // Overall validation status
  errors: ValidationError[]   // All errors found
  warnings: ValidationWarning[] // Non-critical issues
  score: number               // Security score (0-100)
  signatureValid?: boolean    // Ed25519 verification result (if applicable)
}
```

### Signature Verification

```typescript
async function verifyEd25519Signature(
  feed: LLMFeed
): Promise<{ valid: boolean; error?: string }>
```

**Process:**
1. Validates trust block structure
2. Fetches public key from hint URL
3. Constructs canonical payload
4. Verifies signature using Web Crypto API
5. Returns validation result with error details

## Support

For issues or questions:
- GitHub: [webmcp-tooling-suite](https://github.com/kiarashplusplus/webmcp-tooling-suite)
- Created by: [Kiarash Adl](https://25x.codes/)
