/**
 * @webmcp/signer - LLMFeed Signing Library
 * 
 * Ed25519 key generation and cryptographic signing for LLMFeed JSON files.
 * Produces signatures compatible with the WebMCP ecosystem.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface KeyPair {
  /** Base64-encoded private key (PKCS#8 format, 48 bytes) */
  privateKey: string
  /** Base64-encoded public key (raw 32 bytes) */
  publicKey: string
  /** PEM-formatted public key for publishing */
  publicKeyPem: string
  /** PEM-formatted private key for secure storage */
  privateKeyPem: string
  /** Key creation timestamp */
  createdAt: string
}

export interface SigningOptions {
  /** Blocks to include in signature (defaults to all top-level keys except trust/signature) */
  signedBlocks?: string[]
  /** URL where the public key will be hosted */
  publicKeyUrl?: string
  /** Trust level descriptor */
  trustLevel?: string
  /** Trust scope descriptor */
  scope?: string
  /** Whether to add signature timestamp */
  addTimestamp?: boolean
}

export interface SignedFeed {
  /** The signed feed with trust and signature blocks added */
  feed: Record<string, unknown>
  /** The canonical JSON that was signed */
  canonicalPayload: string
  /** SHA-256 hash of the canonical payload */
  payloadHash: string
  /** Base64-encoded Ed25519 signature */
  signature: string
  /** Blocks that were signed */
  signedBlocks: string[]
}

export interface VerificationResult {
  valid: boolean
  error?: string
  signedBlocks?: string[]
  payloadHash?: string
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generate a new Ed25519 keypair for feed signing
 */
export async function generateKeyPair(): Promise<KeyPair> {
  // Generate Ed25519 keypair using Web Crypto API
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true, // extractable
    ['sign', 'verify']
  ) as CryptoKeyPair

  // Export private key in PKCS#8 format
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const privateKeyBytes = new Uint8Array(privateKeyBuffer)
  const privateKeyBase64 = uint8ArrayToBase64(privateKeyBytes)

  // Export public key in SPKI format, then extract raw 32 bytes
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const publicKeySpki = new Uint8Array(publicKeyBuffer)
  // SPKI for Ed25519 is 44 bytes (12 byte header + 32 byte key)
  const publicKeyRaw = publicKeySpki.slice(-32)
  const publicKeyBase64 = uint8ArrayToBase64(publicKeyRaw)

  // Create PEM formatted keys
  const privateKeyPem = formatPem(privateKeyBase64, 'PRIVATE KEY')
  const publicKeyPem = formatPem(uint8ArrayToBase64(publicKeySpki), 'PUBLIC KEY')

  return {
    privateKey: privateKeyBase64,
    publicKey: publicKeyBase64,
    publicKeyPem,
    privateKeyPem,
    createdAt: new Date().toISOString()
  }
}

/**
 * Load an existing keypair from base64-encoded private key
 */
export async function loadKeyPair(privateKeyBase64: string): Promise<KeyPair> {
  const privateKeyBytes = base64ToUint8Array(privateKeyBase64)
  
  let cryptoKey: CryptoKey
  
  if (privateKeyBytes.length === 48) {
    // PKCS#8 format
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'Ed25519' },
      true,
      ['sign']
    )
  } else if (privateKeyBytes.length === 32) {
    // Raw 32-byte seed - wrap in PKCS#8
    const pkcs8Header = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
      0x04, 0x22, 0x04, 0x20
    ])
    const pkcs8Key = new Uint8Array(pkcs8Header.length + 32)
    pkcs8Key.set(pkcs8Header)
    pkcs8Key.set(privateKeyBytes, pkcs8Header.length)
    
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      { name: 'Ed25519' },
      true,
      ['sign']
    )
  } else {
    throw new Error(`Invalid private key length: ${privateKeyBytes.length} (expected 32 or 48)`)
  }

  // Derive public key by exporting and re-importing
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', cryptoKey)
  const privateKeyExported = new Uint8Array(privateKeyBuffer)
  
  // Generate the keypair to get the public key
  // We need to sign something and use the verification to extract public key
  // Actually, we can derive it from the private key structure
  
  // For Ed25519, the private key PKCS#8 structure contains the seed
  // We need to generate the full keypair to get the public key
  const tempKeyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  )
  
  // Re-import with the actual private key
  const importedPrivate = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyExported,
    { name: 'Ed25519' },
    true,
    ['sign']
  )

  // For now, we'll just return the private key info
  // The public key needs to be provided separately or derived differently
  const privateKeyPem = formatPem(uint8ArrayToBase64(privateKeyExported), 'PRIVATE KEY')

  return {
    privateKey: uint8ArrayToBase64(privateKeyExported),
    publicKey: '', // Would need additional derivation
    publicKeyPem: '', // Would need additional derivation  
    privateKeyPem,
    createdAt: new Date().toISOString()
  }
}

// ============================================================================
// Feed Signing
// ============================================================================

/**
 * Deep sort object keys recursively for canonical JSON
 */
export function deepSortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepSortObject)
  
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = deepSortObject((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/**
 * Compute SHA-256 hash of a string
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse private key from various formats (PEM, base64, or raw)
 * Returns base64-encoded PKCS#8 key bytes
 */
function parsePrivateKey(input: string): Uint8Array {
  // Detect PEM format
  if (input.includes('-----BEGIN') && input.includes('PRIVATE KEY')) {
    const base64 = parsePem(input)
    return base64ToUint8Array(base64)
  }
  
  // Assume base64-encoded bytes
  return base64ToUint8Array(input)
}

/**
 * Sign an LLMFeed with Ed25519
 * 
 * @param feed - The feed object to sign
 * @param privateKey - Private key in PEM format, base64-encoded PKCS#8, or base64-encoded raw seed
 * @param options - Signing options
 */
export async function signFeed(
  feed: Record<string, unknown>,
  privateKey: string,
  options: SigningOptions = {}
): Promise<SignedFeed> {
  // Determine blocks to sign
  const excludeBlocks = ['trust', 'signature']
  const availableBlocks = Object.keys(feed).filter(k => !excludeBlocks.includes(k))
  const signedBlocks = options.signedBlocks || availableBlocks

  // Validate all specified blocks exist
  for (const block of signedBlocks) {
    if (feed[block] === undefined) {
      throw new Error(`Specified signed block "${block}" does not exist in feed`)
    }
  }

  // Build payload from signed blocks only
  const payload: Record<string, unknown> = {}
  for (const block of signedBlocks) {
    payload[block] = feed[block]
  }

  // Create canonical JSON (deep sorted, no whitespace)
  const sortedPayload = deepSortObject(payload)
  const canonicalPayload = JSON.stringify(sortedPayload)
  const payloadHash = await sha256(canonicalPayload)

  // Parse and import private key (handles PEM, base64 PKCS#8, or raw seed)
  const privateKeyBytes = parsePrivateKey(privateKey)
  let cryptoKey: CryptoKey

  if (privateKeyBytes.length === 48) {
    // PKCS#8 format (48 bytes)
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'Ed25519' },
      false,
      ['sign']
    )
  } else if (privateKeyBytes.length === 32) {
    // Raw seed - wrap in PKCS#8
    const pkcs8Header = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
      0x04, 0x22, 0x04, 0x20
    ])
    const pkcs8Key = new Uint8Array(pkcs8Header.length + 32)
    pkcs8Key.set(pkcs8Header)
    pkcs8Key.set(privateKeyBytes, pkcs8Header.length)

    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      { name: 'Ed25519' },
      false,
      ['sign']
    )
  } else {
    throw new Error(`Invalid private key length: ${privateKeyBytes.length}. Expected 32 (raw seed), 48 (PKCS#8), or PEM format.`)
  }

  // Sign the canonical payload
  const encoder = new TextEncoder()
  const data = encoder.encode(canonicalPayload)
  const signatureBuffer = await crypto.subtle.sign('Ed25519', cryptoKey, data)
  const signature = uint8ArrayToBase64(new Uint8Array(signatureBuffer))

  // Build the signed feed
  const signedFeed: Record<string, unknown> = { ...feed }

  // Add trust block
  signedFeed.trust = {
    signed_blocks: signedBlocks,
    algorithm: 'Ed25519',
    ...(options.publicKeyUrl && { public_key_hint: options.publicKeyUrl }),
    ...(options.trustLevel && { trust_level: options.trustLevel }),
    ...(options.scope && { scope: options.scope })
  }

  // Add signature block
  signedFeed.signature = {
    value: signature,
    ...(options.addTimestamp !== false && { created_at: new Date().toISOString() })
  }

  return {
    feed: signedFeed,
    canonicalPayload,
    payloadHash,
    signature,
    signedBlocks
  }
}

/**
 * Verify an LLMFeed signature
 */
export async function verifyFeed(
  feed: Record<string, unknown>,
  publicKeyBase64: string
): Promise<VerificationResult> {
  try {
    // Check required blocks
    const trust = feed.trust as Record<string, unknown> | undefined
    const sig = feed.signature as Record<string, unknown> | undefined

    if (!trust) {
      return { valid: false, error: 'Missing trust block' }
    }
    if (!sig) {
      return { valid: false, error: 'Missing signature block' }
    }

    const signedBlocks = trust.signed_blocks as string[] | undefined
    if (!signedBlocks || signedBlocks.length === 0) {
      return { valid: false, error: 'Missing or empty signed_blocks' }
    }

    const signatureValue = sig.value as string | undefined
    if (!signatureValue) {
      return { valid: false, error: 'Missing signature value' }
    }

    // Build payload from signed blocks
    const payload: Record<string, unknown> = {}
    for (const block of signedBlocks) {
      if (feed[block] !== undefined) {
        payload[block] = feed[block]
      }
    }

    // Create canonical JSON
    const sortedPayload = deepSortObject(payload)
    const canonicalPayload = JSON.stringify(sortedPayload)
    const payloadHash = await sha256(canonicalPayload)

    // Decode signature and public key
    const signatureBytes = base64ToUint8Array(signatureValue)
    const publicKeyBytes = base64ToUint8Array(publicKeyBase64)

    if (signatureBytes.length !== 64) {
      return { valid: false, error: `Invalid signature length: ${signatureBytes.length}` }
    }

    // Build SPKI format for public key if raw
    let publicKeySpki: Uint8Array
    if (publicKeyBytes.length === 32) {
      const spkiHeader = new Uint8Array([
        0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
      ])
      publicKeySpki = new Uint8Array(spkiHeader.length + 32)
      publicKeySpki.set(spkiHeader)
      publicKeySpki.set(publicKeyBytes, spkiHeader.length)
    } else if (publicKeyBytes.length === 44) {
      publicKeySpki = publicKeyBytes
    } else {
      return { valid: false, error: `Invalid public key length: ${publicKeyBytes.length}` }
    }

    // Import public key
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      publicKeySpki,
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    // Verify signature
    const encoder = new TextEncoder()
    const data = encoder.encode(canonicalPayload)
    const valid = await crypto.subtle.verify('Ed25519', cryptoKey, signatureBytes, data)

    return {
      valid,
      signedBlocks,
      payloadHash,
      ...(valid ? {} : { error: 'Signature verification failed' })
    }
  } catch (error) {
    return { valid: false, error: String(error) }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Node.js environment
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  // Browser environment
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Node.js environment
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  // Browser environment
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Format a base64 key as PEM
 */
export function formatPem(base64: string, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string {
  const lines: string[] = []
  lines.push(`-----BEGIN ${type}-----`)
  
  // Split into 64-character lines
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64))
  }
  
  lines.push(`-----END ${type}-----`)
  return lines.join('\n')
}

/**
 * Parse PEM to base64
 */
export function parsePem(pem: string): string {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '')
}

/**
 * Extract raw public key from PEM
 */
export function pemToPublicKey(pem: string): Uint8Array {
  const base64 = parsePem(pem)
  const bytes = base64ToUint8Array(base64)
  
  // SPKI format for Ed25519 is 44 bytes (12 byte header + 32 byte key)
  if (bytes.length === 44) {
    return bytes.slice(-32)
  }
  if (bytes.length === 32) {
    return bytes
  }
  
  throw new Error(`Unexpected public key length: ${bytes.length}`)
}
