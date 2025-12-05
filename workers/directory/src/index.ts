/**
 * WebMCP Directory API Worker
 * 
 * Cloudflare Worker with D1 database for storing the feed directory.
 * 
 * Endpoints:
 *   GET  /api/feeds          - List all active feeds (paginated)
 *   GET  /api/feeds/curated  - List curated feeds only
 *   GET  /api/feeds/:id      - Get single feed by ID
 *   POST /api/feeds          - Submit new feed (requires GitHub auth)
 *   DELETE /api/feeds/:id    - Remove feed (owner only)
 *   GET  /health             - Health check
 * 
 * Setup:
 *   1. Create D1 database: wrangler d1 create webmcp-directory
 *   2. Update wrangler.toml with database_id
 *   3. Apply schema: wrangler d1 execute webmcp-directory --file=./schema.sql
 *   4. Deploy: wrangler deploy
 */

export interface Env {
  DB: D1Database
  FRONTEND_URL: string
}

interface Feed {
  id: string
  url: string
  domain: string
  title: string | null
  description: string | null
  feed_type: string
  capabilities_count: number
  version: string | null
  score: number | null
  signature_valid: boolean
  submitted_by: string | null
  submitted_at: number
  last_validated: number | null
  is_curated: boolean
  is_active: boolean
}

interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  email?: string
}

// CORS headers
function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowedOrigins = [
    'https://kiarashplusplus.github.io',
    env.FRONTEND_URL,
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
  ]
  
  // Check if origin matches any allowed origin (including subpaths)
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  )
  
  // If origin is allowed, echo it back; otherwise use wildcard for public GET requests
  const allowOrigin = isAllowed ? origin : '*'
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': isAllowed ? 'true' : 'false',
  }
}

function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

// Verify GitHub token and get user info
async function verifyGitHubToken(token: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'WebMCP-Directory-Worker',
      },
    })
    
    if (!response.ok) return null
    return await response.json() as GitHubUser
  } catch {
    return null
  }
}

// Convert D1 row to Feed object
function rowToFeed(row: Record<string, unknown>): Feed {
  return {
    id: row.id as string,
    url: row.url as string,
    domain: row.domain as string,
    title: row.title as string | null,
    description: row.description as string | null,
    feed_type: row.feed_type as string,
    capabilities_count: row.capabilities_count as number,
    version: row.version as string | null,
    score: row.score as number | null,
    signature_valid: Boolean(row.signature_valid),
    submitted_by: row.submitted_by as string | null,
    submitted_at: row.submitted_at as number,
    last_validated: row.last_validated as number | null,
    is_curated: Boolean(row.is_curated),
    is_active: Boolean(row.is_active),
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || env.FRONTEND_URL
    const cors = corsHeaders(origin, env)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    try {
      // Route handling
      const path = url.pathname
      
      // Health check
      if (path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() }, 200, cors)
      }

      // API routes
      if (path.startsWith('/api/feeds')) {
        return handleFeedsAPI(request, env, url, cors)
      }

      return jsonResponse({ error: 'Not Found' }, 404, cors)
    } catch (error) {
      console.error('Worker error:', error)
      return jsonResponse(
        { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
        500,
        cors
      )
    }
  },
}

async function handleFeedsAPI(
  request: Request,
  env: Env,
  url: URL,
  cors: HeadersInit
): Promise<Response> {
  const path = url.pathname
  const method = request.method

  // GET /api/feeds/curated
  if (path === '/api/feeds/curated' && method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT * FROM feeds WHERE is_curated = 1 AND is_active = 1 ORDER BY submitted_at DESC'
    ).all()
    
    const feeds = (result.results || []).map(rowToFeed)
    return jsonResponse({ feeds, total: feeds.length }, 200, cors)
  }

  // GET /api/feeds/:id
  const idMatch = path.match(/^\/api\/feeds\/([^/]+)$/)
  if (idMatch && method === 'GET') {
    const id = idMatch[1]
    const result = await env.DB.prepare(
      'SELECT * FROM feeds WHERE id = ? AND is_active = 1'
    ).bind(id).first()
    
    if (!result) {
      return jsonResponse({ error: 'Feed not found' }, 404, cors)
    }
    
    return jsonResponse({ feed: rowToFeed(result as Record<string, unknown>) }, 200, cors)
  }

  // DELETE /api/feeds/:id
  if (idMatch && method === 'DELETE') {
    const id = idMatch[1]
    
    // Require auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401, cors)
    }
    
    const token = authHeader.slice(7)
    const user = await verifyGitHubToken(token)
    if (!user) {
      return jsonResponse({ error: 'Invalid token' }, 401, cors)
    }

    // Check ownership
    const existing = await env.DB.prepare(
      'SELECT submitted_by FROM feeds WHERE id = ?'
    ).bind(id).first() as { submitted_by: string } | null
    
    if (!existing) {
      return jsonResponse({ error: 'Feed not found' }, 404, cors)
    }
    
    if (existing.submitted_by !== user.login && existing.submitted_by !== 'system') {
      return jsonResponse({ error: 'Forbidden: not the owner' }, 403, cors)
    }

    // Soft delete (set is_active = 0)
    await env.DB.prepare(
      'UPDATE feeds SET is_active = 0 WHERE id = ?'
    ).bind(id).run()
    
    return jsonResponse({ success: true }, 200, cors)
  }

  // GET /api/feeds (list all)
  if (path === '/api/feeds' && method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const search = url.searchParams.get('q')
    const feedType = url.searchParams.get('feed_type')

    let query = 'SELECT * FROM feeds WHERE is_active = 1'
    const params: (string | number)[] = []

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR domain LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    if (feedType) {
      query += ' AND feed_type = ?'
      params.push(feedType)
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const countResult = await env.DB.prepare(countQuery).bind(...params).first() as { count: number }
    const total = countResult?.count || 0

    // Get paginated results
    query += ' ORDER BY is_curated DESC, score DESC, submitted_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await env.DB.prepare(query).bind(...params).all()
    const feeds = (result.results || []).map(rowToFeed)

    return jsonResponse({ 
      feeds, 
      total,
      limit,
      offset,
      hasMore: offset + feeds.length < total
    }, 200, cors)
  }

  // POST /api/feeds (submit new)
  if (path === '/api/feeds' && method === 'POST') {
    // Require auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized: Please sign in with GitHub' }, 401, cors)
    }
    
    const token = authHeader.slice(7)
    const user = await verifyGitHubToken(token)
    if (!user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401, cors)
    }

    // Parse body
    let body: {
      url: string
      title?: string
      description?: string
      feed_type?: string
      capabilities_count?: number
      version?: string
      score?: number
      signature_valid?: boolean
    }
    
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, cors)
    }

    if (!body.url) {
      return jsonResponse({ error: 'URL is required' }, 400, cors)
    }

    // Validate URL
    let feedUrl: URL
    try {
      feedUrl = new URL(body.url)
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400, cors)
    }

    const domain = feedUrl.hostname
    const id = `${domain.replace(/\./g, '-')}-${Date.now()}`

    try {
      // Check for duplicate URL (including inactive entries due to UNIQUE constraint)
      const existing = await env.DB.prepare(
        'SELECT id, is_active FROM feeds WHERE url = ?'
      ).bind(body.url).first<{ id: string; is_active: number }>()
      
      if (existing) {
        if (existing.is_active) {
          return jsonResponse({ error: 'This feed URL has already been submitted' }, 409, cors)
        }
        // Reactivate inactive entry with updated info
        await env.DB.prepare(`
          UPDATE feeds 
          SET title = ?, description = ?, feed_type = ?, capabilities_count = ?, version = ?, 
              score = ?, signature_valid = ?, submitted_by = ?, submitted_at = ?, is_active = 1
          WHERE id = ?
        `).bind(
          body.title || null,
          body.description || null,
          body.feed_type || 'mcp',
          body.capabilities_count || 0,
          body.version || null,
          body.score ?? null,
          body.signature_valid ? 1 : 0,
          user.login,
          Date.now(),
          existing.id
        ).run()
        
        const updated = await env.DB.prepare(
          'SELECT * FROM feeds WHERE id = ?'
        ).bind(existing.id).first()
        
        return jsonResponse({ 
          success: true, 
          feed: rowToFeed(updated as Record<string, unknown>),
          message: 'Feed reactivated successfully'
        }, 200, cors)
      }

      // Insert new feed
      await env.DB.prepare(`
        INSERT INTO feeds (id, url, domain, title, description, feed_type, capabilities_count, version, score, signature_valid, submitted_by, submitted_at, is_curated, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
      `).bind(
        id,
        body.url,
        domain,
        body.title || null,
        body.description || null,
        body.feed_type || 'mcp',
        body.capabilities_count || 0,
        body.version || null,
        body.score ?? null,
        body.signature_valid ? 1 : 0,
        user.login,
        Date.now()
      ).run()

      // Fetch the created feed
      const created = await env.DB.prepare(
        'SELECT * FROM feeds WHERE id = ?'
      ).bind(id).first()

      return jsonResponse({ 
        success: true, 
        feed: rowToFeed(created as Record<string, unknown>),
        message: 'Feed submitted successfully'
      }, 201, cors)
    } catch (dbError) {
      console.error('Database error:', dbError)
      return jsonResponse({ 
        error: 'Database error', 
        message: dbError instanceof Error ? dbError.message : 'Failed to insert feed'
      }, 500, cors)
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, cors)
}
