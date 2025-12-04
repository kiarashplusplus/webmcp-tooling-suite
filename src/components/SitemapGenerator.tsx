import { useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
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

export function SitemapGenerator() {
  const [archivedFeeds] = useKV<FeedMetadata[]>('archived-feeds', [])
  const [archives] = useKV<Record<string, ArchivedFeed>>('webmcp-archives', {})

  useEffect(() => {
    const generateSitemap = () => {
      const baseUrl = window.location.origin
      const now = new Date().toISOString()

      const urls = [
        {
          loc: baseUrl,
          lastmod: now,
          changefreq: 'daily',
          priority: '1.0'
        },
        {
          loc: `${baseUrl}/#directory`,
          lastmod: now,
          changefreq: 'hourly',
          priority: '0.9'
        },
        {
          loc: `${baseUrl}/#validator`,
          lastmod: now,
          changefreq: 'weekly',
          priority: '0.8'
        },
        {
          loc: `${baseUrl}/#discovery`,
          lastmod: now,
          changefreq: 'weekly',
          priority: '0.8'
        },
        {
          loc: `${baseUrl}/#archive`,
          lastmod: now,
          changefreq: 'daily',
          priority: '0.9'
        },
        {
          loc: `${baseUrl}/#rag`,
          lastmod: now,
          changefreq: 'weekly',
          priority: '0.7'
        }
      ]

      if (archives) {
        Object.values(archives).forEach(archive => {
          archive.snapshots.forEach(snapshot => {
            urls.push({
              loc: `${baseUrl}/archive/${snapshot.id}.json`,
              lastmod: new Date(snapshot.timestamp).toISOString(),
              changefreq: 'never',
              priority: '0.6'
            })
          })
        })
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`

      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('link')
      link.rel = 'sitemap'
      link.type = 'application/xml'
      link.href = url
      
      const existingLink = document.querySelector('link[rel="sitemap"]')
      if (existingLink) {
        existingLink.remove()
      }
      
      document.head.appendChild(link)

      const metaTag = document.createElement('meta')
      metaTag.name = 'sitemap'
      metaTag.content = `${baseUrl}/sitemap.xml`
      
      const existingMeta = document.querySelector('meta[name="sitemap"]')
      if (existingMeta) {
        existingMeta.remove()
      }
      
      document.head.appendChild(metaTag)
    }

    generateSitemap()
  }, [archives, archivedFeeds])

  return null
}
