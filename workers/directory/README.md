# WebMCP Directory API Worker

Cloudflare Worker + D1 database for the shared WebMCP feed directory.

## Setup

### 1. Create the D1 Database

```bash
cd workers/directory
npm install
wrangler d1 create webmcp-directory
```

Copy the returned `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "webmcp-directory"
database_id = "YOUR-DATABASE-ID-HERE"
```

### 2. Apply Schema

```bash
# Local development
npm run db:migrate:local

# Production
npm run db:migrate
```

### 3. Deploy

```bash
npm run deploy
```

## API Endpoints

### List Feeds
```
GET /api/feeds
GET /api/feeds?limit=20&offset=0
GET /api/feeds?q=search&feed_type=mcp
```

**Response:**
```json
{
  "feeds": [...],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

### Get Curated Feeds
```
GET /api/feeds/curated
```

### Get Single Feed
```
GET /api/feeds/:id
```

### Submit Feed (requires auth)
```
POST /api/feeds
Authorization: Bearer <github-token>
Content-Type: application/json

{
  "url": "https://example.com/.well-known/mcp.llmfeed.json",
  "title": "Example Feed",
  "description": "My feed description",
  "feed_type": "mcp",
  "capabilities_count": 5,
  "score": 85,
  "signature_valid": true
}
```

### Delete Feed (owner only)
```
DELETE /api/feeds/:id
Authorization: Bearer <github-token>
```

## Local Development

```bash
npm run dev
```

This starts the worker locally with a local D1 database.

## Database Schema

See `schema.sql` for the full schema. Key fields:

- `id` - Unique identifier (domain-timestamp)
- `url` - Feed URL (unique)
- `domain` - Extracted domain
- `title`, `description` - Feed metadata
- `score` - Validation score (0-100)
- `signature_valid` - Ed25519 signature status
- `submitted_by` - GitHub username
- `is_curated` - Featured in curated list
- `is_active` - Soft delete flag
