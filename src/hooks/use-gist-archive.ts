import { useState, useCallback } from 'react'
import { useAuth } from './use-auth'

export interface GistArchive {
  id: string
  url: string
  rawUrl: string
  htmlUrl: string
  description: string
  filename: string
  createdAt: string
  updatedAt: string
  domain: string
  revisions: number
}

export interface GistCreateResult {
  id: string
  url: string
  rawUrl: string
  htmlUrl: string
}

const GIST_API = 'https://api.github.com/gists'
const ARCHIVE_PREFIX = 'webmcp-archive-'

/**
 * Hook for managing LLMFeed archives as GitHub Gists
 * 
 * Benefits:
 * - Versioned: Gists have full revision history
 * - Free: No storage costs
 * - Public URLs: Raw URLs work for JSON consumption
 * - User-owned: Archives belong to the user's GitHub account
 */
export function useGistArchive() {
  const { token, user, isAuthenticated } = useAuth()
  const [archives, setArchives] = useState<GistArchive[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Create or update an archived feed as a Gist
   */
  const archiveToGist = useCallback(async (
    domain: string,
    feed: unknown,
    metadata: {
      validationScore?: number
      signatureValid?: boolean
      feedUrl?: string
    }
  ): Promise<GistCreateResult | null> => {
    if (!token || !isAuthenticated) {
      setError('Authentication required to archive to GitHub')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Create the archive payload
      const archiveData = {
        archived_at: new Date().toISOString(),
        archived_by: user?.login,
        domain,
        source_url: metadata.feedUrl || `https://${domain}/.well-known/mcp.llmfeed.json`,
        validation_score: metadata.validationScore,
        signature_valid: metadata.signatureValid,
        feed
      }

      const filename = `${ARCHIVE_PREFIX}${domain.replace(/\./g, '-')}.json`
      const description = `WebMCP LLMFeed Archive: ${domain} | Archived ${new Date().toISOString().split('T')[0]}`

      // IMPORTANT: Fetch current archives to check for existing gist
      // This ensures we update existing gists rather than creating duplicates
      let currentArchives = archives
      if (currentArchives.length === 0) {
        // Fetch from GitHub if local state is empty
        const response = await fetch(`${GIST_API}?per_page=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
          }
        })

        if (response.ok) {
          const gists = await response.json() as Array<{
            id: string
            description: string
            files: Record<string, { filename: string }>
          }>

          // Find existing gist by filename (not domain, since domain can have prefix)
          const existingByFile = gists.find(gist =>
            Object.keys(gist.files || {}).some(f => f === filename)
          )

          if (existingByFile) {
            currentArchives = [{
              id: existingByFile.id,
              domain,
              url: '',
              rawUrl: '',
              htmlUrl: '',
              description: existingByFile.description,
              filename,
              createdAt: '',
              updatedAt: '',
              revisions: 1
            }]
          }
        }
      }

      // Check if a gist already exists for this domain (by filename match)
      const existingGist = currentArchives.find(a =>
        a.filename === filename || a.domain === domain
      )

      let response: Response
      let gistData: {
        id: string
        html_url: string
        files: Record<string, { raw_url: string }>
        history?: Array<unknown>
      }

      if (existingGist) {
        // Update existing gist (creates a new revision)
        response = await fetch(`${GIST_API}/${existingGist.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description,
            files: {
              [filename]: {
                content: JSON.stringify(archiveData, null, 2)
              }
            }
          })
        })
      } else {
        // Create new gist
        response = await fetch(GIST_API, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description,
            public: true,
            files: {
              [filename]: {
                content: JSON.stringify(archiveData, null, 2)
              }
            }
          })
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(errorData.message || `GitHub API error: ${response.status}`)
      }

      gistData = await response.json() as {
        id: string
        html_url: string
        files: Record<string, { raw_url: string }>
        history?: Array<unknown>
      }
      const file = Object.values(gistData.files)[0]

      const result: GistCreateResult = {
        id: gistData.id,
        url: `${GIST_API}/${gistData.id}`,
        rawUrl: file.raw_url,
        htmlUrl: gistData.html_url
      }

      // Update local archives state (will be refreshed on next mount or explicit call)
      // We update the domain in local state to prevent duplicates on subsequent calls
      setArchives(prev => {
        const existingIndex = prev.findIndex(a => a.filename === filename || a.domain === domain)
        const newArchive: GistArchive = {
          id: gistData.id,
          url: `${GIST_API}/${gistData.id}`,
          rawUrl: file.raw_url,
          htmlUrl: gistData.html_url,
          description,
          filename,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          domain,
          revisions: existingIndex >= 0 ? (prev[existingIndex].revisions + 1) : 1
        }

        if (existingIndex >= 0) {
          // Update existing
          const updated = [...prev]
          updated[existingIndex] = newArchive
          return updated
        } else {
          // Add new
          return [newArchive, ...prev]
        }
      })

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive to Gist'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [token, isAuthenticated, user, archives])

  /**
   * Fetch all WebMCP archives from user's Gists
   */
  const fetchArchives = useCallback(async (): Promise<GistArchive[]> => {
    if (!token || !isAuthenticated) {
      setArchives([])
      return []
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${GIST_API}?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const gists = await response.json() as Array<{
        id: string
        description: string
        html_url: string
        created_at: string
        updated_at: string
        files: Record<string, { filename: string; raw_url: string }>
        history?: Array<unknown>
      }>

      // Filter for WebMCP archives
      const webmcpArchives: GistArchive[] = gists
        .filter(gist => {
          const files = Object.keys(gist.files || {})
          return files.some(f => f.startsWith(ARCHIVE_PREFIX))
        })
        .map(gist => {
          const filename = Object.keys(gist.files).find(f => f.startsWith(ARCHIVE_PREFIX)) || ''
          const file = gist.files[filename]

          // Parse domain from filename, preserving structure
          // Filename format: webmcp-archive-{domain-with-hyphens}.json
          // We need to restore dots only in the actual domain part, not prefixes like "llmstxt-"
          let domainPart = filename
            .replace(ARCHIVE_PREFIX, '')  // "llmstxt-cursor-com.json" or "cursor-com.json"
            .replace('.json', '')          // "llmstxt-cursor-com" or "cursor-com"

          // Check if it has a mode prefix (llmstxt-)
          let domain: string
          if (domainPart.startsWith('llmstxt.')) {
            // Already has dots (from previous version)
            domain = domainPart
          } else if (domainPart.startsWith('llmstxt-')) {
            // Preserve the llmstxt- prefix, only convert remaining hyphens to dots
            const actualDomain = domainPart.substring('llmstxt-'.length).replace(/-/g, '.')
            domain = `llmstxt-${actualDomain}`
          } else {
            // Regular domain - convert all hyphens to dots
            domain = domainPart.replace(/-/g, '.')
          }

          return {
            id: gist.id,
            url: `${GIST_API}/${gist.id}`,
            rawUrl: file?.raw_url || '',
            htmlUrl: gist.html_url,
            description: gist.description || '',
            filename,
            createdAt: gist.created_at,
            updatedAt: gist.updated_at,
            domain,
            revisions: gist.history?.length || 1
          }
        })

      setArchives(webmcpArchives)
      return webmcpArchives
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch archives'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [token, isAuthenticated])

  /**
   * Get a specific archive's content and revision history
   */
  const getArchiveDetails = useCallback(async (gistId: string): Promise<{
    content: unknown
    revisions: Array<{
      version: string
      committedAt: string
      rawUrl: string
    }>
  } | null> => {
    if (!token) {
      setError('Authentication required')
      return null
    }

    try {
      const response = await fetch(`${GIST_API}/${gistId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      })

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const gist = await response.json() as {
        files: Record<string, { content: string; raw_url: string }>
        history: Array<{
          version: string
          committed_at: string
          url: string
        }>
      }
      const file = Object.values(gist.files)[0]

      return {
        content: JSON.parse(file.content),
        revisions: gist.history.map((h) => ({
          version: h.version,
          committedAt: h.committed_at,
          rawUrl: `https://gist.githubusercontent.com/raw/${gistId}/${h.version}`
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get archive details'
      setError(message)
      return null
    }
  }, [token])

  /**
   * Delete an archive Gist
   */
  const deleteArchive = useCallback(async (gistId: string): Promise<boolean> => {
    if (!token || !isAuthenticated) {
      setError('Authentication required')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${GIST_API}/${gistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
        }
      })

      if (!response.ok && response.status !== 204) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      // Update local state
      setArchives(prev => prev.filter(a => a.id !== gistId))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete archive'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [token, isAuthenticated])

  return {
    archives,
    loading,
    error,
    archiveToGist,
    fetchArchives,
    getArchiveDetails,
    deleteArchive,
    isAuthenticated
  }
}
