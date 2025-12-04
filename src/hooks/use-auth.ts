import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'webmcp-user'

export interface UserInfo {
  login: string
  avatarUrl: string
  email?: string
  id: number
  isOwner: boolean
}

/**
 * Authentication hook for WebMCP Tooling Suite
 * 
 * For static hosting (GitHub Pages, Cloudflare Pages), authentication is optional.
 * Users can use all features without signing in - auth only enables cloud sync
 * and publishing attribution.
 * 
 * Authentication options:
 * 1. Anonymous (default) - all features work, data stored locally
 * 2. GitHub OAuth - requires serverless function (Cloudflare Worker, Netlify Function)
 *    or can be configured to use a backend
 * 
 * For development: Sign-in is simulated with a local user
 */
export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    setLoading(true)
    try {
      // Check for stored user (from previous OAuth flow or dev mode)
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUser(JSON.parse(stored))
      } else {
        setUser(null)
      }
    } catch (err) {
      console.warn('Failed to load user:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Sign in handler - for static sites, this initiates OAuth flow
  const signIn = useCallback(async () => {
    // Check if we have a GitHub OAuth endpoint configured
    const oauthEndpoint = import.meta.env.VITE_GITHUB_OAUTH_URL
    
    if (oauthEndpoint) {
      // Redirect to OAuth endpoint (Cloudflare Worker, Netlify Function, etc.)
      window.location.href = oauthEndpoint
      return
    }

    // Development mode: create a mock user
    if (import.meta.env.DEV) {
      const mockUser: UserInfo = {
        login: 'dev-user',
        avatarUrl: 'https://github.com/github.png',
        email: 'dev@localhost',
        id: 0,
        isOwner: false
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser))
      setUser(mockUser)
      return
    }

    // No OAuth configured - show a helpful message
    console.warn(
      'GitHub OAuth not configured. Set VITE_GITHUB_OAUTH_URL to enable authentication.\n' +
      'See README.md for Cloudflare Worker setup instructions.'
    )
  }, [])

  // Sign out handler
  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  // Handle OAuth callback (call this from a route handler or on page load)
  const handleOAuthCallback = useCallback(async (code: string) => {
    const tokenEndpoint = import.meta.env.VITE_GITHUB_TOKEN_URL
    
    if (!tokenEndpoint) {
      console.error('VITE_GITHUB_TOKEN_URL not configured')
      return false
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      if (!response.ok) {
        throw new Error('Token exchange failed')
      }

      const { user: userInfo } = await response.json()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userInfo))
      setUser(userInfo)
      return true
    } catch (err) {
      console.error('OAuth callback failed:', err)
      return false
    }
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    handleOAuthCallback,
    refresh: loadUser
  }
}
