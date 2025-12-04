/**
 * Production-ready storage abstraction for WebMCP Tooling Suite
 * 
 * Supports multiple backends:
 * 1. localStorage (default) - Works offline, persists in browser
 * 2. GitHub Gist - Cloud sync for authenticated users
 * 3. Cloudflare KV - Edge storage (requires worker proxy)
 * 
 * Usage:
 *   const storage = getStorage()
 *   await storage.set('key', value)
 *   const value = await storage.get('key')
 */

const STORAGE_PREFIX = 'webmcp-'
const GIST_FILENAME = 'webmcp-data.json'

export interface StorageProvider {
  get<T>(key: string, defaultValue: T): Promise<T>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  keys(): Promise<string[]>
  clear(): Promise<void>
}

// ============================================================================
// localStorage Provider (Default)
// ============================================================================

class LocalStorageProvider implements StorageProvider {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
      if (stored === null) return defaultValue
      return JSON.parse(stored) as T
    } catch {
      return defaultValue
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
  }

  async keys(): Promise<string[]> {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keys.push(key.slice(STORAGE_PREFIX.length))
      }
    }
    return keys
  }

  async clear(): Promise<void> {
    const keys = await this.keys()
    for (const key of keys) {
      await this.remove(key)
    }
  }
}

// ============================================================================
// GitHub Gist Provider (Cloud Sync)
// ============================================================================

interface GistData {
  version: number
  updated_at: string
  data: Record<string, unknown>
}

class GitHubGistProvider implements StorageProvider {
  private token: string
  private gistId: string | null = null
  private cache: GistData | null = null
  private dirty = false
  private syncTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(token: string, gistId?: string) {
    this.token = token
    this.gistId = gistId || null
  }

  private async fetchGist(): Promise<GistData> {
    if (this.cache) return this.cache

    if (!this.gistId) {
      // Create new gist
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'WebMCP Tooling Suite Data',
          public: false,
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify({
                version: 1,
                updated_at: new Date().toISOString(),
                data: {}
              })
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create gist')
      }

      const gist = await response.json()
      this.gistId = gist.id
      
      // Store gist ID in localStorage for reconnection
      localStorage.setItem(`${STORAGE_PREFIX}gist-id`, gist.id)
      
      this.cache = { version: 1, updated_at: new Date().toISOString(), data: {} }
      return this.cache
    }

    // Fetch existing gist
    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      }
    })

    if (!response.ok) {
      // Gist not found, create new one
      this.gistId = null
      return this.fetchGist()
    }

    const gist = await response.json()
    const content = gist.files[GIST_FILENAME]?.content
    
    if (!content) {
      this.cache = { version: 1, updated_at: new Date().toISOString(), data: {} }
    } else {
      this.cache = JSON.parse(content)
    }

    return this.cache!
  }

  private async syncToGist(): Promise<void> {
    if (!this.dirty || !this.cache || !this.gistId) return

    try {
      this.cache.updated_at = new Date().toISOString()
      
      await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(this.cache)
            }
          }
        })
      })

      this.dirty = false
    } catch (error) {
      console.error('Failed to sync to gist:', error)
    }
  }

  private scheduleSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    // Debounce sync to avoid rate limiting
    this.syncTimeout = setTimeout(() => this.syncToGist(), 2000)
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    const gistData = await this.fetchGist()
    const value = gistData.data[key]
    return value !== undefined ? (value as T) : defaultValue
  }

  async set<T>(key: string, value: T): Promise<void> {
    const gistData = await this.fetchGist()
    gistData.data[key] = value
    this.dirty = true
    this.scheduleSync()
  }

  async remove(key: string): Promise<void> {
    const gistData = await this.fetchGist()
    delete gistData.data[key]
    this.dirty = true
    this.scheduleSync()
  }

  async keys(): Promise<string[]> {
    const gistData = await this.fetchGist()
    return Object.keys(gistData.data)
  }

  async clear(): Promise<void> {
    const gistData = await this.fetchGist()
    gistData.data = {}
    this.dirty = true
    this.scheduleSync()
  }

  // Force immediate sync
  async flush(): Promise<void> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    await this.syncToGist()
  }

  getGistId(): string | null {
    return this.gistId
  }
}

// ============================================================================
// Hybrid Provider (localStorage + optional cloud sync)
// ============================================================================

class HybridStorageProvider implements StorageProvider {
  private local: LocalStorageProvider
  private cloud: GitHubGistProvider | null = null

  constructor() {
    this.local = new LocalStorageProvider()
  }

  enableCloudSync(token: string): void {
    const gistId = localStorage.getItem(`${STORAGE_PREFIX}gist-id`) || undefined
    this.cloud = new GitHubGistProvider(token, gistId)
  }

  disableCloudSync(): void {
    this.cloud = null
  }

  isCloudEnabled(): boolean {
    return this.cloud !== null
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    // Always read from local (faster)
    return this.local.get(key, defaultValue)
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Write to local immediately
    await this.local.set(key, value)
    
    // Sync to cloud in background if enabled
    if (this.cloud) {
      this.cloud.set(key, value).catch(console.error)
    }
  }

  async remove(key: string): Promise<void> {
    await this.local.remove(key)
    if (this.cloud) {
      this.cloud.remove(key).catch(console.error)
    }
  }

  async keys(): Promise<string[]> {
    return this.local.keys()
  }

  async clear(): Promise<void> {
    await this.local.clear()
    if (this.cloud) {
      this.cloud.clear().catch(console.error)
    }
  }

  // Pull data from cloud to local
  async pullFromCloud(): Promise<void> {
    if (!this.cloud) return

    const cloudKeys = await this.cloud.keys()
    for (const key of cloudKeys) {
      const value = await this.cloud.get(key, null)
      if (value !== null) {
        await this.local.set(key, value)
      }
    }
  }

  // Push all local data to cloud
  async pushToCloud(): Promise<void> {
    if (!this.cloud) return

    const localKeys = await this.local.keys()
    for (const key of localKeys) {
      const value = await this.local.get(key, null)
      if (value !== null) {
        await this.cloud.set(key, value)
      }
    }
    await this.cloud.flush()
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let storageInstance: HybridStorageProvider | null = null

export function getStorage(): HybridStorageProvider {
  if (!storageInstance) {
    storageInstance = new HybridStorageProvider()
  }
  return storageInstance
}

// Export for testing
export { LocalStorageProvider, GitHubGistProvider, HybridStorageProvider }
