/**
 * @webmcp/validator CLI
 * 
 * Validate LLMFeed files from the command line
 * 
 * Usage:
 *   llmfeed-validate <url-or-file>
 *   llmfeed-validate https://example.com
 *   llmfeed-validate ./feed.json
 *   llmfeed-validate --help
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateLLMFeed, fetchLLMFeed, type ValidationResult, type SignatureVerificationResult } from './index.js'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader(): void {
  console.log('')
  console.log(colorize('┌─────────────────────────────────────────┐', 'cyan'))
  console.log(colorize('│', 'cyan') + colorize('     @webmcp/validator CLI v0.1.0       ', 'bold') + colorize('│', 'cyan'))
  console.log(colorize('│', 'cyan') + '  LLMFeed Validator with Ed25519 Verify  ' + colorize('│', 'cyan'))
  console.log(colorize('└─────────────────────────────────────────┘', 'cyan'))
  console.log('')
}

function printHelp(): void {
  printHeader()
  console.log(colorize('USAGE:', 'bold'))
  console.log('  llmfeed-validate <url-or-file> [options]')
  console.log('')
  console.log(colorize('ARGUMENTS:', 'bold'))
  console.log('  <url-or-file>   URL to an LLMFeed, domain name, or local file path')
  console.log('')
  console.log(colorize('OPTIONS:', 'bold'))
  console.log('  --help, -h           Show this help message')
  console.log('  --json               Output results as JSON')
  console.log('  --skip-signature     Skip signature verification')
  console.log('  --verbose, -v        Show detailed output')
  console.log('  --quiet, -q          Only show errors')
  console.log('  --timeout <ms>       Network request timeout (default: 10000)')
  console.log('')
  console.log(colorize('EXAMPLES:', 'bold'))
  console.log('  llmfeed-validate https://example.com')
  console.log('  llmfeed-validate example.com')
  console.log('  llmfeed-validate https://example.com/.well-known/mcp.llmfeed.json')
  console.log('  llmfeed-validate ./my-feed.json')
  console.log('  llmfeed-validate ./feed.json --json')
  console.log('  llmfeed-validate https://example.com --skip-signature')
  console.log('')
  console.log(colorize('EXIT CODES:', 'bold'))
  console.log('  0  Feed is valid')
  console.log('  1  Feed is invalid (has errors)')
  console.log('  2  Could not fetch or parse feed')
  console.log('')
}

function printResult(result: ValidationResult, verbose: boolean, quiet: boolean): void {
  if (quiet && result.valid) {
    return
  }

  // Score banner
  const scoreColor = result.score >= 80 ? 'green' : result.score >= 60 ? 'yellow' : 'red'
  const statusIcon = result.valid ? colorize('✓', 'green') : colorize('✗', 'red')
  const statusText = result.valid ? colorize('VALID', 'green') : colorize('INVALID', 'red')

  console.log('')
  console.log(`${statusIcon} Feed Status: ${statusText}`)
  console.log(`  Security Score: ${colorize(String(result.score), scoreColor)}/100`)
  console.log('')

  // Signature status
  if (result.signatureValid !== undefined) {
    const sigIcon = result.signatureValid ? colorize('✓', 'green') : colorize('✗', 'red')
    const sigText = result.signatureValid
      ? colorize('Verified', 'green')
      : colorize('Failed', 'red')
    console.log(`${sigIcon} Ed25519 Signature: ${sigText}`)

    if (verbose && result.signatureDiagnostics) {
      printSignatureDiagnostics(result.signatureDiagnostics)
    }
  } else {
    console.log(colorize('○', 'dim') + ' Ed25519 Signature: ' + colorize('Not present', 'dim'))
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('')
    console.log(colorize(`Errors (${result.errors.length}):`, 'red'))
    for (const error of result.errors) {
      const field = error.field ? colorize(` [${error.field}]`, 'dim') : ''
      console.log(`  ${colorize('✗', 'red')} ${error.message}${field}`)
    }
  }

  // Warnings
  if (result.warnings.length > 0 && !quiet) {
    console.log('')
    console.log(colorize(`Warnings (${result.warnings.length}):`, 'yellow'))
    for (const warning of result.warnings) {
      const field = warning.field ? colorize(` [${warning.field}]`, 'dim') : ''
      console.log(`  ${colorize('⚠', 'yellow')} ${warning.message}${field}`)
    }
  }

  console.log('')
}

function printSignatureDiagnostics(diag: SignatureVerificationResult): void {
  console.log('')
  console.log(colorize('  Verification Steps:', 'dim'))
  for (const step of diag.steps) {
    const icon = step.status === 'success' ? colorize('✓', 'green') : colorize('✗', 'red')
    console.log(`    ${icon} ${step.message}`)
  }

  if (diag.detectedIssues.length > 0) {
    console.log('')
    console.log(colorize('  Detected Issues:', 'yellow'))
    for (const issue of diag.detectedIssues) {
      const icon = issue.type === 'critical' ? colorize('✗', 'red')
        : issue.type === 'warning' ? colorize('⚠', 'yellow')
        : colorize('ℹ', 'blue')
      console.log(`    ${icon} ${colorize(`[${issue.code}]`, 'dim')} ${issue.title}`)
      if (issue.recommendation) {
        console.log(`      ${colorize('→', 'dim')} ${issue.recommendation}`)
      }
    }
  }

  if (diag.canonicalPayload) {
    console.log('')
    console.log(colorize(`  Canonical Payload: ${diag.canonicalPayload.bytes} bytes`, 'dim'))
    console.log(colorize(`  SHA-256: ${diag.canonicalPayload.hash}`, 'dim'))
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Parse flags
  const flags = {
    help: args.includes('--help') || args.includes('-h'),
    json: args.includes('--json'),
    skipSignature: args.includes('--skip-signature'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    quiet: args.includes('--quiet') || args.includes('-q'),
    timeout: 10000
  }

  // Parse timeout
  const timeoutIdx = args.indexOf('--timeout')
  if (timeoutIdx !== -1 && args[timeoutIdx + 1]) {
    flags.timeout = parseInt(args[timeoutIdx + 1], 10)
  }

  // Get target (non-flag argument, excluding timeout value if present)
  const timeoutValueIdx = timeoutIdx !== -1 ? timeoutIdx + 1 : -1
  const target = args.find((arg, idx) => !arg.startsWith('-') && idx !== timeoutValueIdx)

  if (flags.help || !target) {
    printHelp()
    process.exit(0)
  }

  if (!flags.json) {
    printHeader()
    console.log(colorize('Target:', 'dim'), target)
  }

  try {
    let feed: unknown

    // Check if it's a URL first (before checking file)
    const isUrl = target.startsWith('http://') || target.startsWith('https://')
    
    // Check if it's a local file (only if not a URL)
    if (!isUrl && (existsSync(target) || target.endsWith('.json'))) {
      const filePath = resolve(target)
      if (!flags.json) {
        console.log(colorize('Source:', 'dim'), 'Local file')
      }
      const content = readFileSync(filePath, 'utf-8')
      feed = JSON.parse(content)
    } else if (isUrl) {
      // Fetch from URL
      if (!flags.json) {
        console.log(colorize('Source:', 'dim'), 'Remote URL')
      }
      feed = await fetchLLMFeed(target, { timeout: flags.timeout })
    } else {
      throw new Error(`Target "${target}" is not a valid URL or existing file`)
    }

    // Validate
    const result = await validateLLMFeed(feed, {
      skipSignatureVerification: flags.skipSignature,
      timeout: flags.timeout
    })

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      printResult(result, flags.verbose, flags.quiet)
    }

    process.exit(result.valid ? 0 : 1)
  } catch (error) {
    if (flags.json) {
      console.log(JSON.stringify({
        valid: false,
        error: String(error),
        errors: [{ type: 'format', message: String(error), severity: 'error' }],
        warnings: [],
        score: 0
      }, null, 2))
    } else {
      console.log('')
      console.log(colorize('✗ Error:', 'red'), String(error))
      console.log('')
    }
    process.exit(2)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(2)
})
