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
    // Check for OAuth callback first (hash contains auth data from worker)
    if (window.location.hash.startsWith('#auth=')) {
      handleHashCallback()
    } else {
      loadUser()
    }
  }, [])

  // Handle OAuth callback from URL hash
  const handleHashCallback = () => {
    setLoading(true)
    try {
      const hash = window.location.hash
      const authData = new URLSearchParams(hash.slice(6)) // Remove '#auth='
      
      const error = authData.get('error')
      if (error) {
        console.error('OAuth error:', error, authData.get('error_description'))
        window.history.replaceState(null, '', window.location.pathname)
        loadUser() // Fall back to loading stored user
        return
      }

      const token = authData.get('token')
      const userJson = authData.get('user')

      if (token && userJson) {
        const userInfo = JSON.parse(userJson) as Omit<UserInfo, 'isOwner'>
        const fullUserInfo: UserInfo = {
          ...userInfo,
          isOwner: false,
        }

        localStorage.setItem('webmcp-github-token', token)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUserInfo))
        setUser(fullUserInfo)
        
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname)
      } else {
        loadUser()
      }
    } catch (err) {
      console.error('OAuth callback failed:', err)
      window.history.replaceState(null, '', window.location.pathname)
      loadUser()
    } finally {
      setLoading(false)
    }
  }

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
    localStorage.removeItem('webmcp-github-token')
    setUser(null)
  }, [])

  // Handle OAuth callback from URL hash (called on page load)
  // The Cloudflare Worker redirects with: #auth=token=xxx&user={"login":"..."}
  const handleOAuthCallback = useCallback((): boolean => {
    const hash = window.location.hash
    if (!hash.startsWith('#auth=')) {
      return false
    }

    try {
      // Parse the auth data from hash
      const authData = new URLSearchParams(hash.slice(6)) // Remove '#auth='
      
      const error = authData.get('error')
      if (error) {
        console.error('OAuth error:', error, authData.get('error_description'))
        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname)
        return false
      }

      const token = authData.get('token')
      const userJson = authData.get('user')

      if (!token || !userJson) {
        console.error('Missing token or user in OAuth callback')
        window.history.replaceState(null, '', window.location.pathname)
        return false
      }

      const userInfo = JSON.parse(userJson) as Omit<UserInfo, 'isOwner'>
      const fullUserInfo: UserInfo = {
        ...userInfo,
        isOwner: false, // Can be determined later if needed
      }

      // Store token and user
      localStorage.setItem('webmcp-github-token', token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullUserInfo))
      setUser(fullUserInfo)

      // Clear the hash from URL (keeps it out of history)
      window.history.replaceState(null, '', window.location.pathname)
      
      return true
    } catch (err) {
      console.error('OAuth callback parsing failed:', err)
      window.history.replaceState(null, '', window.location.pathname)
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
