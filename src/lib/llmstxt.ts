/**
 * LLMS.txt Parser Library - App Integration
 *
 * Re-exports from @25xcodes/llmstxt-parser with app-specific
 * CORS proxy configuration for browser environments.
 *
 * @see https://llmstxt.org
 */

// Re-export everything from the package
export {
    // Parser
    parseLLMSTxt,
    parseAndValidate,

    // Validator
    validateLLMSTxt,

    // Utilities
    estimateTokens,
    toRAGFormat,
    extractLinksForIndex,

    // Constants
    LLMSTXT_PATHS,

    // Types
    type LLMSTxtDocument,
    type LLMSTxtSection,
    type LLMSTxtLink,
    type LLMSTxtValidationResult,
    type LLMSTxtValidationError,
    type LLMSTxtValidationWarning,
    type TokenEstimate,
    type FetchOptions,
    type DiscoveredFile,
    type RAGLinkEntry,
} from '@25xcodes/llmstxt-parser'

import {
    fetchLLMSTxt as fetchLLMSTxtBase,
    discoverLLMSTxtFiles as discoverLLMSTxtFilesBase,
    type LLMSTxtDocument,
    type FetchOptions,
    type DiscoveredFile,
} from '@25xcodes/llmstxt-parser'

// ============================================================================
// App-specific CORS Proxy Integration
// ============================================================================

/**
 * Get the CORS proxy URL from environment variables or use default deployed worker.
 */
function getCorsProxyUrl(): string | undefined {
    // Vite exposes env vars via import.meta.env
    const proxyUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_CORS_PROXY_URL
    // Fallback to deployed Cloudflare worker
    return proxyUrl || 'https://llmfeed-cors-proxy.the-safe.workers.dev'
}

/**
 * Check if a URL is same-origin or localhost (no proxy needed)
 */
function isSameOriginOrLocal(url: string): boolean {
    try {
        const parsed = new URL(url)
        const current = typeof window !== 'undefined' ? window.location : null

        // Localhost always works without proxy
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return true
        }

        // Same origin
        if (current && parsed.origin === current.origin) {
            return true
        }

        return false
    } catch {
        return false
    }
}

/**
 * Fetch and parse llms.txt with automatic CORS proxy for browser environments.
 *
 * @param urlOrDomain - Full URL to llms.txt file, or domain name to discover
 * @param options - Fetch options (corsProxy auto-configured if not provided)
 * @returns Parsed llms.txt document
 */
export async function fetchLLMSTxt(
    urlOrDomain: string,
    options: Omit<FetchOptions, 'corsProxy'> & { corsProxy?: string } = {}
): Promise<LLMSTxtDocument> {
    // Determine if we need a CORS proxy
    const needsProxy = typeof window !== 'undefined' && !isSameOriginOrLocal(urlOrDomain)
    const corsProxy = options.corsProxy ?? (needsProxy ? getCorsProxyUrl() : undefined)

    return fetchLLMSTxtBase(urlOrDomain, {
        ...options,
        corsProxy,
    })
}

/**
 * Discover all llms.txt files with automatic CORS proxy for browser environments.
 *
 * @param domain - Domain name to check
 * @param options - Fetch options (corsProxy auto-configured if not provided)
 * @returns Array of discovered files
 */
export async function discoverLLMSTxtFiles(
    domain: string,
    options: Omit<FetchOptions, 'corsProxy'> & { corsProxy?: string } = {}
): Promise<DiscoveredFile[]> {
    // Always use CORS proxy for discovery in browser
    const needsProxy = typeof window !== 'undefined'
    const corsProxy = options.corsProxy ?? (needsProxy ? getCorsProxyUrl() : undefined)

    return discoverLLMSTxtFilesBase(domain, {
        ...options,
        corsProxy,
    })
}
