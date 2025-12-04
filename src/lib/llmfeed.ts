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

export async function verifyEd25519Signature(
  feed: LLMFeed
): Promise<{ valid: boolean; error?: string }> {
  if (!feed.trust || !feed.signature) {
    return { valid: false, error: 'Missing trust block or signature' }
  }

  if (feed.trust.algorithm !== 'Ed25519') {
    return { valid: false, error: `Unsupported algorithm: ${feed.trust.algorithm}` }
  }

  if (!feed.signature.value) {
    return { valid: false, error: 'Missing signature value' }
  }

  try {
    const signedBlocks = feed.trust.signed_blocks || []
    if (signedBlocks.length === 0) {
      return { valid: false, error: 'No signed_blocks specified in trust block' }
    }

    const payloadParts: Record<string, any> = {}
    
    for (const block of signedBlocks) {
      if (feed[block] !== undefined) {
        payloadParts[block] = feed[block]
      }
    }

    const sortedKeys = Object.keys(payloadParts).sort()
    const sortedPayload: Record<string, any> = {}
    for (const key of sortedKeys) {
      sortedPayload[key] = payloadParts[key]
    }

    const canonicalPayload = JSON.stringify(sortedPayload)
    
    const encoder = new TextEncoder()
    const messageBytes = encoder.encode(canonicalPayload)
    
    let signatureBytes: Uint8Array
    try {
      signatureBytes = base64ToUint8Array(feed.signature.value)
      if (signatureBytes.length !== 64) {
        return { valid: false, error: `Invalid signature length: expected 64 bytes, got ${signatureBytes.length}` }
      }
    } catch (error) {
      return { valid: false, error: `Invalid base64 signature: ${error}` }
    }

    if (!feed.trust.public_key_hint) {
      return { valid: false, error: 'Missing public_key_hint for verification' }
    }

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
      
      if (!publicKeyPem.includes('BEGIN PUBLIC KEY')) {
        return { valid: false, error: 'Invalid public key format (missing PEM headers)' }
      }
    } catch (error) {
      return { valid: false, error: `Failed to fetch public key from ${feed.trust.public_key_hint}: ${error}` }
    }

    let publicKeyBytes: Uint8Array
    try {
      publicKeyBytes = pemToPublicKey(publicKeyPem)
      if (publicKeyBytes.length !== 32) {
        return { valid: false, error: `Invalid public key length: expected 32 bytes, got ${publicKeyBytes.length}` }
      }
    } catch (error) {
      return { valid: false, error: `Failed to parse public key: ${error}` }
    }
    
    const isValid = await verifyEd25519Native(messageBytes, signatureBytes, publicKeyBytes)
    
    return { valid: isValid, error: isValid ? undefined : 'Signature verification failed - signature does not match' }
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error}` }
  }
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

  if (feed.trust && feed.signature) {
    const sigResult = await verifyEd25519Signature(feed)
    signatureValid = sigResult.valid
    if (!sigResult.valid) {
      errors.push({
        type: 'signature',
        field: 'signature',
        message: sigResult.error || 'Signature verification failed',
        severity: 'error'
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
    signatureValid
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

export async function fetchLLMFeed(domain: string): Promise<LLMFeed> {
  let url = domain.trim()
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  
  if (!url.includes('/.well-known/mcp.llmfeed.json')) {
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