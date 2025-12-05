# @25xcodes/llmfeed-action

GitHub Action for automated feed validation in CI/CD pipelines.

## Format Support

| Format | Status |
|--------|--------|
| **LLMFeed JSON** (`.json`) | ✅ Fully Supported |
| **llm.txt** (`.txt`) | 🚧 Coming Soon |

::: info Current Status
The GitHub Action validates **LLMFeed JSON** files. Support for llm.txt validation is planned.
:::

## Features

- ✅ **Automatic Validation** - Validate feeds on every push and PR
- 🔐 **Signature Verification** - Verify cryptographic signatures
- 📊 **Detailed Reports** - Upload validation reports as artifacts
- ⚙️ **Zero Config** - Works out of the box with sensible defaults
- 🎯 **Flexible Targeting** - Validate specific files or directories

## Quick Start

```yaml
# .github/workflows/validate-feed.yml
name: Validate LLMFeed

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Feed
        uses: 25xcodes/llmfeed-action@v1
        with:
          feed-path: './llmfeed.json'
```

::: tip Multiple Formats
If you serve both llmfeed.json and llm.txt, point the action to your JSON file for full validation support.
:::

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `feed-path` | Yes | - | Path to feed file or directory |
| `fail-on-error` | No | `true` | Fail the workflow on validation errors |
| `verify-signature` | No | `true` | Verify cryptographic signatures |
| `upload-report` | No | `true` | Upload validation report as artifact |
| `report-format` | No | `json` | Report format: `json`, `html`, or `markdown` |

## Examples

### Basic Validation

```yaml
- uses: 25xcodes/llmfeed-action@v1
  with:
    feed-path: './llmfeed.json'
```

### Multiple Feeds

```yaml
- uses: 25xcodes/llmfeed-action@v1
  with:
    feed-path: './feeds/'  # Validates all .json files
```

### Continue on Error

```yaml
- uses: 25xcodes/llmfeed-action@v1
  with:
    feed-path: './llm.txt'
    fail-on-error: false
```

### Skip Signature Verification

```yaml
- uses: 25xcodes/llmfeed-action@v1
  with:
    feed-path: './llm.txt'
    verify-signature: false
```

### HTML Report

```yaml
- uses: 25xcodes/llmfeed-action@v1
  with:
    feed-path: './llm.txt'
    report-format: html
```

### Complete Workflow

```yaml
name: LLMFeed CI

on:
  push:
    branches: [main]
    paths:
      - 'llmfeed.json'
      - '.well-known/llmfeed.json'
  pull_request:
    branches: [main]
    paths:
      - 'llmfeed.json'
      - '.well-known/llmfeed.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate Feed
        uses: 25xcodes/llmfeed-action@v1
        with:
          feed-path: './llmfeed.json'
          fail-on-error: true
          verify-signature: true
          upload-report: true
          report-format: json

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('./llmfeed-report.json'));
            
            const status = report.valid ? '✅ Valid' : '❌ Invalid';
            const body = `## LLMFeed Validation ${status}\n\n` +
              `- Structure: ${report.structureValid ? '✅' : '❌'}\n` +
              `- Signature: ${report.signatureValid ? '✅' : '❌'}\n`;
            
            github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body
            });
```

## Outputs

| Output | Description |
|--------|-------------|
| `valid` | Whether the feed is valid (`true`/`false`) |
| `structure-valid` | Whether the structure is valid |
| `signature-valid` | Whether the signature is valid |
| `report-path` | Path to the generated report |

### Using Outputs

```yaml
- name: Validate Feed
  id: validate
  uses: 25xcodes/llmfeed-action@v1
  with:
    feed-path: './llm.txt'

- name: Check Result
  run: |
    if [ "${{ steps.validate.outputs.valid }}" == "true" ]; then
      echo "Feed is valid!"
    else
      echo "Feed validation failed"
    fi
```

## Report Artifacts

When `upload-report` is enabled, the validation report is uploaded as a workflow artifact:

1. Navigate to the workflow run
2. Scroll to "Artifacts"
3. Download `llmfeed-validation-report`

## Pre-Release Validation

Validate feeds before publishing releases:

```yaml
name: Pre-Release Check

on:
  release:
    types: [created]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Feed
        uses: 25xcodes/llmfeed-action@v1
        with:
          feed-path: './.well-known/llmfeed.json'
          fail-on-error: true
          verify-signature: true
```

## Local Testing

Test the action locally before pushing:

```bash
# Install dependencies
npm install @25xcodes/llmfeed-validator

# Run validation
npx llmfeed-validate ./llm.txt
```

## Troubleshooting

### "Feed not found" Error

Ensure the feed path is relative to the repository root:

```yaml
# ✅ Correct
feed-path: './llm.txt'
feed-path: './.well-known/llm.txt'

# ❌ Incorrect
feed-path: '/llm.txt'
feed-path: 'llm.txt'  # Missing ./
```

### "Signature verification failed"

1. Ensure the feed is signed correctly
2. Check that the public key in the feed matches your signing key
3. Verify the signed blocks match the feed content

### Action Timeout

For large feeds or slow networks:

```yaml
- uses: 25xcodes/llmfeed-action@v1
  timeout-minutes: 5
  with:
    feed-path: './llm.txt'
```
