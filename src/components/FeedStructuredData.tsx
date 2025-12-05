import { useEffect } from 'react'
import { useKV } from '@/hooks/use-kv'
import type { ArchivedFeed } from './Archive'

interface FeedMetadata {
  id: string
  url: string
  title: string
  description: string
  feed_type: string
  domain: string
  timestamp: number
  capabilities_count?: number
  version?: string
  author?: string
}

export function FeedStructuredData() {
  const [archivedFeeds] = useKV<FeedMetadata[]>('archived-feeds', [])
  const [archives] = useKV<Record<string, ArchivedFeed>>('webmcp-archives', {})

  useEffect(() => {
    if (!archivedFeeds || archivedFeeds.length === 0) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'feed-structured-data'

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'LLMFeed Directory',
      description: 'Validated and archived LLM feeds with WebMCP capabilities',
      itemListElement: archivedFeeds.map((feed, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'DataFeed',
          '@id': feed.url,
          name: feed.title,
          description: feed.description,
          url: feed.url,
          provider: {
            '@type': 'Organization',
            name: feed.author || feed.domain
          },
          datePublished: new Date(feed.timestamp).toISOString(),
          version: feed.version || '1.0.0',
          inLanguage: 'en',
          encodingFormat: 'application/json',
          potentialAction: {
            '@type': 'ConsumeAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: feed.url,
              encodingType: 'application/json'
            }
          }
        }
      }))
    }

    script.textContent = JSON.stringify(structuredData)

    const existingScript = document.getElementById('feed-structured-data')
    if (existingScript) {
      existingScript.remove()
    }

    document.head.appendChild(script)

    return () => {
      const scriptToRemove = document.getElementById('feed-structured-data')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [archivedFeeds])

  useEffect(() => {
    if (!archives || Object.keys(archives).length === 0) return

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'archive-structured-data'

    const allSnapshots = Object.values(archives).flatMap(archive =>
      archive.snapshots.map(snapshot => ({
        snapshot,
        domain: archive.domain
      }))
    )

    // Get the base path from the current pathname (e.g., /webmcp-tooling-suite/)
    const pathname = window.location.pathname
    const basePath = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '')
    const siteBaseUrl = `${window.location.origin}${basePath}`

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'DataCatalog',
      name: 'WebMCP Feed Archive',
      description: 'Timestamped snapshots of LLM feeds with cryptographic verification',
      url: `${siteBaseUrl}/archive/`,
      dataset: allSnapshots.map(({ snapshot, domain }) => ({
        '@type': 'Dataset',
        '@id': `${siteBaseUrl}/archive/${snapshot.id}.json`,
        name: `${snapshot.feed.metadata?.title || domain} (Archived)`,
        description: snapshot.feed.metadata?.description || `Archived LLM feed from ${domain}`,
        url: `${siteBaseUrl}/archive/${snapshot.id}.json`,
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `${siteBaseUrl}/archive/${snapshot.id}.json`
        },
        datePublished: new Date(snapshot.timestamp).toISOString(),
        creator: {
          '@type': 'Organization',
          name: domain
        },
        isBasedOn: snapshot.feed.metadata?.origin || `https://${domain}/.well-known/mcp.llmfeed.json`,
        version: snapshot.feed.metadata?.version || '1.0.0'
      }))
    }

    script.textContent = JSON.stringify(structuredData)

    const existingScript = document.getElementById('archive-structured-data')
    if (existingScript) {
      existingScript.remove()
    }

    document.head.appendChild(script)

    return () => {
      const scriptToRemove = document.getElementById('archive-structured-data')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [archives])

  return null
}
