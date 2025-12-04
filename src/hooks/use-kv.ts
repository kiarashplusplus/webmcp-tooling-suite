import { useState, useEffect, useCallback } from 'react'

const STORAGE_PREFIX = 'webmcp-'

/**
 * React hook for persistent key-value storage
 * 
 * Uses localStorage for persistence - works on static hosting (GitHub Pages, Cloudflare Pages)
 * For cloud sync, use the storage.ts module with GitHub Gist provider
 * 
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue] tuple similar to useState
 */
export function useKV<T>(
  key: string, 
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state from localStorage synchronously
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
      if (stored !== null) {
        return JSON.parse(stored) as T
      }
    } catch (e) {
      console.warn(`Failed to parse localStorage key ${key}:`, e)
    }
    return defaultValue
  })

  // Persist to localStorage when value changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn(`Failed to persist key ${key}:`, e)
    }
  }, [key, value])

  // Setter that handles both direct values and updater functions
  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const resolved = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue
      return resolved
    })
  }, [])

  return [value, setStoredValue]
}

// Alias for backward compatibility
export { useKV as useLocalKV }
