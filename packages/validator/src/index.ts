/**
 * @webmcp/validator - LLMFeed Validation Library
 * 
 * Environment-agnostic validation for LLMFeed JSON files with
 * Ed25519 cryptographic signature verification.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface LLMFeedMetadata {
  title: string
  origin: string
  description: string
  lang?: string
  version?: string
  last_updated?: string
  topics?: string[]
  contact?: {
    email?: string
    github?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface AgentGuidance {
  on_load?: string
  interaction_tone?: string
  fallback?: string
  preferred_entrypoints?: string[]
  invocation_pattern?: unknown
  primary_actions?: Array<{
    action: string
    tool: string
    description: string
  }>
  [key: string]: unknown
}

export interface Capability {
  name: string
  type: string
  method?: string
  url?: string
  protocol?: string
  description: string
  inputSchema?: unknown
  outputSchema?: unknown
  [key: string]: unknown
}

export interface TrustBlock {
  signed_blocks?: string[]
  algorithm?: string
  public_key_hint?: string
  trust_level?: string
  scope?: string
  [key: string]: unknown
}

export interface Signature {
  value?: string
  created_at?: string
  [key: string]: unknown
}

export interface LLMFeed {
  feed_type: string
  metadata: LLMFeedMetadata
  agent_guidance?: AgentGuidance
  capabilities?: Capability[]
  site_capabilities?: unknown
  data?: unknown[]
  trust?: TrustBlock
  signature?: Signature
  [key: string]: unknown
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationError {
  type: 'structure' | 'schema' | 'signature' | 'format'
  field?: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  type: string
  message: string
  field?: string
}

export interface SignatureVerificationStep {
  step: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  details?: Record<string, unknown>
}

export interface SignatureIssue {
  type: 'critical' | 'warning' | 'info'
  code: string
  title: string
  description: string
  recommendation?: string
}

export interface SignatureVerificationResult {
  valid: boolean
  error?: string
  steps: SignatureVerificationStep[]
  signature?: {
    raw: string
    bytes: number
    validLength: boolean
    createdAt?: string
  }
  trust?: {
    algorithm: string
    signedBlocks: string[]
    publicKeyHint: string
    trustLevel?: string
  }
  publicKey?: {
    url: string
    fetchSuccess: boolean
    fetchError?: string
    bytes?: number
    validLength?: boolean
  }
  canonicalPayload?: {
    json: string
    bytes: number
    hash?: string
  }
  detectedIssues: SignatureIssue[]
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number
  signatureValid?: boolean
  signatureDiagnostics?: SignatureVerificationResult
}

// ============================================================================
// Validation Options
// ============================================================================

export interface ValidatorOptions {
  /**
   * Custom fetch function for environments without global fetch
   * (e.g., Node.js < 18, or for testing)
   */
  fetch?: typeof globalThis.fetch

  /**
   * Skip signature verification (useful for offline validation)
   */
  skipSignatureVerification?: boolean

  /**
   * Custom public key resolver (bypass fetching from public_key_hint)
   */
  publicKeyResolver?: (url: string) => Promise<string>

  /**
   * Timeout for network requests in milliseconds
   */
  timeout?: number
}

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Deep sort object keys recursively for canonical JSON
 */
export function deepSortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSortObject(item))
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort()
  const sorted: Record<string, unknown> = {}
  for (const key of sortedKeys) {
    sorted[key] = deepSortObject((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/**
 * Validate feed structure (required fields)
 */
export function validateFeedStructure(feed: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (!feed) {
    errors.push({
      type: 'structure',
      message: 'Feed is null or undefined',
      severity: 'error'
    })
    return errors
  }

  const f = feed as Record<string, unknown>

  if (!f.feed_type) {
    errors.push({
      type: 'structure',
      field: 'feed_type',
      message: 'Missing required field: feed_type',
      severity: 'error'
    })
  } else if (!['mcp', 'export', 'llm-index'].includes(f.feed_type as string)) {
    errors.push({
      type: 'structure',
      field: 'feed_type',
      message: `Invalid feed_type: ${f.feed_type}. Must be one of: mcp, export, llm-index`,
      severity: 'warning'
    })
  }

  if (!f.metadata) {
    errors.push({
      type: 'structure',
      field: 'metadata',
      message: 'Missing required field: metadata',
      severity: 'error'
    })
  } else {
    const meta = f.metadata as Record<string, unknown>
    
    if (!meta.title) {
      errors.push({
        type: 'structure',
        field: 'metadata.title',
        message: 'Missing required field: metadata.title',
        severity: 'error'
      })
    }
    
    if (!meta.origin) {
      errors.push({
        type: 'structure',
        field: 'metadata.origin',
        message: 'Missing required field: metadata.origin',
        severity: 'error'
      })
    } else {
      try {
        new URL(meta.origin as string)
      } catch {
        errors.push({
          type: 'format',
          field: 'metadata.origin',
          message: 'metadata.origin must be a valid URL',
          severity: 'error'
        })
      }
    }
    
    if (!meta.description) {
      errors.push({
        type: 'structure',
        field: 'metadata.description',
        message: 'Missing required field: metadata.description',
        severity: 'error'
      })
    }
  }

  return errors
}

/**
 * Validate capability schemas
 */
export function validateCapabilitySchemas(feed: LLMFeed): ValidationError[] {
  const errors: ValidationError[] = []

  if (!feed.capabilities || !Array.isArray(feed.capabilities)) {
    return errors
  }

  feed.capabilities.forEach((capability, index) => {
    if (!capability.name) {
      errors.push({
        type: 'schema',
        field: `capabilities[${index}].name`,
        message: `Capability at index ${index} missing required field: name`,
        severity: 'error'
      })
    }

    if (!capability.description) {
      errors.push({
        type: 'schema',
        field: `capabilities[${index}].description`,
        message: `Capability "${capability.name || index}" missing description`,
        severity: 'warning'
      })
    }

    if (capability.inputSchema) {
      try {
        if (typeof capability.inputSchema !== 'object') {
          throw new Error('inputSchema must be an object')
        }
        const schema = capability.inputSchema as Record<string, unknown>
        if (schema.type && schema.type !== 'object') {
          errors.push({
            type: 'schema',
            field: `capabilities[${index}].inputSchema.type`,
            message: `Capability "${capability.name}" inputSchema should typically be type "object"`,
            severity: 'warning'
          })
        }
      } catch (error) {
        errors.push({
          type: 'schema',
          field: `capabilities[${index}].inputSchema`,
          message: `Invalid inputSchema for capability "${capability.name}": ${error}`,
          severity: 'error'
        })
      }
    }
  })

  return errors
}

/**
 * Base64 to Uint8Array conversion
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Handle both browser (atob) and Node.js (Buffer)
  if (typeof atob === 'function') {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  } else {
    // Node.js environment
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
}

/**
 * Parse PEM public key to raw bytes
 */
export function pemToPublicKey(pem: string): Uint8Array {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '')

  const bytes = base64ToUint8Array(pemContents)

  // SPKI format for Ed25519 is 44 bytes (12 byte header + 32 byte key)
  if (bytes.length === 44) {
    return bytes.slice(-32)
  }

  return bytes.slice(-32)
}

/**
 * Compute SHA-256 hash
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Detect common signing implementation bugs
 */
export function detectSigningIssues(
  feed: LLMFeed,
  canonicalPayload: string,
  signedBlocks: string[]
): SignatureIssue[] {
  const issues: SignatureIssue[] = []
  const parsed = JSON.parse(canonicalPayload) as Record<string, unknown>

  for (const block of signedBlocks) {
    const blockData = parsed[block]
    if (blockData !== undefined) {
      const originalBlock = feed[block]

      if (typeof originalBlock === 'object' && originalBlock !== null) {
        const originalStr = JSON.stringify(originalBlock)
        const canonicalBlockStr = JSON.stringify(blockData)

        // Detect 25x.codes-style bug: JSON.stringify(obj, keysArray) strips nested content
        if (originalStr.length > 50 && canonicalBlockStr.length < originalStr.length * 0.3) {
          issues.push({
            type: 'critical',
            code: 'EMPTY_NESTED_CONTENT',
            title: 'Possible broken canonical JSON implementation',
            description: `The "${block}" block in the signed payload appears to have empty nested objects. ` +
              `Original block has ${originalStr.length} characters but canonical only has ${canonicalBlockStr.length}. ` +
              `This is often caused by using JSON.stringify(obj, keysArray) which treats the array as a whitelist filter.`,
            recommendation: 'Use a proper deep-sort function that preserves all nested content. ' +
              'The signing server should sort keys recursively, not use JSON.stringify replacer parameter.'
          })
        }

        // Check for empty array items
        if (Array.isArray(blockData) && blockData.length > 0 && Array.isArray(originalBlock)) {
          const emptyItems = blockData.filter((item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            Object.keys(item as Record<string, unknown>).length === 0
          )
          if (emptyItems.length > 0 && originalBlock[0] && typeof originalBlock[0] === 'object' && Object.keys(originalBlock[0] as Record<string, unknown>).length > 0) {
            issues.push({
              type: 'critical',
              code: 'EMPTY_ARRAY_ITEMS',
              title: 'Array items contain empty objects',
              description: `The "${block}" array has ${emptyItems.length} empty object(s) that should contain data.`,
              recommendation: 'The signing implementation is stripping nested object content.'
            })
          }
        }
      }
    }
  }

  // Check signature age
  if (feed.signature?.created_at) {
    const signedDate = new Date(feed.signature.created_at)
    const now = new Date()
    const daysSinceSigning = (now.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceSigning > 365) {
      issues.push({
        type: 'warning',
        code: 'OLD_SIGNATURE',
        title: 'Signature is over a year old',
        description: `Feed was signed ${Math.floor(daysSinceSigning)} days ago on ${signedDate.toISOString()}`,
        recommendation: 'Consider re-signing the feed periodically.'
      })
    }
  }

  // Check for missing blocks
  for (const block of signedBlocks) {
    if (feed[block] === undefined) {
      issues.push({
        type: 'warning',
        code: 'MISSING_SIGNED_BLOCK',
        title: `Declared signed block "${block}" is missing`,
        description: `The trust.signed_blocks array includes "${block}" but this field doesn't exist.`,
        recommendation: 'Either add the missing block or remove it from signed_blocks.'
      })
    }
  }

  return issues
}

/**
 * Verify Ed25519 signature using Web Crypto API
 */
async function verifyEd25519Native(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  try {
    // Build SPKI format key
    const spkiHeader = new Uint8Array([
      0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
    ])
    const spkiKey = new Uint8Array(spkiHeader.length + publicKey.length)
    spkiKey.set(spkiHeader)
    spkiKey.set(publicKey, spkiHeader.length)

    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      spkiKey,
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    return await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signature,
      message
    )
  } catch (error) {
    console.error('Ed25519 verification error:', error)
    return false
  }
}

/**
 * Verify Ed25519 signature with comprehensive diagnostics
 */
export async function verifyEd25519Signature(
  feed: LLMFeed,
  options: ValidatorOptions = {}
): Promise<SignatureVerificationResult> {
  const fetchFn = options.fetch || globalThis.fetch
  const result: SignatureVerificationResult = {
    valid: false,
    steps: [],
    detectedIssues: []
  }

  // Step 1: Check trust block
  if (!feed.trust) {
    result.steps.push({
      step: 'Check trust block',
      status: 'failed',
      message: 'Missing trust block in feed'
    })
    result.error = 'Missing trust block'
    return result
  }

  result.trust = {
    algorithm: feed.trust.algorithm || 'unknown',
    signedBlocks: feed.trust.signed_blocks || [],
    publicKeyHint: feed.trust.public_key_hint || '',
    trustLevel: feed.trust.trust_level
  }

  result.steps.push({
    step: 'Check trust block',
    status: 'success',
    message: 'Trust block found',
    details: { algorithm: result.trust.algorithm, signedBlocks: result.trust.signedBlocks }
  })

  // Step 2: Check signature
  if (!feed.signature) {
    result.steps.push({
      step: 'Check signature block',
      status: 'failed',
      message: 'Missing signature block in feed'
    })
    result.error = 'Missing signature block'
    return result
  }

  result.steps.push({
    step: 'Check signature block',
    status: 'success',
    message: 'Signature block found',
    details: { createdAt: feed.signature.created_at }
  })

  // Step 3: Verify algorithm
  if (feed.trust.algorithm !== 'Ed25519') {
    result.steps.push({
      step: 'Verify algorithm',
      status: 'failed',
      message: `Unsupported algorithm: ${feed.trust.algorithm}. Only Ed25519 is supported.`
    })
    result.error = `Unsupported algorithm: ${feed.trust.algorithm}`
    return result
  }

  result.steps.push({
    step: 'Verify algorithm',
    status: 'success',
    message: 'Algorithm is Ed25519 ✓'
  })

  // Step 4: Decode signature
  if (!feed.signature.value) {
    result.steps.push({
      step: 'Check signature value',
      status: 'failed',
      message: 'Missing signature.value field'
    })
    result.error = 'Missing signature value'
    return result
  }

  let signatureBytes: Uint8Array
  try {
    signatureBytes = base64ToUint8Array(feed.signature.value)
    result.signature = {
      raw: feed.signature.value,
      bytes: signatureBytes.length,
      validLength: signatureBytes.length === 64,
      createdAt: feed.signature.created_at
    }

    if (signatureBytes.length !== 64) {
      result.steps.push({
        step: 'Decode signature',
        status: 'failed',
        message: `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`
      })
      result.error = `Invalid signature length: ${signatureBytes.length} bytes (expected 64)`
      result.detectedIssues.push({
        type: 'critical',
        code: 'INVALID_SIGNATURE_LENGTH',
        title: 'Signature has wrong byte length',
        description: `Ed25519 signatures must be exactly 64 bytes.`,
        recommendation: 'Check the signing process.'
      })
      return result
    }

    result.steps.push({
      step: 'Decode signature',
      status: 'success',
      message: 'Signature decoded: 64 bytes ✓'
    })
  } catch (error) {
    result.steps.push({
      step: 'Decode signature',
      status: 'failed',
      message: `Invalid base64 signature: ${error}`
    })
    result.error = `Invalid base64 signature: ${error}`
    return result
  }

  // Step 5: Check signed_blocks
  const signedBlocks = feed.trust.signed_blocks || []
  if (signedBlocks.length === 0) {
    result.steps.push({
      step: 'Check signed_blocks',
      status: 'failed',
      message: 'No signed_blocks specified in trust block'
    })
    result.error = 'No signed_blocks specified'
    return result
  }

  result.steps.push({
    step: 'Check signed_blocks',
    status: 'success',
    message: `Signed blocks: ${signedBlocks.join(', ')}`
  })

  // Step 6: Build canonical payload
  const payloadParts: Record<string, unknown> = {}
  for (const block of signedBlocks) {
    if (feed[block] !== undefined) {
      payloadParts[block] = feed[block]
    }
  }

  const sortedPayload = deepSortObject(payloadParts)
  const canonicalPayload = JSON.stringify(sortedPayload)
  const payloadHash = await sha256(canonicalPayload)

  result.canonicalPayload = {
    json: canonicalPayload,
    bytes: new TextEncoder().encode(canonicalPayload).length,
    hash: payloadHash
  }

  result.steps.push({
    step: 'Build canonical payload',
    status: 'success',
    message: `Built canonical JSON payload (${result.canonicalPayload.bytes} bytes)`,
    details: {
      bytes: result.canonicalPayload.bytes,
      sha256: payloadHash,
      includedBlocks: Object.keys(payloadParts)
    }
  })

  // Detect signing issues
  const signingIssues = detectSigningIssues(feed, canonicalPayload, signedBlocks)
  result.detectedIssues.push(...signingIssues)

  // Step 7: Check public_key_hint
  if (!feed.trust.public_key_hint) {
    result.steps.push({
      step: 'Check public_key_hint',
      status: 'failed',
      message: 'Missing public_key_hint for verification'
    })
    result.error = 'Missing public_key_hint'
    return result
  }

  result.publicKey = {
    url: feed.trust.public_key_hint,
    fetchSuccess: false
  }

  result.steps.push({
    step: 'Check public_key_hint',
    status: 'success',
    message: `Public key URL: ${feed.trust.public_key_hint}`
  })

  // Step 8: Fetch public key
  let publicKeyPem: string
  try {
    if (options.publicKeyResolver) {
      publicKeyPem = await options.publicKeyResolver(feed.trust.public_key_hint)
    } else {
      const controller = new AbortController()
      const timeoutId = options.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : undefined

      const response = await fetchFn(feed.trust.public_key_hint, {
        signal: controller.signal
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      publicKeyPem = await response.text()
    }

    result.publicKey.fetchSuccess = true

    if (!publicKeyPem.includes('BEGIN PUBLIC KEY')) {
      result.steps.push({
        step: 'Fetch public key',
        status: 'failed',
        message: 'Invalid public key format (missing PEM headers)'
      })
      result.error = 'Invalid public key format'
      return result
    }

    result.steps.push({
      step: 'Fetch public key',
      status: 'success',
      message: 'Public key fetched successfully'
    })
  } catch (error) {
    result.publicKey.fetchError = String(error)
    result.steps.push({
      step: 'Fetch public key',
      status: 'failed',
      message: `Failed to fetch public key: ${error}`
    })
    result.error = `Failed to fetch public key: ${error}`
    return result
  }

  // Step 9: Parse public key
  let publicKeyBytes: Uint8Array
  try {
    publicKeyBytes = pemToPublicKey(publicKeyPem)
    result.publicKey.bytes = publicKeyBytes.length
    result.publicKey.validLength = publicKeyBytes.length === 32

    if (publicKeyBytes.length !== 32) {
      result.steps.push({
        step: 'Parse public key',
        status: 'failed',
        message: `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`
      })
      result.error = `Invalid public key length: ${publicKeyBytes.length}`
      return result
    }

    result.steps.push({
      step: 'Parse public key',
      status: 'success',
      message: 'Public key parsed: 32 bytes ✓'
    })
  } catch (error) {
    result.steps.push({
      step: 'Parse public key',
      status: 'failed',
      message: `Failed to parse public key: ${error}`
    })
    result.error = `Failed to parse public key: ${error}`
    return result
  }

  // Step 10: Verify signature
  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(canonicalPayload)

  try {
    const isValid = await verifyEd25519Native(messageBytes, signatureBytes, publicKeyBytes)

    if (isValid) {
      result.valid = true
      result.steps.push({
        step: 'Verify signature',
        status: 'success',
        message: 'Signature verification PASSED ✓'
      })
    } else {
      result.steps.push({
        step: 'Verify signature',
        status: 'failed',
        message: 'Signature verification FAILED - signature does not match payload'
      })
      result.error = 'Signature verification failed'

      if (result.detectedIssues.some(i => i.code === 'EMPTY_NESTED_CONTENT' || i.code === 'EMPTY_ARRAY_ITEMS')) {
        result.detectedIssues.push({
          type: 'info',
          code: 'SIGNING_BUG_LIKELY_CAUSE',
          title: 'Signing implementation bug is likely cause',
          description: 'The signature verification failed and we detected empty nested objects in the payload.',
          recommendation: 'Contact the feed provider to fix their signing implementation.'
        })
      }
    }
  } catch (error) {
    result.steps.push({
      step: 'Verify signature',
      status: 'failed',
      message: `Verification threw error: ${error}`
    })
    result.error = `Verification failed: ${error}`
  }

  return result
}

/**
 * Main validation function
 */
export async function validateLLMFeed(
  feed: unknown,
  options: ValidatorOptions = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Structure validation
  const structureErrors = validateFeedStructure(feed)
  errors.push(...structureErrors)

  // Schema validation
  const schemaErrors = validateCapabilitySchemas(feed as LLMFeed)
  errors.push(...schemaErrors)

  const f = feed as LLMFeed

  // Completeness warnings
  if (!f.capabilities || f.capabilities.length === 0) {
    warnings.push({
      type: 'completeness',
      message: 'Feed has no capabilities defined',
      field: 'capabilities'
    })
  }

  if (!f.trust || !f.signature) {
    warnings.push({
      type: 'security',
      message: 'Feed is not cryptographically signed'
    })
  }

  // Signature verification
  let signatureValid: boolean | undefined = undefined
  let signatureDiagnostics: SignatureVerificationResult | undefined = undefined

  if (f.trust && f.signature && !options.skipSignatureVerification) {
    const sigResult = await verifyEd25519Signature(f, options)
    signatureValid = sigResult.valid
    signatureDiagnostics = sigResult

    if (!sigResult.valid) {
      let errorMessage = sigResult.error || 'Signature verification failed'
      const criticalIssues = sigResult.detectedIssues.filter(i => i.type === 'critical')
      if (criticalIssues.length > 0) {
        errorMessage += `. Detected issue: ${criticalIssues[0].title}`
      }

      errors.push({
        type: 'signature',
        field: 'signature',
        message: errorMessage,
        severity: 'error'
      })
    }

    // Add warnings for non-critical issues
    const warningIssues = sigResult.detectedIssues.filter(i => i.type === 'warning')
    for (const issue of warningIssues) {
      warnings.push({
        type: 'signature',
        message: `${issue.title}: ${issue.description}`,
        field: issue.code
      })
    }
  }

  // Calculate score
  const errorCount = errors.filter(e => e.severity === 'error').length
  const warningCount = warnings.length

  let score = 100
  score -= errorCount * 20
  score -= warningCount * 5
  
  // Signature penalties/bonuses (aligned with github-action)
  if (signatureValid === true) {
    score += 10  // Bonus for verified signature
  } else if (signatureValid === false) {
    score -= 50  // Failed signature verification
  } else if (!f.trust || !f.signature) {
    score -= 30  // Unsigned feed penalty
  }
  
  score = Math.max(0, Math.min(100, score))

  return {
    valid: errorCount === 0,
    errors,
    warnings,
    score,
    signatureValid,
    signatureDiagnostics
  }
}

/**
 * Fetch an LLMFeed from URL
 */
export async function fetchLLMFeed(
  input: string,
  options: ValidatorOptions = {}
): Promise<LLMFeed> {
  const fetchFn = options.fetch || globalThis.fetch

  let url = input.trim()

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  if (!url.endsWith('.json') && !url.includes('/.well-known/')) {
    url = url.replace(/\/$/, '') + '/.well-known/mcp.llmfeed.json'
  }

  const controller = new AbortController()
  const timeoutId = options.timeout
    ? setTimeout(() => controller.abort(), options.timeout)
    : undefined

  const response = await fetchFn(url, { signal: controller.signal })

  if (timeoutId) clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<LLMFeed>
}
