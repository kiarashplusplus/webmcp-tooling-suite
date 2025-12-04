# Planning Guide

A comprehensive WebMCP/LLMFeed tooling suite that addresses critical gaps in feed validation, cryptographic trust verification, and archival indexing for AI agent-ready websites.

**Experience Qualities**:
1. **Technical Precision** - Every validation result must be unambiguous and actionable, providing developers with exact error locations and security findings
2. **Enterprise Trust** - Cryptographic verification and security analysis take priority, ensuring agents never consume compromised feeds
3. **Developer Efficiency** - Complex multi-step validation workflows condensed into instant, visual feedback with exportable results

**Complexity Level**: Light Application (multiple features with basic state)
- Provides specialized tooling for WebMCP/LLMFeed ecosystem with focused features: feed validation, signature verification, schema analysis, and archival preparation

## Essential Features

### LLMFeed Validator
- **Functionality**: Comprehensive validation of mcp.llmfeed.json files including structure, schema conformance, and Ed25519 signature verification
- **Purpose**: Addresses Gap 1 from research - prevents tool poisoning and supply chain attacks by enforcing cryptographic trust
- **Trigger**: User pastes feed URL or JSON content, clicks validate
- **Progression**: Input feed → Parse JSON → Validate structure → Verify schemas → Check Ed25519 signature → Display detailed results with security scoring
- **Success criteria**: Correctly identifies malformed feeds, invalid signatures, and schema errors; provides actionable remediation guidance

### Feed Discovery & Analysis
- **Functionality**: Fetches feeds from .well-known URIs, analyzes capabilities, extracts metadata and agent guidance
- **Trigger**: User enters domain (e.g., "25x.codes")
- **Progression**: Enter domain → Fetch /.well-known/mcp.llmfeed.json → Parse and display metadata → List capabilities with schemas → Show invocation patterns
- **Success criteria**: Successfully retrieves feeds, displays structured capability information, identifies available tools

### Signature Verification Tool
- **Functionality**: Isolated Ed25519 signature validator that verifies signed_blocks against public keys
- **Trigger**: User provides feed with trust block
- **Progression**: Load feed → Extract trust block → Fetch public key from hint → Reconstruct signed payload → Verify Ed25519 signature → Report trust level
- **Success criteria**: Accurately verifies or rejects signatures, fetches public keys from hints, explains verification failures

### RAG Indexing Preparation
- **Functionality**: Transforms validated LLMFeed data into structured format suitable for vector embedding and semantic search
- **Trigger**: User validates a feed and selects "Prepare for RAG"
- **Progression**: Validated feed → Extract capability descriptions → Generate embeddings preview → Export structured JSON for vector stores → Display token efficiency metrics
- **Success criteria**: Produces clean, structured output optimized for embedding models; calculates potential token savings

### Capability Inspector
- **Functionality**: Deep dive into individual capabilities with JSON Schema validation and invocation examples
- **Trigger**: User clicks on a capability from the feed analysis
- **Progression**: Select capability → Display input/output schemas → Validate schema syntax → Generate sample invocation → Show JSON-RPC format
- **Success criteria**: Renders schemas clearly, generates valid sample requests, identifies schema issues

### WebMCP Archive
- **Functionality**: Centralized, public archival system for LLM feeds and MCP manifests with versioning and persistence
- **Purpose**: Addresses Gap 3 - provides resilience and reproducibility for feeds that may go offline or change over time
- **Trigger**: User adds a domain to archive, or archives current discovered feed
- **Progression**: Add domain → Fetch feed → Store timestamped snapshot → Display version history → Enable export/restoration of archived versions
- **Success criteria**: Successfully stores multiple versions with timestamps, allows browsing historical snapshots, provides stable canonical URLs for each archived feed version

## Edge Case Handling

- **Invalid JSON**: Graceful parsing errors with line/column indicators using syntax highlighting
- **Missing Signatures**: Clear warnings when feeds lack trust blocks but allow analysis to proceed
- **Network Failures**: Retry mechanisms with user feedback for feed fetching and public key retrieval
- **Malformed Schemas**: JSON Schema validator catches and reports specific schema syntax errors
- **Cross-Origin Issues**: Handles CORS errors gracefully, suggests proxy or local validation options
- **Large Feeds**: Progressive rendering and virtualization for feeds with 50+ capabilities

## Design Direction

The design should evoke **technical precision, security consciousness, and developer trust** - resembling a security operations dashboard meets developer tooling. The aesthetic should feel like a specialized instrument for critical infrastructure validation, not a general-purpose web app.

## Color Selection

Drawing from security/terminal aesthetics with high-contrast, purpose-driven colors that signal validation states clearly.

- **Primary Color**: Deep Cyan (`oklch(0.55 0.15 195)`) - Technical precision, evokes terminal interfaces and security tooling
- **Secondary Colors**: Dark Slate (`oklch(0.20 0.02 240)`) for backgrounds, Muted Gray (`oklch(0.45 0.01 240)`) for secondary UI
- **Accent Color**: Electric Lime (`oklch(0.75 0.20 130)`) - High-visibility for successful validations and key CTAs
- **Foreground/Background Pairings**: 
  - Primary background Dark Slate (`oklch(0.20 0.02 240)`): White text (`oklch(0.98 0 0)`) - Ratio 14.2:1 ✓
  - Success states Electric Lime (`oklch(0.75 0.20 130)`): Dark text (`oklch(0.15 0 0)`) - Ratio 11.8:1 ✓
  - Warning states Amber (`oklch(0.70 0.18 75)`): Dark text (`oklch(0.15 0 0)`) - Ratio 9.2:1 ✓
  - Error states Crimson (`oklch(0.55 0.22 25)`): White text (`oklch(0.98 0 0)`) - Ratio 6.1:1 ✓

## Font Selection

Typography should balance monospace technical readability for code/JSON with clean sans-serif for UI elements, evoking both developer terminals and modern security dashboards.

- **Typographic Hierarchy**:
  - H1 (Page Title): JetBrains Mono Bold/32px/tight letter spacing - Technical authority
  - H2 (Section Headers): Space Grotesk Bold/24px/normal spacing - Modern technical clarity  
  - Body (Descriptions): Space Grotesk Regular/16px/relaxed line height (1.6) - Readable explanations
  - Code/JSON: JetBrains Mono Regular/14px/1.5 line height - Technical precision for feeds and schemas
  - Labels/Captions: Space Grotesk Medium/13px/uppercase/wide tracking - UI labeling

## Animations

Animations should reinforce validation states and guide attention to critical security findings. **Subtle functionality with purposeful emphasis** - validation state changes deserve clear visual confirmation, while background processes remain understated.

- State transitions for validation (pending → success/error) use 300ms smooth easing
- Signature verification shows progressive step-by-step animation (150ms each step)
- Schema validation errors highlight with subtle pulse effect (200ms)
- Collapsible sections (capabilities, schemas) animate with accordion motion (250ms)
- Success confirmations briefly scale pulse (400ms) to draw attention

## Component Selection

- **Components**: 
  - `Tabs` for switching between Validator/Discovery/Archive/RAG tools
  - `Card` with custom gradient borders for feed display sections
  - `Badge` for validation states (verified, invalid, warning)
  - `Accordion` for collapsible capability lists and snapshot histories
  - `Textarea` for JSON input with monospace styling
  - `Button` with distinct variants for validation actions vs navigation
  - `Alert` for critical security warnings (signature failures)
  - `ScrollArea` for large JSON feed display and archive lists
  - `Progress` for multi-step validation workflows
  - `Tooltip` for schema field explanations
  - `Separator` to divide validation sections
  
- **Customizations**: 
  - Custom JSON syntax highlighter using regex-based colorization
  - Security score visualization with radial progress indicator
  - Capability cards with schema preview and copy-to-clipboard
  - Custom Ed25519 verification stepper component
  
- **States**: 
  - Validation button: default (cyan gradient), loading (animated pulse), success (lime), error (crimson)
  - Input fields: focus ring in cyan, error borders in crimson with shake animation
  - Feed cards: hover lift effect (2px translate), selected state with accent border
  
- **Icon Selection**: 
  - Shield (ShieldCheck/ShieldWarning) for trust/signature states
  - MagnifyingGlass for discovery and analysis
  - Code for capability inspection
  - CloudArrowDown for feed fetching
  - CheckCircle/XCircle for validation results
  - Database for RAG indexing
  - Archive for feed archival and version history
  - Clock for timestamp displays
  - Trash for deletion actions
  - Download/Copy for export and clipboard operations
  
- **Spacing**: 
  - Section padding: `p-6` for cards, `p-8` for page container
  - Element gaps: `gap-4` for form elements, `gap-6` for major sections
  - Component margins: `mb-4` for related groups, `mb-8` for section breaks
  
- **Mobile**: 
  - Tabs convert to stacked buttons on <768px
  - Two-column layouts (feed + analysis, archive list + details) stack vertically on mobile
  - JSON display switches to horizontally scrollable with reduced font size
  - Floating action button for quick validation/archival on mobile
  - Bottom sheet for capability details and snapshot viewers instead of side panels
  - Archive list becomes full-width with collapsible snapshot details
