/**
 * GitHub Action: Validate LLMFeed
 * 
 * Validates LLMFeed JSON files with Ed25519 signature verification.
 * Can be used in CI/CD pipelines to ensure feed integrity.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'

// ============================================================================
// Types (inlined from @webmcp/validator for self-contained action)
// ============================================================================

interface LLMFeed {
  feed_type: string
  metadata: {
    title: string
    origin: string
    description: string
    [key: string]: unknown
  }
  capabilities?: Array<{
    name: string
    type: string
    description: string
    [key: string]: unknown
  }>
  trust?: {
    signed_blocks?: string[]
    algorithm?: string
    public_key_hint?: string
    [key: string]: unknown
  }
  signature?: {
    value?: string
    created_at?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface ValidationError {
  type: 'structure' | 'schema' | 'signature' | 'format'
  field?: string
  message: string
  severity: 'error' | 'warning'
}

interface ValidationResult {
  valid: boolean
  securityScore: number
  errors: ValidationError[]
  warnings: Array<{ type: string; message: string; field?: string }>
  signatureStatus: 'verified' | 'failed' | 'skipped' | 'unsigned'
  feed?: LLMFeed
}

// ============================================================================
// Validation Logic (inlined for self-contained action)
// ============================================================================

function deepSortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepSortObject)
  
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = deepSortObject((obj as Record<string, unknown>)[key])
  }
  return sorted
}

function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

function pemToPublicKey(pem: string): Uint8Array {
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '')

  const bytes = base64ToUint8Array(pemContents)
  // SPKI format for Ed25519 is 44 bytes (12 byte header + 32 byte key)
  return bytes.slice(-32)
}

async function verifyEd25519(
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
      spkiKey.buffer as ArrayBuffer,
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    return await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signature.buffer as ArrayBuffer,
      message.buffer as ArrayBuffer
    )
  } catch (error) {
    core.debug(`Ed25519 verification error: ${error}`)
    return false
  }
}

function validateStructure(feed: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (!feed || typeof feed !== 'object') {
    errors.push({ type: 'structure', message: 'Feed is not a valid object', severity: 'error' })
    return errors
  }

  const f = feed as Record<string, unknown>

  if (!f.feed_type) {
    errors.push({ type: 'structure', field: 'feed_type', message: 'Missing required field: feed_type', severity: 'error' })
  }

  if (!f.metadata) {
    errors.push({ type: 'structure', field: 'metadata', message: 'Missing required field: metadata', severity: 'error' })
  } else {
    const meta = f.metadata as Record<string, unknown>
    if (!meta.title) {
      errors.push({ type: 'structure', field: 'metadata.title', message: 'Missing required field: metadata.title', severity: 'error' })
    }
    if (!meta.origin) {
      errors.push({ type: 'structure', field: 'metadata.origin', message: 'Missing required field: metadata.origin', severity: 'error' })
    }
    if (!meta.description) {
      errors.push({ type: 'structure', field: 'metadata.description', message: 'Missing required field: metadata.description', severity: 'error' })
    }
  }

  return errors
}

async function verifySignature(
  feed: LLMFeed,
  timeout: number
): Promise<{ valid: boolean; error?: string }> {
  if (!feed.trust) {
    return { valid: false, error: 'Missing trust block' }
  }
  if (!feed.signature?.value) {
    return { valid: false, error: 'Missing signature value' }
  }
  if (!feed.trust.public_key_hint) {
    return { valid: false, error: 'Missing public_key_hint' }
  }

  const signedBlocks = feed.trust.signed_blocks || []
  if (signedBlocks.length === 0) {
    return { valid: false, error: 'No signed_blocks specified' }
  }

  // Build canonical payload
  const payload: Record<string, unknown> = {}
  for (const block of signedBlocks) {
    if (feed[block] !== undefined) {
      payload[block] = feed[block]
    }
  }

  const sortedPayload = deepSortObject(payload)
  const canonicalPayload = JSON.stringify(sortedPayload)

  // Decode signature
  const signatureBytes = base64ToUint8Array(feed.signature.value)
  if (signatureBytes.length !== 64) {
    return { valid: false, error: `Invalid signature length: ${signatureBytes.length}` }
  }

  // Fetch public key
  let publicKeyPem: string
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(feed.trust.public_key_hint, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return { valid: false, error: `Failed to fetch public key: HTTP ${response.status}` }
    }
    publicKeyPem = await response.text()
  } catch (error) {
    return { valid: false, error: `Failed to fetch public key: ${error}` }
  }

  // Parse and verify
  const publicKeyBytes = pemToPublicKey(publicKeyPem)
  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(canonicalPayload)

  const isValid = await verifyEd25519(messageBytes, signatureBytes, publicKeyBytes)
  return { valid: isValid, error: isValid ? undefined : 'Signature verification failed' }
}

async function validateFeed(
  feed: unknown,
  options: { skipSignature: boolean; timeout: number }
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: Array<{ type: string; message: string; field?: string }> = []

  // Structure validation
  const structureErrors = validateStructure(feed)
  errors.push(...structureErrors)

  if (structureErrors.some(e => e.severity === 'error')) {
    return {
      valid: false,
      securityScore: 0,
      errors,
      warnings,
      signatureStatus: 'skipped'
    }
  }

  const f = feed as LLMFeed

  // Capability validation
  if (!f.capabilities || f.capabilities.length === 0) {
    warnings.push({ type: 'completeness', message: 'Feed has no capabilities defined', field: 'capabilities' })
  }

  // Signature verification
  let signatureStatus: 'verified' | 'failed' | 'skipped' | 'unsigned' = 'unsigned'
  
  if (!f.trust || !f.signature) {
    warnings.push({ type: 'security', message: 'Feed is not cryptographically signed' })
  } else if (options.skipSignature) {
    signatureStatus = 'skipped'
  } else {
    const sigResult = await verifySignature(f, options.timeout)
    if (sigResult.valid) {
      signatureStatus = 'verified'
    } else {
      signatureStatus = 'failed'
      errors.push({
        type: 'signature',
        field: 'signature',
        message: sigResult.error || 'Signature verification failed',
        severity: 'error'
      })
    }
  }

  // Calculate security score
  let securityScore = 100
  const hasErrors = errors.filter(e => e.severity === 'error').length
  const hasWarnings = warnings.length

  if (hasErrors > 0) securityScore -= hasErrors * 20
  if (hasWarnings > 0) securityScore -= hasWarnings * 5
  if (signatureStatus === 'unsigned') securityScore -= 30
  if (signatureStatus === 'failed') securityScore -= 50
  securityScore = Math.max(0, Math.min(100, securityScore))

  return {
    valid: hasErrors === 0 && signatureStatus !== 'failed',
    securityScore,
    errors,
    warnings,
    signatureStatus,
    feed: f
  }
}

// ============================================================================
// Badge Generation
// ============================================================================

function generateBadgeSvg(
  status: 'passing' | 'failing' | 'warning',
  label: string,
  message: string
): string {
  const colors = {
    passing: '#4c1',
    failing: '#e05d44',
    warning: '#dfb317'
  }

  const color = colors[status]
  const labelWidth = label.length * 6.5 + 10
  const messageWidth = message.length * 6.5 + 10
  const totalWidth = labelWidth + messageWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${message}</text>
  </g>
</svg>`
}

// ============================================================================
// Main Action
// ============================================================================

async function run(): Promise<void> {
  try {
    // Get inputs
    const feedInput = core.getInput('feed', { required: true })
    const failOnWarning = core.getInput('fail-on-warning') === 'true'
    const skipSignature = core.getInput('skip-signature') === 'true'
    const timeout = parseInt(core.getInput('timeout') || '10000', 10)
    const createBadge = core.getInput('create-badge') === 'true'
    const badgePath = core.getInput('badge-path') || '.github/badges/llmfeed-status.svg'

    core.info(`🔍 Validating LLMFeed: ${feedInput}`)

    // Load feed
    let feedContent: string
    let feed: unknown

    if (feedInput.startsWith('http://') || feedInput.startsWith('https://')) {
      // Fetch from URL
      core.info(`Fetching from URL...`)
      const response = await fetch(feedInput, {
        signal: AbortSignal.timeout(timeout)
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: HTTP ${response.status}`)
      }
      feedContent = await response.text()
    } else {
      // Read local file
      const filePath = resolve(process.cwd(), feedInput)
      core.info(`Reading local file: ${filePath}`)
      if (!existsSync(filePath)) {
        throw new Error(`Feed file not found: ${filePath}`)
      }
      feedContent = readFileSync(filePath, 'utf-8')
    }

    // Parse JSON
    try {
      feed = JSON.parse(feedContent)
    } catch (e) {
      throw new Error(`Invalid JSON: ${e}`)
    }

    // Validate
    const result = await validateFeed(feed, { skipSignature, timeout })

    // Set outputs
    core.setOutput('valid', result.valid.toString())
    core.setOutput('security-score', result.securityScore.toString())
    core.setOutput('signature-status', result.signatureStatus)
    core.setOutput('errors', JSON.stringify(result.errors))
    core.setOutput('warnings', JSON.stringify(result.warnings))
    
    if (result.feed) {
      core.setOutput('feed-title', result.feed.metadata?.title || '')
      core.setOutput('capabilities-count', (result.feed.capabilities?.length || 0).toString())
    }

    // Log results
    core.info('')
    if (result.valid) {
      core.info(`✅ Feed Status: VALID`)
    } else {
      core.error(`❌ Feed Status: INVALID`)
    }
    core.info(`   Security Score: ${result.securityScore}/100`)
    core.info(`   Signature: ${result.signatureStatus}`)

    if (result.errors.length > 0) {
      core.info('')
      core.info('Errors:')
      for (const error of result.errors) {
        core.error(`  • ${error.message}${error.field ? ` (${error.field})` : ''}`)
      }
    }

    if (result.warnings.length > 0) {
      core.info('')
      core.info('Warnings:')
      for (const warning of result.warnings) {
        core.warning(`  • ${warning.message}${warning.field ? ` (${warning.field})` : ''}`)
      }
    }

    // Generate badge
    if (createBadge) {
      const badgeStatus = result.valid ? 'passing' : 'failing'
      const badgeMessage = result.valid 
        ? `${result.securityScore}/100` 
        : 'invalid'
      const badgeSvg = generateBadgeSvg(badgeStatus, 'LLMFeed', badgeMessage)
      
      const fullBadgePath = resolve(process.cwd(), badgePath)
      const badgeDir = dirname(fullBadgePath)
      
      if (!existsSync(badgeDir)) {
        mkdirSync(badgeDir, { recursive: true })
      }
      
      writeFileSync(fullBadgePath, badgeSvg)
      core.info(`\n📛 Badge generated: ${badgePath}`)
    }

    // Determine exit status
    if (!result.valid) {
      core.setFailed('Feed validation failed')
    } else if (failOnWarning && result.warnings.length > 0) {
      core.setFailed('Feed has warnings (fail-on-warning is enabled)')
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : error}`)
  }
}

run()
