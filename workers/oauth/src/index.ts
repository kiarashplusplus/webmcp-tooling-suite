/**
 * Cloudflare Worker for GitHub OAuth
 * 
 * Handles the OAuth flow securely, keeping the client secret on the server.
 * 
 * Endpoints:
 *   GET /auth     - Initiates OAuth flow, redirects to GitHub
 *   GET /callback - Handles GitHub callback, exchanges code for token
 * 
 * Setup:
 *   1. Create GitHub OAuth App at https://github.com/settings/developers
 *   2. Set callback URL to: https://<worker-name>.<subdomain>.workers.dev/callback
 *   3. Deploy worker: wrangler deploy
 *   4. Set secrets:
 *      wrangler secret put GITHUB_CLIENT_ID
 *      wrangler secret put GITHUB_CLIENT_SECRET
 */

export interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  FRONTEND_URL: string
}

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'

// CORS headers for cross-origin requests from your frontend
function corsHeaders(origin: string, env: Env): HeadersInit {
  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:5000',
    'http://localhost:5173',
  ]
  
  const allowOrigin = allowedOrigins.includes(origin) ? origin : env.FRONTEND_URL
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || env.FRONTEND_URL

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin, env),
      })
    }

    try {
      switch (url.pathname) {
        case '/auth':
          return handleAuth(url, env)
        case '/callback':
          return handleCallback(url, env)
        case '/health':
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) },
          })
        default:
          return new Response('Not Found', { status: 404 })
      }
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}

/**
 * Initiates the OAuth flow by redirecting to GitHub
 */
function handleAuth(url: URL, env: Env): Response {
  // Generate a random state for CSRF protection
  const state = crypto.randomUUID()
  
  // Optional: get redirect URL from query param (for deep linking)
  const redirectAfter = url.searchParams.get('redirect') || '/'
  
  // Encode the redirect in state (simple approach - for production, use encrypted state)
  const stateWithRedirect = btoa(JSON.stringify({ state, redirect: redirectAfter }))

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/callback`,
    scope: 'read:user user:email gist', // gist scope for cloud sync
    state: stateWithRedirect,
  })

  return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302)
}

/**
 * Handles the OAuth callback from GitHub
 * Exchanges the code for a token, fetches user info, and redirects to frontend
 */
async function handleCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return redirectToFrontend(env.FRONTEND_URL, {
      error: error,
      error_description: url.searchParams.get('error_description') || 'OAuth error',
    })
  }

  if (!code) {
    return redirectToFrontend(env.FRONTEND_URL, {
      error: 'missing_code',
      error_description: 'No authorization code received',
    })
  }

  // Exchange code for access token
  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: `${url.origin}/callback`,
    }),
  })

  const tokenData = await tokenResponse.json() as {
    access_token?: string
    error?: string
    error_description?: string
  }

  if (tokenData.error || !tokenData.access_token) {
    return redirectToFrontend(env.FRONTEND_URL, {
      error: tokenData.error || 'token_error',
      error_description: tokenData.error_description || 'Failed to get access token',
    })
  }

  // Fetch user info from GitHub
  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'WebMCP-OAuth-Worker',
    },
  })

  if (!userResponse.ok) {
    return redirectToFrontend(env.FRONTEND_URL, {
      error: 'user_fetch_error',
      error_description: 'Failed to fetch user info',
    })
  }

  const userData = await userResponse.json() as {
    login: string
    avatar_url: string
    email: string | null
    id: number
  }

  // Parse redirect from state if present
  let redirectPath = '/'
  if (state) {
    try {
      const stateData = JSON.parse(atob(state))
      redirectPath = stateData.redirect || '/'
    } catch {
      // Invalid state, use default redirect
    }
  }

  // Redirect to frontend with user data
  // The token is passed so the frontend can make authenticated API calls
  return redirectToFrontend(env.FRONTEND_URL + redirectPath, {
    token: tokenData.access_token,
    user: JSON.stringify({
      login: userData.login,
      avatarUrl: userData.avatar_url,
      email: userData.email,
      id: userData.id,
    }),
  })
}

/**
 * Redirects to the frontend with data in URL hash (fragment)
 * Using hash keeps data out of server logs and browser history
 */
function redirectToFrontend(baseUrl: string, data: Record<string, string>): Response {
  const params = new URLSearchParams(data)
  const redirectUrl = `${baseUrl}#auth=${params.toString()}`
  
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <script>window.location.href = "${redirectUrl}";</script>
</head>
<body>
  Redirecting...
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}
