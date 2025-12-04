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
    [key: string]: any
  }
  [key: string]: any
}

export interface AgentGuidance {
  on_load?: string
  interaction_tone?: string
  fallback?: string
  preferred_entrypoints?: string[]
  invocation_pattern?: any
  primary_actions?: Array<{
    action: string
    tool: string
    description: string
  }>
  [key: string]: any
}

export interface Capability {
  name: string
  type: string
  method?: string
  url?: string
  protocol?: string
  description: string
  inputSchema?: any
  outputSchema?: any
  [key: string]: any
}

export interface TrustBlock {
  signed_blocks?: string[]
  algorithm?: string
  public_key_hint?: string
  trust_level?: string
  scope?: string
  [key: string]: any
}

export interface Signature {
  value?: string
  created_at?: string
  [key: string]: any
}

export interface LLMFeed {
  feed_type: string
  metadata: LLMFeedMetadata
  agent_guidance?: AgentGuidance
  capabilities?: Capability[]
  site_capabilities?: any
  data?: any[]
  trust?: TrustBlock
  signature?: Signature
  [key: string]: any
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number
  signatureValid?: boolean
  signatureDiagnostics?: SignatureVerificationResult
}

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

/**
 * Comprehensive signature verification result with detailed diagnostics
 */
export interface SignatureVerificationResult {
  valid: boolean
  error?: string
  
  // Step-by-step verification status
  steps: SignatureVerificationStep[]
  
  // Signature details
  signature?: {
    raw: string
    bytes: number
    validLength: boolean
    createdAt?: string
  }
  
  // Trust block details
  trust?: {
    algorithm: string
    signedBlocks: string[]
    publicKeyHint: string
    trustLevel?: string
  }
  
  // Public key fetch status
  publicKey?: {
    url: string
    fetchSuccess: boolean
    fetchError?: string
    bytes?: number
    validLength?: boolean
  }
  
  // Canonical payload info - critical for debugging
  canonicalPayload?: {
    json: string
    bytes: number
    hash?: string  // SHA-256 of payload for comparison
  }
  
  // Detected issues and recommendations
  detectedIssues: SignatureIssue[]
}

export interface SignatureVerificationStep {
  step: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  details?: Record<string, any>
}

export interface SignatureIssue {
  type: 'critical' | 'warning' | 'info'
  code: string
  title: string
  description: string
  recommendation?: string
}

export interface RAGIndexEntry {
  id: string
  type: 'capability' | 'metadata' | 'guidance'
  name: string
  description: string
  metadata: {
    origin: string
    feed_type: string
    [key: string]: any
  }
  embedContent: string
  schema?: any
}

export function validateFeedStructure(feed: any): ValidationError[] {
  const errors: ValidationError[] = []

  if (!feed) {
    errors.push({
      type: 'structure',
      message: 'Feed is null or undefined',
      severity: 'error'
    })
    return errors
  }

  if (!feed.feed_type) {
    errors.push({
      type: 'structure',
      field: 'feed_type',
      message: 'Missing required field: feed_type',
      severity: 'error'
    })
  } else if (!['mcp', 'export', 'llm-index'].includes(feed.feed_type)) {
    errors.push({
      type: 'structure',
      field: 'feed_type',
      message: `Invalid feed_type: ${feed.feed_type}. Must be one of: mcp, export, llm-index`,
      severity: 'warning'
    })
  }

  if (!feed.metadata) {
    errors.push({
      type: 'structure',
      field: 'metadata',
      message: 'Missing required field: metadata',
      severity: 'error'
    })
  } else {
    if (!feed.metadata.title) {
      errors.push({
        type: 'structure',
        field: 'metadata.title',
        message: 'Missing required field: metadata.title',
        severity: 'error'
      })
    }
    if (!feed.metadata.origin) {
      errors.push({
        type: 'structure',
        field: 'metadata.origin',
        message: 'Missing required field: metadata.origin',
        severity: 'error'
      })
    } else {
      try {
        new URL(feed.metadata.origin)
      } catch {
        errors.push({
          type: 'format',
          field: 'metadata.origin',
          message: 'metadata.origin must be a valid URL',
          severity: 'error'
        })
      }
    }
    if (!feed.metadata.description) {
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
        if (capability.inputSchema.type && capability.inputSchema.type !== 'object') {
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

function deepSortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSortObject(item))
  }

  const sortedKeys = Object.keys(obj).sort()
  const sorted: Record<string, any> = {}
  for (const key of sortedKeys) {
    sorted[key] = deepSortObject(obj[key])
  }
  return sorted
}

/**
 * Detect common signing implementation bugs by analyzing the canonical payload
 */
function detectSigningIssues(
  feed: LLMFeed,
  canonicalPayload: string,
  signedBlocks: string[]
): SignatureIssue[] {
  const issues: SignatureIssue[] = []

  // Check for empty nested objects - common bug with JSON.stringify(obj, keys) misuse
  const parsed = JSON.parse(canonicalPayload)
  
  for (const block of signedBlocks) {
    const blockData = parsed[block]
    if (blockData !== undefined) {
      const originalBlock = feed[block]
      
      // Check if nested content is missing (the 25x.codes bug)
      if (typeof originalBlock === 'object' && originalBlock !== null) {
        const originalStr = JSON.stringify(originalBlock)
        const canonicalBlockStr = JSON.stringify(blockData)
        
        // If canonical is much smaller, likely has empty objects
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
        
        // Check for empty objects/arrays that should have content
        if (Array.isArray(blockData) && blockData.length > 0 && Array.isArray(originalBlock)) {
          const emptyItems = blockData.filter((item: any) => 
            typeof item === 'object' && 
            item !== null && 
            Object.keys(item).length === 0
          )
          if (emptyItems.length > 0 && originalBlock[0] && Object.keys(originalBlock[0]).length > 0) {
            issues.push({
              type: 'critical',
              code: 'EMPTY_ARRAY_ITEMS',
              title: 'Array items contain empty objects',
              description: `The "${block}" array has ${emptyItems.length} empty object(s) that should contain data. ` +
                `Original items have content, but signed payload has {} placeholders.`,
              recommendation: 'The signing implementation is stripping nested object content. ' +
                'Use recursive key sorting: function deepSort(obj) { if (Array.isArray(obj)) return obj.map(deepSort); ... }'
            })
          }
        }
      }
    }
  }

  // Check if signature timestamps suggest key rotation issues
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
        recommendation: 'Consider re-signing the feed periodically, especially if content has changed.'
      })
    }
  }

  // Check for missing blocks that are declared as signed
  for (const block of signedBlocks) {
    if (feed[block] === undefined) {
      issues.push({
        type: 'warning',
        code: 'MISSING_SIGNED_BLOCK',
        title: `Declared signed block "${block}" is missing`,
        description: `The trust.signed_blocks array includes "${block}" but this field doesn't exist in the feed.`,
        recommendation: 'Either add the missing block or remove it from signed_blocks.'
      })
    }
  }

  return issues
}

/**
 * Compute SHA-256 hash of a string for comparison
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyEd25519Signature(
  feed: LLMFeed
): Promise<SignatureVerificationResult> {
  const result: SignatureVerificationResult = {
    valid: false,
    steps: [],
    detectedIssues: []
  }

  // Step 1: Check for trust block
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

  // Step 2: Check for signature
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

  // Step 4: Check signature value
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
        message: `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`,
        details: { expected: 64, actual: signatureBytes.length }
      })
      result.error = `Invalid signature length: ${signatureBytes.length} bytes (expected 64)`
      result.detectedIssues.push({
        type: 'critical',
        code: 'INVALID_SIGNATURE_LENGTH',
        title: 'Signature has wrong byte length',
        description: `Ed25519 signatures must be exactly 64 bytes, but this signature is ${signatureBytes.length} bytes.`,
        recommendation: 'Check the signing process - the signature may be truncated or padded incorrectly.'
      })
      return result
    }

    result.steps.push({
      step: 'Decode signature',
      status: 'success',
      message: 'Signature decoded: 64 bytes ✓',
      details: { bytes: 64 }
    })
  } catch (error) {
    result.steps.push({
      step: 'Decode signature',
      status: 'failed',
      message: `Invalid base64 signature: ${error}`
    })
    result.error = `Invalid base64 signature: ${error}`
    result.detectedIssues.push({
      type: 'critical',
      code: 'INVALID_BASE64',
      title: 'Signature is not valid Base64',
      description: `The signature.value could not be decoded as Base64: ${error}`,
      recommendation: 'Ensure the signature is properly Base64 encoded without line breaks or invalid characters.'
    })
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
    result.error = 'No signed_blocks specified in trust block'
    result.detectedIssues.push({
      type: 'critical',
      code: 'EMPTY_SIGNED_BLOCKS',
      title: 'No blocks specified to sign',
      description: 'The trust.signed_blocks array is empty or missing.',
      recommendation: 'Add blocks to sign, typically: ["metadata", "capabilities", "agent_guidance"]'
    })
    return result
  }

  result.steps.push({
    step: 'Check signed_blocks',
    status: 'success',
    message: `Signed blocks: ${signedBlocks.join(', ')}`,
    details: { blocks: signedBlocks }
  })

  // Step 6: Build canonical payload
  const payloadParts: Record<string, any> = {}
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

  // Detect signing issues from the canonical payload
  const signingIssues = detectSigningIssues(feed, canonicalPayload, signedBlocks)
  result.detectedIssues.push(...signingIssues)

  // Step 7: Check public_key_hint
  if (!feed.trust.public_key_hint) {
    result.steps.push({
      step: 'Check public_key_hint',
      status: 'failed',
      message: 'Missing public_key_hint for verification'
    })
    result.error = 'Missing public_key_hint for verification'
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
    const response = await fetch(feed.trust.public_key_hint, {
      mode: 'cors',
      cache: 'no-cache'
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    publicKeyPem = await response.text()
    result.publicKey.fetchSuccess = true

    if (!publicKeyPem.includes('BEGIN PUBLIC KEY')) {
      result.steps.push({
        step: 'Fetch public key',
        status: 'failed',
        message: 'Invalid public key format (missing PEM headers)'
      })
      result.error = 'Invalid public key format (missing PEM headers)'
      result.detectedIssues.push({
        type: 'critical',
        code: 'INVALID_PEM_FORMAT',
        title: 'Public key is not in PEM format',
        description: 'The fetched key does not contain "BEGIN PUBLIC KEY" header.',
        recommendation: 'Ensure the public key file contains proper PEM format with BEGIN/END markers.'
      })
      return result
    }

    result.steps.push({
      step: 'Fetch public key',
      status: 'success',
      message: 'Public key fetched successfully',
      details: { url: feed.trust.public_key_hint }
    })
  } catch (error) {
    result.publicKey.fetchError = String(error)
    result.steps.push({
      step: 'Fetch public key',
      status: 'failed',
      message: `Failed to fetch public key: ${error}`,
      details: { url: feed.trust.public_key_hint, error: String(error) }
    })
    result.error = `Failed to fetch public key from ${feed.trust.public_key_hint}: ${error}`
    result.detectedIssues.push({
      type: 'critical',
      code: 'PUBLIC_KEY_FETCH_FAILED',
      title: 'Could not fetch public key',
      description: `Failed to fetch public key from ${feed.trust.public_key_hint}: ${error}`,
      recommendation: 'Ensure the public key URL is accessible with CORS enabled. Check for network issues or incorrect URL.'
    })
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
        message: `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`,
        details: { expected: 32, actual: publicKeyBytes.length }
      })
      result.error = `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}`
      return result
    }

    result.steps.push({
      step: 'Parse public key',
      status: 'success',
      message: 'Public key parsed: 32 bytes ✓',
      details: { bytes: 32 }
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
        message: 'Signature verification FAILED - signature does not match payload',
        details: {
          payloadHash,
          payloadBytes: messageBytes.length,
          signatureBytes: 64
        }
      })
      result.error = 'Signature verification failed - signature does not match'
      
      // Check if we detected signing issues that explain the failure
      if (result.detectedIssues.some(i => i.code === 'EMPTY_NESTED_CONTENT' || i.code === 'EMPTY_ARRAY_ITEMS')) {
        result.detectedIssues.push({
          type: 'info',
          code: 'SIGNING_BUG_LIKELY_CAUSE',
          title: 'Signing implementation bug is likely cause',
          description: 'The signature verification failed, and we detected that the canonical payload ' +
            'has empty nested objects. This strongly suggests the signing server has a bug in how it ' +
            'creates canonical JSON. The signature is probably valid, but it was computed over a broken payload.',
          recommendation: 'Contact the feed provider to fix their signing implementation. ' +
            'They should use a proper recursive deep-sort function, not JSON.stringify replacer.'
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

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function pemToPublicKey(pem: string): Uint8Array {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '')
  
  const binaryString = atob(pemContents)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  if (bytes.length === 44) {
    return bytes.slice(-32)
  }
  
  return bytes.slice(-32)
}

async function verifyEd25519Native(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  try {
    const spkiHeader = new Uint8Array([
      0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
    ])
    const spkiKey = new Uint8Array(spkiHeader.length + publicKey.length)
    spkiKey.set(spkiHeader)
    spkiKey.set(publicKey, spkiHeader.length)

    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      spkiKey,
      {
        name: 'Ed25519'
      },
      false,
      ['verify']
    )

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signature as BufferSource,
      message as BufferSource
    )

    return isValid
  } catch (error) {
    console.error('Ed25519 verification error:', error)
    return false
  }
}

export async function validateLLMFeed(feed: any): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const structureErrors = validateFeedStructure(feed)
  errors.push(...structureErrors)

  const schemaErrors = validateCapabilitySchemas(feed)
  errors.push(...schemaErrors)

  if (!feed.capabilities || feed.capabilities.length === 0) {
    warnings.push({
      type: 'completeness',
      message: 'Feed has no capabilities defined',
      field: 'capabilities'
    })
  }

  if (!feed.trust || !feed.signature) {
    warnings.push({
      type: 'security',
      message: 'Feed is not cryptographically signed (missing trust block or signature)'
    })
  }

  let signatureValid: boolean | undefined = undefined
  let signatureDiagnostics: SignatureVerificationResult | undefined = undefined

  if (feed.trust && feed.signature) {
    const sigResult = await verifyEd25519Signature(feed)
    signatureValid = sigResult.valid
    signatureDiagnostics = sigResult
    
    if (!sigResult.valid) {
      // Build a more helpful error message
      let errorMessage = sigResult.error || 'Signature verification failed'
      
      // If we detected specific issues, append them
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

  const errorCount = errors.filter(e => e.severity === 'error').length
  const warningCount = warnings.length

  let score = 100
  score -= errorCount * 20
  score -= warningCount * 5
  score = Math.max(0, Math.min(100, score))

  if (signatureValid === true) {
    score = Math.min(100, score + 10)
  }

  const valid = errorCount === 0

  return {
    valid,
    errors,
    warnings,
    score,
    signatureValid,
    signatureDiagnostics
  }
}

export function prepareForRAG(feed: LLMFeed): RAGIndexEntry[] {
  const entries: RAGIndexEntry[] = []

  if (feed.metadata) {
    entries.push({
      id: `${feed.metadata.origin}-metadata`,
      type: 'metadata',
      name: feed.metadata.title,
      description: feed.metadata.description,
      metadata: {
        origin: feed.metadata.origin,
        feed_type: feed.feed_type,
        topics: feed.metadata.topics || [],
        version: feed.metadata.version
      },
      embedContent: `${feed.metadata.title}: ${feed.metadata.description}. Topics: ${(feed.metadata.topics || []).join(', ')}`
    })
  }

  if (feed.agent_guidance?.on_load) {
    entries.push({
      id: `${feed.metadata.origin}-guidance`,
      type: 'guidance',
      name: 'Agent Guidance',
      description: feed.agent_guidance.on_load,
      metadata: {
        origin: feed.metadata.origin,
        feed_type: feed.feed_type,
        interaction_tone: feed.agent_guidance.interaction_tone
      },
      embedContent: feed.agent_guidance.on_load
    })
  }

  if (feed.capabilities) {
    feed.capabilities.forEach((capability, index) => {
      const inputFields = capability.inputSchema?.properties
        ? Object.keys(capability.inputSchema.properties).join(', ')
        : 'none'

      entries.push({
        id: `${feed.metadata.origin}-capability-${capability.name}`,
        type: 'capability',
        name: capability.name,
        description: capability.description,
        metadata: {
          origin: feed.metadata.origin,
          feed_type: feed.feed_type,
          method: capability.method,
          protocol: capability.protocol,
          url: capability.url
        },
        embedContent: `${capability.name}: ${capability.description}. Input fields: ${inputFields}`,
        schema: capability.inputSchema
      })
    })
  }

  return entries
}

export async function fetchLLMFeed(input: string): Promise<LLMFeed> {
  let url = input.trim()
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  if (!url.endsWith('.json') && !url.includes('/.well-known/')) {
    url = url.replace(/\/$/, '') + '/.well-known/mcp.llmfeed.json'
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`)
  }

  const feed = await response.json()
  return feed
}

export function calculateTokenEstimate(feed: LLMFeed): { total: number; perCapability: number } {
  const feedJson = JSON.stringify(feed)
  const total = Math.ceil(feedJson.length / 4)
  
  const perCapability = feed.capabilities?.length 
    ? Math.ceil(total / feed.capabilities.length)
    : 0

  return { total, perCapability }
}