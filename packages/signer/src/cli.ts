/**
 * @webmcp/signer CLI
 * 
 * Command-line interface for Ed25519 key generation and LLMFeed signing.
 * 
 * Usage:
 *   llmfeed-sign keygen [--output <dir>]
 *   llmfeed-sign sign <feed.json> --key <private.pem> [--output <signed.json>]
 *   llmfeed-sign verify <feed.json> --key <public.pem>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import {
  generateKeyPair,
  signFeed,
  verifyFeed,
  parsePem,
  pemToPublicKey,
  uint8ArrayToBase64,
  deepSortObject,
  type KeyPair,
  type SignedFeed,
  type SigningOptions
} from './index.js'

// ============================================================================
// CLI Helpers
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function colorize(text: string, color: keyof typeof COLORS): string {
  if (process.env.NO_COLOR || !process.stdout.isTTY) {
    return text
  }
  return `${COLORS[color]}${text}${COLORS.reset}`
}

function printHeader(): void {
  console.log('')
  console.log(colorize('┌─────────────────────────────────────────┐', 'cyan'))
  console.log(colorize('│', 'cyan') + colorize('   @25xcodes/llmfeed-signer v1.1.6     ', 'bold') + colorize('│', 'cyan'))
  console.log(colorize('│', 'cyan') + colorize('   Ed25519 Key Generation & Signing     ', 'dim') + colorize('│', 'cyan'))
  console.log(colorize('└─────────────────────────────────────────┘', 'cyan'))
  console.log('')
}

function printHelp(): void {
  printHeader()
  console.log(colorize('USAGE:', 'bold'))
  console.log('  llmfeed-sign <command> [options]')
  console.log('')
  console.log(colorize('COMMANDS:', 'bold'))
  console.log('  keygen              Generate a new Ed25519 keypair')
  console.log('  sign <feed.json>    Sign an LLMFeed JSON file')
  console.log('  verify <feed.json>  Verify a signed feed')
  console.log('')
  console.log(colorize('KEYGEN OPTIONS:', 'bold'))
  console.log('  --output, -o <dir>  Output directory for keys (default: ./keys)')
  console.log('  --name, -n <name>   Key name prefix (default: llmfeed)')
  console.log('')
  console.log(colorize('SIGN OPTIONS:', 'bold'))
  console.log('  --key, -k <file>    Private key file (PEM or base64)')
  console.log('  --output, -o <file> Output signed feed (default: <input>.signed.json)')
  console.log('  --public-url <url>  URL where public key will be hosted')
  console.log('  --blocks <list>     Comma-separated blocks to sign')
  console.log('  --trust-level <lvl> Trust level (e.g., "self-signed")')
  console.log('  --in-place          Modify input file in place')
  console.log('')
  console.log(colorize('VERIFY OPTIONS:', 'bold'))
  console.log('  --key, -k <file>    Public key file (PEM format)')
  console.log('  --json              Output result as JSON')
  console.log('')
  console.log(colorize('EXAMPLES:', 'bold'))
  console.log(colorize('  # Generate new keypair', 'dim'))
  console.log('  llmfeed-sign keygen -o ./keys -n mysite')
  console.log('')
  console.log(colorize('  # Sign a feed', 'dim'))
  console.log('  llmfeed-sign sign mcp.llmfeed.json -k ./keys/mysite.private.pem \\')
  console.log('    --public-url https://example.com/.well-known/public.pem')
  console.log('')
  console.log(colorize('  # Verify a signed feed', 'dim'))
  console.log('  llmfeed-sign verify signed.json -k ./keys/mysite.public.pem')
  console.log('')
}

function parseArgs(args: string[]): {
  command: string
  target?: string
  flags: Record<string, string | boolean>
} {
  const flags: Record<string, string | boolean> = {}
  let command = ''
  let target: string | undefined

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg
        i++
      } else {
        flags[key] = true
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const shortFlags: Record<string, string> = {
        'o': 'output',
        'k': 'key',
        'n': 'name',
        'h': 'help'
      }
      const key = shortFlags[arg[1]] || arg[1]
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg
        i++
      } else {
        flags[key] = true
      }
    } else if (!command) {
      command = arg
    } else if (!target) {
      target = arg
    }
  }

  return { command, target, flags }
}

// ============================================================================
// Commands
// ============================================================================

async function cmdKeygen(flags: Record<string, string | boolean>): Promise<void> {
  const outputDir = typeof flags.output === 'string' ? flags.output : './keys'
  const name = typeof flags.name === 'string' ? flags.name : 'llmfeed'

  console.log(colorize('Generating Ed25519 keypair...', 'cyan'))
  console.log('')

  const keyPair = await generateKeyPair()

  // Create output directory
  const resolvedDir = resolve(outputDir)
  if (!existsSync(resolvedDir)) {
    mkdirSync(resolvedDir, { recursive: true })
  }

  // Write private key
  const privateKeyPath = join(resolvedDir, `${name}.private.pem`)
  writeFileSync(privateKeyPath, keyPair.privateKeyPem, 'utf-8')
  console.log(colorize('✓', 'green'), 'Private key:', colorize(privateKeyPath, 'yellow'))

  // Write public key
  const publicKeyPath = join(resolvedDir, `${name}.public.pem`)
  writeFileSync(publicKeyPath, keyPair.publicKeyPem, 'utf-8')
  console.log(colorize('✓', 'green'), 'Public key: ', colorize(publicKeyPath, 'yellow'))

  // Write base64 private key (for environment variables)
  const base64Path = join(resolvedDir, `${name}.private.base64`)
  writeFileSync(base64Path, keyPair.privateKey, 'utf-8')
  console.log(colorize('✓', 'green'), 'Base64 key: ', colorize(base64Path, 'dim'))

  console.log('')
  console.log(colorize('Key Details:', 'bold'))
  console.log('  Algorithm:', colorize('Ed25519', 'cyan'))
  console.log('  Format:   ', colorize('PKCS#8 (48 bytes)', 'dim'))
  console.log('  Created:  ', colorize(keyPair.createdAt, 'dim'))

  console.log('')
  console.log(colorize('⚠️  Security Notes:', 'yellow'))
  console.log('  • Keep', colorize(basename(privateKeyPath), 'red'), 'secret!')
  console.log('  • Add to .gitignore: keys/*.private.*')
  console.log('  • Use', colorize(basename(base64Path), 'dim'), 'for MCP_PRIVATE_KEY env var')
  console.log('')
  console.log(colorize('Next step:', 'bold'), `Upload ${basename(publicKeyPath)} to your server`)
  console.log('  Example: https://yoursite.com/.well-known/public.pem')
  console.log('')
}

async function cmdSign(target: string, flags: Record<string, string | boolean>): Promise<void> {
  // Validate inputs
  if (!flags.key) {
    console.error(colorize('✗ Error:', 'red'), 'Missing required --key flag')
    process.exit(1)
  }

  const keyPath = resolve(String(flags.key))
  const feedPath = resolve(target)

  if (!existsSync(feedPath)) {
    console.error(colorize('✗ Error:', 'red'), `Feed file not found: ${feedPath}`)
    process.exit(1)
  }

  if (!existsSync(keyPath)) {
    console.error(colorize('✗ Error:', 'red'), `Key file not found: ${keyPath}`)
    process.exit(1)
  }

  console.log(colorize('Signing feed...', 'cyan'))
  console.log('')
  console.log('  Feed:', colorize(feedPath, 'dim'))
  console.log('  Key: ', colorize(keyPath, 'dim'))
  console.log('')

  // Read feed
  const feedContent = readFileSync(feedPath, 'utf-8')
  let feed: Record<string, unknown>
  try {
    feed = JSON.parse(feedContent)
  } catch (e) {
    console.error(colorize('✗ Error:', 'red'), 'Invalid JSON in feed file')
    process.exit(1)
  }

  // Read private key
  const keyContent = readFileSync(keyPath, 'utf-8').trim()
  let privateKeyBase64: string

  if (keyContent.includes('BEGIN PRIVATE KEY')) {
    privateKeyBase64 = parsePem(keyContent)
  } else {
    // Assume raw base64
    privateKeyBase64 = keyContent
  }

  // Build signing options
  const signingOptions: SigningOptions = {
    addTimestamp: true
  }

  if (typeof flags['public-url'] === 'string') {
    signingOptions.publicKeyUrl = flags['public-url']
  }

  if (typeof flags['trust-level'] === 'string') {
    signingOptions.trustLevel = flags['trust-level']
  }

  if (typeof flags.blocks === 'string') {
    signingOptions.signedBlocks = flags.blocks.split(',').map(b => b.trim())
  }

  // Sign the feed
  let result: SignedFeed
  try {
    result = await signFeed(feed, privateKeyBase64, signingOptions)
  } catch (error) {
    console.error(colorize('✗ Signing failed:', 'red'), String(error))
    process.exit(1)
  }

  // Determine output path
  let outputPath: string
  if (flags['in-place']) {
    outputPath = feedPath
  } else if (typeof flags.output === 'string') {
    outputPath = resolve(flags.output)
  } else {
    const dir = dirname(feedPath)
    const name = basename(feedPath, '.json')
    outputPath = join(dir, `${name}.signed.json`)
  }

  // Write signed feed
  const outputContent = JSON.stringify(result.feed, null, 2)
  writeFileSync(outputPath, outputContent, 'utf-8')

  console.log(colorize('✓ Feed signed successfully!', 'green'))
  console.log('')
  console.log(colorize('Signature Details:', 'bold'))
  console.log('  Algorithm:     ', colorize('Ed25519', 'cyan'))
  console.log('  Signed blocks: ', colorize(result.signedBlocks.join(', '), 'dim'))
  console.log('  Payload size:  ', colorize(`${result.canonicalPayload.length} bytes`, 'dim'))
  console.log('  SHA-256:       ', colorize(result.payloadHash.slice(0, 16) + '...', 'dim'))
  console.log('  Signature:     ', colorize(result.signature.slice(0, 20) + '...', 'dim'))
  console.log('')
  console.log('  Output:', colorize(outputPath, 'yellow'))
  console.log('')

  if (!signingOptions.publicKeyUrl) {
    console.log(colorize('⚠️  Note:', 'yellow'), 'No --public-url specified.')
    console.log('  Add trust.public_key_hint manually or re-sign with --public-url')
    console.log('')
  }
}

async function cmdVerify(target: string, flags: Record<string, string | boolean>): Promise<void> {
  const feedPath = resolve(target)
  const jsonOutput = flags.json === true

  if (!existsSync(feedPath)) {
    if (jsonOutput) {
      console.log(JSON.stringify({ valid: false, error: 'Feed file not found' }))
    } else {
      console.error(colorize('✗ Error:', 'red'), `Feed file not found: ${feedPath}`)
    }
    process.exit(1)
  }

  // Read feed
  const feedContent = readFileSync(feedPath, 'utf-8')
  let feed: Record<string, unknown>
  try {
    feed = JSON.parse(feedContent)
  } catch (e) {
    if (jsonOutput) {
      console.log(JSON.stringify({ valid: false, error: 'Invalid JSON' }))
    } else {
      console.error(colorize('✗ Error:', 'red'), 'Invalid JSON in feed file')
    }
    process.exit(1)
  }

  // Get public key
  let publicKeyBase64: string

  if (flags.key) {
    const keyPath = resolve(String(flags.key))
    if (!existsSync(keyPath)) {
      if (jsonOutput) {
        console.log(JSON.stringify({ valid: false, error: 'Key file not found' }))
      } else {
        console.error(colorize('✗ Error:', 'red'), `Key file not found: ${keyPath}`)
      }
      process.exit(1)
    }

    const keyContent = readFileSync(keyPath, 'utf-8').trim()
    if (keyContent.includes('BEGIN PUBLIC KEY')) {
      const rawKey = pemToPublicKey(keyContent)
      publicKeyBase64 = uint8ArrayToBase64(rawKey)
    } else {
      publicKeyBase64 = keyContent
    }
  } else {
    // Try to fetch from public_key_hint
    const trust = feed.trust as Record<string, unknown> | undefined
    const publicKeyUrl = trust?.public_key_hint as string | undefined

    if (!publicKeyUrl) {
      if (jsonOutput) {
        console.log(JSON.stringify({ valid: false, error: 'No public key provided and no public_key_hint in feed' }))
      } else {
        console.error(colorize('✗ Error:', 'red'), 'No --key provided and no public_key_hint in feed')
      }
      process.exit(1)
    }

    if (!jsonOutput) {
      console.log(colorize('Fetching public key from:', 'dim'), publicKeyUrl)
    }

    try {
      const response = await fetch(publicKeyUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const keyContent = await response.text()
      const rawKey = pemToPublicKey(keyContent)
      publicKeyBase64 = uint8ArrayToBase64(rawKey)
    } catch (error) {
      if (jsonOutput) {
        console.log(JSON.stringify({ valid: false, error: `Failed to fetch public key: ${error}` }))
      } else {
        console.error(colorize('✗ Error:', 'red'), `Failed to fetch public key: ${error}`)
      }
      process.exit(1)
    }
  }

  // Verify
  const result = await verifyFeed(feed, publicKeyBase64)

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.valid ? 0 : 1)
  }

  console.log('')
  if (result.valid) {
    console.log(colorize('✓ Signature VALID', 'green'))
    console.log('')
    console.log(colorize('Verification Details:', 'bold'))
    console.log('  Signed blocks:', colorize(result.signedBlocks?.join(', ') || 'unknown', 'dim'))
    console.log('  Payload hash: ', colorize(result.payloadHash?.slice(0, 16) + '...' || 'unknown', 'dim'))
  } else {
    console.log(colorize('✗ Signature INVALID', 'red'))
    console.log('')
    console.log('  Error:', colorize(result.error || 'Unknown error', 'yellow'))
  }
  console.log('')

  process.exit(result.valid ? 0 : 1)
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const { command, target, flags } = parseArgs(args)

  if (flags.help || !command) {
    printHelp()
    process.exit(0)
  }

  printHeader()

  switch (command) {
    case 'keygen':
      await cmdKeygen(flags)
      break

    case 'sign':
      if (!target) {
        console.error(colorize('✗ Error:', 'red'), 'Missing feed file argument')
        console.log('')
        console.log('Usage: llmfeed-sign sign <feed.json> --key <private.pem>')
        process.exit(1)
      }
      await cmdSign(target, flags)
      break

    case 'verify':
      if (!target) {
        console.error(colorize('✗ Error:', 'red'), 'Missing feed file argument')
        console.log('')
        console.log('Usage: llmfeed-sign verify <feed.json> [--key <public.pem>]')
        process.exit(1)
      }
      await cmdVerify(target, flags)
      break

    default:
      console.error(colorize('✗ Unknown command:', 'red'), command)
      console.log('')
      console.log('Run', colorize('llmfeed-sign --help', 'cyan'), 'for usage')
      process.exit(1)
  }
}

main().catch((error) => {
  console.error(colorize('✗ Fatal error:', 'red'), error.message || error)
  process.exit(1)
})
