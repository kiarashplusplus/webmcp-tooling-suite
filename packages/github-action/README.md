# @25xcodes/llmfeed-action

GitHub Action for validating LLMFeed JSON files with Ed25519 signature verification.

[![Used by FIML](https://img.shields.io/badge/used%20by-FIML-blue)](https://github.com/kiarashplusplus/FIML)
[![npm](https://img.shields.io/npm/v/@25xcodes/llmfeed-validator)](https://www.npmjs.com/package/@25xcodes/llmfeed-validator)

## Quick Start

Add LLMFeed validation to your repository in 2 minutes:

```yaml
# .github/workflows/validate-llmfeed.yml
name: Validate LLMFeed

on:
  push:
    branches: [main]
    paths: ['**/*.llmfeed.json', '**/llms.txt']
  pull_request:
    paths: ['**/*.llmfeed.json', '**/llms.txt']

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate LLMFeed
        uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
        with:
          feed: '.well-known/mcp.llmfeed.json'
          create-badge: 'true'
      
      - name: Commit badge
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .github/badges/
          git diff --staged --quiet || git commit -m "chore: update LLMFeed badge"
          git push
```

Then add the badge to your README:

```markdown
[![LLMFeed](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/.github/badges/llmfeed-status.json)](https://your-site/.well-known/mcp.llmfeed.json)
```

## Live Example

See this action in production on [**FIML**](https://github.com/kiarashplusplus/FIML) - a Financial Intelligence MCP Server:

- 📋 [Workflow file](https://github.com/kiarashplusplus/FIML/blob/main/.github/workflows/validate-llmfeed.yml)
- ✅ [Workflow runs](https://github.com/kiarashplusplus/FIML/actions/workflows/validate-llmfeed.yml)
- 🏷️ [Badge in README](https://github.com/kiarashplusplus/FIML#readme)

## Features

- ✅ **Structural Validation** — Checks `feed_type`, `metadata`, `capabilities`
- 🔐 **Signature Verification** — Ed25519 signature verification via `public_key_hint`
- 🎯 **Security Scoring** — 0-100 score with color-coded badges
- 🏷️ **Dynamic Badges** — shields.io compatible JSON badges
- 💬 **PR Comments** — Post validation results on pull requests
- 🔗 **Remote Feeds** — Validate feeds from URLs

## Usage Examples

### Basic Validation

```yaml
- name: Validate LLMFeed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: '.well-known/mcp.llmfeed.json'
```

### Multiple Feeds

```yaml
- name: Validate MCP Feed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: '.well-known/mcp.llmfeed.json'
    create-badge: 'true'
    badge-path: '.github/badges/llmfeed-mcp.json'

- name: Validate LLM Index
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: '.well-known/llm-index.llmfeed.json'
    create-badge: 'true'
    badge-path: '.github/badges/llmfeed-index.json'
```

### Skip Signature Verification

For feeds without signatures (development or simple use cases):

```yaml
- name: Validate LLMFeed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'mcp.llmfeed.json'
    skip-signature: 'true'
```

### Strict Mode (Fail on Warnings)

```yaml
- name: Strict Validation
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'mcp.llmfeed.json'
    fail-on-warning: 'true'
```

### Validate Remote Feed

```yaml
- name: Validate Production Feed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'https://example.com/.well-known/mcp.llmfeed.json'
```

### PR Comment with Results

```yaml
- name: Validate
  id: validate
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'mcp.llmfeed.json'

- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      const valid = '\${{ steps.validate.outputs.valid }}' === 'true';
      const score = '\${{ steps.validate.outputs.security-score }}';
      const sig = '\${{ steps.validate.outputs.signature-status }}';
      
      const emoji = valid ? '✅' : '❌';
      const body = \`## \${emoji} LLMFeed Validation
      
      | Metric | Value |
      |--------|-------|
      | Status | \${valid ? 'Valid' : 'Invalid'} |
      | Security Score | \${score}/100 |
      | Signature | \${sig} |
      \`;
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body
      });
```

### Using Outputs

```yaml
- name: Validate
  id: validate
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'mcp.llmfeed.json'

- name: Check Results
  run: |
    echo "Valid: \${{ steps.validate.outputs.valid }}"
    echo "Score: \${{ steps.validate.outputs.security-score }}"
    echo "Signature: \${{ steps.validate.outputs.signature-status }}"
    echo "Title: \${{ steps.validate.outputs.feed-title }}"
    echo "Capabilities: \${{ steps.validate.outputs.capabilities-count }}"
```

## Dynamic Badges

The action generates shields.io-compatible JSON badges. Badge colors are based on security score:

| Score | Color | Example |
|-------|-------|---------|
| ≥ 80 | 🟢 brightgreen | ![80+](https://img.shields.io/badge/LLMFeed-85%2F100-brightgreen) |
| ≥ 60 | 🟢 green | ![60+](https://img.shields.io/badge/LLMFeed-65%2F100-green) |
| ≥ 40 | 🟡 yellow | ![40+](https://img.shields.io/badge/LLMFeed-45%2F100-yellow) |
| < 40 | 🟠 orange | ![<40](https://img.shields.io/badge/LLMFeed-30%2F100-orange) |
| Invalid | �� red | ![invalid](https://img.shields.io/badge/LLMFeed-invalid-red) |

### Badge via Repository (Recommended)

The badge JSON is committed to your repo and served via `raw.githubusercontent.com`:

```markdown
[![LLMFeed](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPO/main/.github/badges/llmfeed-status.json)](LINK_TO_FEED)
```

### Badge via Gist (No Commits)

If you prefer not to commit badge files:

1. Create a public Gist with `llmfeed-badge.json`
2. Create a PAT with `gist` scope → add as `GIST_TOKEN` secret
3. Configure the action:

```yaml
- name: Validate LLMFeed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: '.well-known/mcp.llmfeed.json'
    badge-gist-id: 'YOUR_GIST_ID'
  env:
    GIST_TOKEN: \${{ secrets.GIST_TOKEN }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `feed` | Path to LLMFeed JSON file or URL | Yes | - |
| `fail-on-warning` | Fail if warnings are found | No | `false` |
| `skip-signature` | Skip Ed25519 signature verification | No | `false` |
| `timeout` | Network request timeout (ms) | No | `10000` |
| `create-badge` | Generate badge files (`.svg` and `.json`) | No | `false` |
| `badge-path` | Path for generated badge files | No | `.github/badges/llmfeed-status` |
| `badge-gist-id` | Gist ID for dynamic shields.io badge | No | - |
| `badge-filename` | Filename in gist for badge JSON | No | `llmfeed-badge.json` |

## Outputs

| Output | Description |
|--------|-------------|
| `valid` | Whether the feed is valid (`true`/`false`) |
| `security-score` | Security score from 0-100 |
| `signature-status` | `verified`, `failed`, `skipped`, or `unsigned` |
| `errors` | JSON array of validation errors |
| `warnings` | JSON array of validation warnings |
| `feed-title` | Title from feed metadata |
| `capabilities-count` | Number of capabilities in the feed |
| `badge-url` | Dynamic shields.io badge URL |

## Validation Checks

### Structure Validation
- ✅ Required `feed_type` field (`mcp`, `export`, `llm-index`)
- ✅ Required `metadata` fields: `title`, `origin`, `description`
- ✅ Valid URL formats
- ✅ Capability schema correctness

### Signature Verification
- 🔐 Fetches public key from `trust.public_key_hint` URL
- 🔐 Supports PEM and SPKI key formats
- 🔐 Verifies Ed25519 signature against canonical JSON payload
- 🔐 Validates `signed_blocks` coverage

## Security Score

The security score (0-100) is calculated based on:

| Issue | Points |
|-------|--------|
| Validation error | -20 |
| Validation warning | -5 |
| Unsigned feed | -30 |
| Signature verification failed | -50 |

## Related Tools

- 📦 [@25xcodes/llmfeed-validator](https://www.npmjs.com/package/@25xcodes/llmfeed-validator) — CLI & library for validation
- 🔏 [@25xcodes/llmfeed-signer](https://www.npmjs.com/package/@25xcodes/llmfeed-signer) — Sign feeds with Ed25519
- 🔍 [@25xcodes/llmfeed-health-monitor](https://www.npmjs.com/package/@25xcodes/llmfeed-health-monitor) — Feed monitoring & health checks
- 🌐 [LLMFeed Validator Web App](https://kiarashplusplus.github.io/webmcp-tooling-suite/) — Online validation tool

## License

MIT
