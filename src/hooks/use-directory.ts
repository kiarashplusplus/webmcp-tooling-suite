import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'

// API base URL - update this after deploying the worker
const DIRECTORY_API_URL = import.meta.env.VITE_DIRECTORY_API_URL || 'https://webmcp-directory.the-safe.workers.dev'

export interface DirectoryFeed {
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

export interface DirectoryListResponse {
  feeds: DirectoryFeed[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface SubmitFeedParams {
  url: string
  title?: string
  description?: string
  feed_type?: string
  capabilities_count?: number
  version?: string
  score?: number
  signature_valid?: boolean
}

interface UseDirectoryReturn {
  // Data
  feeds: DirectoryFeed[]
  curatedFeeds: DirectoryFeed[]
  total: number
  hasMore: boolean
  
  // State
  loading: boolean
  error: string | null
  submitting: boolean
  
  // Actions
  fetchFeeds: (options?: { limit?: number; offset?: number; search?: string; feedType?: string }) => Promise<void>
  fetchCuratedFeeds: () => Promise<void>
  submitFeed: (params: SubmitFeedParams) => Promise<DirectoryFeed | null>
  deleteFeed: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

/**
 * React hook for interacting with the WebMCP Directory API
 * 
 * Usage:
 *   const { feeds, loading, fetchFeeds, submitFeed } = useDirectory()
 */
export function useDirectory(): UseDirectoryReturn {
  const { token } = useAuth()
  
  const [feeds, setFeeds] = useState<DirectoryFeed[]>([])
  const [curatedFeeds, setCuratedFeeds] = useState<DirectoryFeed[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Fetch all feeds with optional filters
  const fetchFeeds = useCallback(async (options?: { 
    limit?: number
    offset?: number
    search?: string
    feedType?: string 
  }) => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', String(options.limit))
      if (options?.offset) params.set('offset', String(options.offset))
      if (options?.search) params.set('q', options.search)
      if (options?.feedType) params.set('feed_type', options.feedType)
      
      const url = `${DIRECTORY_API_URL}/api/feeds${params.toString() ? `?${params}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to fetch feeds: ${response.status}`)
      }
      
      const data: DirectoryListResponse = await response.json()
      
      // If offset > 0, append to existing feeds
      if (options?.offset && options.offset > 0) {
        setFeeds(prev => [...prev, ...data.feeds])
      } else {
        setFeeds(data.feeds)
      }
      
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch feeds'
      setError(message)
      console.error('Directory API error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch curated feeds only
  const fetchCuratedFeeds = useCallback(async () => {
    try {
      const response = await fetch(`${DIRECTORY_API_URL}/api/feeds/curated`, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch curated feeds: ${response.status}`)
      }
      
      const data = await response.json()
      setCuratedFeeds(data.feeds || [])
    } catch (err) {
      console.error('Failed to fetch curated feeds:', err)
    }
  }, [])

  // Submit a new feed
  const submitFeed = useCallback(async (params: SubmitFeedParams): Promise<DirectoryFeed | null> => {
    if (!token) {
      setError('Please sign in to submit a feed')
      return null
    }
    
    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch(`${DIRECTORY_API_URL}/api/feeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(params),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feed')
      }
      
      // Add new feed to local state
      if (data.feed) {
        setFeeds(prev => [data.feed, ...prev])
        setTotal(prev => prev + 1)
      }
      
      return data.feed
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit feed'
      setError(message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [token])

  // Delete a feed
  const deleteFeed = useCallback(async (id: string): Promise<boolean> => {
    if (!token) {
      setError('Please sign in to delete a feed')
      return false
    }
    
    try {
      const response = await fetch(`${DIRECTORY_API_URL}/api/feeds/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete feed')
      }
      
      // Remove from local state
      setFeeds(prev => prev.filter(f => f.id !== id))
      setCuratedFeeds(prev => prev.filter(f => f.id !== id))
      setTotal(prev => prev - 1)
      
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete feed'
      setError(message)
      return false
    }
  }, [token])

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchFeeds(),
      fetchCuratedFeeds(),
    ])
  }, [fetchFeeds, fetchCuratedFeeds])

  // Initial fetch
  useEffect(() => {
    fetchFeeds()
    fetchCuratedFeeds()
  }, [fetchFeeds, fetchCuratedFeeds])

  return {
    feeds,
    curatedFeeds,
    total,
    hasMore,
    loading,
    error,
    submitting,
    fetchFeeds,
    fetchCuratedFeeds,
    submitFeed,
    deleteFeed,
    refresh,
  }
}
