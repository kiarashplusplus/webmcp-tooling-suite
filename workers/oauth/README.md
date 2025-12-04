# WebMCP OAuth Worker

Cloudflare Worker that handles GitHub OAuth for the WebMCP Tooling Suite.

## Setup

### 1. Create GitHub OAuth App

Go to https://github.com/settings/developers and create a new OAuth App:

- **Application name**: WebMCP Tooling Suite
- **Homepage URL**: `https://kiarashplusplus.github.io/webmcp-tooling-suite`
- **Authorization callback URL**: `https://webmcp-oauth.<your-subdomain>.workers.dev/callback`

Save the **Client ID** and generate a **Client Secret**.

### 2. Install Dependencies

```bash
cd workers/oauth
npm install
```

### 3. Login to Cloudflare

```bash
npx wrangler login
```

### 4. Deploy the Worker

```bash
npm run deploy
```

After deploying, you'll get a URL like `https://webmcp-oauth.<subdomain>.workers.dev`.

**Update your GitHub OAuth App** callback URL to match this.

### 5. Set Secrets

```bash
npx wrangler secret put GITHUB_CLIENT_ID
# Enter your GitHub OAuth App Client ID

npx wrangler secret put GITHUB_CLIENT_SECRET
# Enter your GitHub OAuth App Client Secret
```

### 6. Configure Frontend

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

- `VITE_GITHUB_OAUTH_URL`: `https://webmcp-oauth.<subdomain>.workers.dev/auth`

Then update `.github/workflows/deploy.yml` to use the secret:

```yaml
- run: npm run build
  env:
    VITE_GITHUB_OAUTH_URL: ${{ secrets.VITE_GITHUB_OAUTH_URL }}
```

## Local Development

```bash
npm run dev
```

This starts the worker locally at `http://localhost:8787`.

For local testing, temporarily update your GitHub OAuth App callback URL to `http://localhost:8787/callback`.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /auth` | Initiates OAuth flow, redirects to GitHub |
| `GET /callback` | Handles GitHub callback, redirects to frontend with token |
| `GET /health` | Health check endpoint |

## Security Notes

- Client Secret is stored securely in Cloudflare secrets (never exposed to frontend)
- CSRF protection via state parameter
- Token passed via URL fragment (hash) to avoid server logs
- CORS restricted to allowed origins
