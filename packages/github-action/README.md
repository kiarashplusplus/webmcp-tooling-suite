# @25xcodes/llmfeed-action

GitHub Action for validating LLMFeed JSON files with Ed25519 signature verification.

## Usage

### Basic Validation

```yaml
name: Validate LLMFeed

on:
  push:
    paths:
      - '**/*.llmfeed.json'
      - '**/mcp.llmfeed.json'
  pull_request:
    paths:
      - '**/*.llmfeed.json'
      - '**/mcp.llmfeed.json'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate LLMFeed
        uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
        with:
          feed: '.well-known/mcp.llmfeed.json'
```

### With Dynamic Badge (Recommended)

Generate a dynamic shields.io badge that shows your security score:

```yaml
name: Validate and Badge

on:
  push:
    branches: [main]
    paths: ['**/*.llmfeed.json']

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate LLMFeed
        id: validate
        uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
        with:
          feed: '.well-known/mcp.llmfeed.json'
          skip-signature: 'true'
          create-badge: 'true'
      
      - name: Commit badge files
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .github/badges/
          git diff --staged --quiet || git commit -m "chore: update LLMFeed badge"
          git push
```

The action generates both `.svg` and `.json` badge files. Add to your README:

```markdown
<!-- Dynamic badge via shields.io (shows score like "85/100") -->
[![LLMFeed](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPO/main/.github/badges/llmfeed-status.json)](https://your-site/.well-known/mcp.llmfeed.json)

<!-- Or use the static SVG directly -->
![LLMFeed](/.github/badges/llmfeed-status.svg)
```

**Badge colors by score:**
- 🟢 **brightgreen**: Score ≥ 80
- 🟢 **green**: Score ≥ 60
- 🟡 **yellow**: Score ≥ 40
- 🟠 **orange**: Score < 40
- 🔴 **red**: Invalid feed

### Advanced: Dynamic Badge via Gist (No Commits)

If you prefer not to commit badge files, use a GitHub Gist as the endpoint:

1. Create a GitHub Gist with `llmfeed-badge.json`
2. Create a PAT with `gist` scope → add as `GIST_TOKEN` secret
3. Add to workflow:

```yaml
- name: Validate LLMFeed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: '.well-known/mcp.llmfeed.json'
    badge-gist-id: 'YOUR_GIST_ID'
  env:
    GIST_TOKEN: ${{ secrets.GIST_TOKEN }}
```

### Validate Remote Feed

```yaml
- name: Validate Remote Feed
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'https://example.com/.well-known/mcp.llmfeed.json'
```

### Strict Mode (Fail on Warnings)

```yaml
- name: Strict Validation
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'mcp.llmfeed.json'
    fail-on-warning: 'true'
```

### Skip Signature Verification

```yaml
- name: Structure-Only Validation
  uses: kiarashplusplus/webmcp-tooling-suite/packages/github-action@v1
  with:
    feed: 'mcp.llmfeed.json'
    skip-signature: 'true'
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
    echo "Valid: ${{ steps.validate.outputs.valid }}"
    echo "Score: ${{ steps.validate.outputs.security-score }}"
    echo "Signature: ${{ steps.validate.outputs.signature-status }}"
    echo "Title: ${{ steps.validate.outputs.feed-title }}"
    echo "Capabilities: ${{ steps.validate.outputs.capabilities-count }}"
    echo "Badge URL: ${{ steps.validate.outputs.badge-url }}"
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
      const valid = '${{ steps.validate.outputs.valid }}' === 'true';
      const score = '${{ steps.validate.outputs.security-score }}';
      const sig = '${{ steps.validate.outputs.signature-status }}';
      
      const emoji = valid ? '✅' : '❌';
      const body = `## ${emoji} LLMFeed Validation
      
      | Metric | Value |
      |--------|-------|
      | Status | ${valid ? 'Valid' : 'Invalid'} |
      | Security Score | ${score}/100 |
      | Signature | ${sig} |
      `;
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body
      });
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `feed` | Path to LLMFeed JSON file or URL | Yes | - |
| `fail-on-warning` | Fail if warnings are found | No | `false` |
| `skip-signature` | Skip Ed25519 signature verification | No | `false` |
| `timeout` | Network request timeout (ms) | No | `10000` |
| `create-badge` | Generate SVG validation badge | No | `false` |
| `badge-path` | Path for generated SVG badge | No | `.github/badges/llmfeed-status.svg` |
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
| `badge-url` | Dynamic shields.io badge URL (if `badge-gist-id` is set) |

## Validation Checks

The action performs:

1. **Structure Validation**
   - Required fields: `feed_type`, `metadata.title`, `metadata.origin`, `metadata.description`
   
2. **Schema Validation**
   - Capability schema correctness
   - JSON Schema syntax validation

3. **Signature Verification** (unless skipped)
   - Fetches public key from `trust.public_key_hint`
   - Verifies Ed25519 signature against canonical payload
   - Checks signed_blocks coverage

## Security Score

The security score (0-100) is calculated based on:

- **-20 points** per validation error
- **-5 points** per warning
- **-30 points** if feed is unsigned
- **-50 points** if signature verification fails

## License

MIT

