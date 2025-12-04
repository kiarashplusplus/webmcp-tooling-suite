import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@github/spark/hooks'
import type { ArchivedFeed } from './Archive'
import { toast } from 'sonner'
import { 
  TrendUp, 
  Clock, 
  FileJs, 
  Globe,
  Tag,
  Calendar,
  ArrowUpRight,
  Archive
} from '@phosphor-icons/react'

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

const SAMPLE_FEEDS: FeedMetadata[] = [
  {
    id: '1',
    url: 'https://example.com/.well-known/llmfeed.json',
    title: 'Example API Gateway',
    description: 'Production-ready API gateway with authentication and rate limiting capabilities',
    feed_type: 'webmcp',
    domain: 'example.com',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    capabilities_count: 12,
    version: '1.0.0',
    author: 'Example Corp'
  },
  {
    id: '2',
    url: 'https://demo.llmfeed.io/api/feed.json',
    title: 'Demo LLM Tools',
    description: 'Collection of utility tools for text processing and data transformation',
    feed_type: 'llmfeed',
    domain: 'demo.llmfeed.io',
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    capabilities_count: 8,
    version: '2.1.0',
    author: 'LLMFeed Community'
  },
  {
    id: '3',
    url: 'https://api.acme.dev/.well-known/llmfeed.json',
    title: 'ACME Developer Platform',
    description: 'Enterprise-grade development tools and AI-powered code analysis',
    feed_type: 'webmcp',
    domain: 'api.acme.dev',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    capabilities_count: 25,
    version: '3.2.1',
    author: 'ACME Inc'
  },
  {
    id: '4',
    url: 'https://tools.ai-agent.cloud/llmfeed.json',
    title: 'AI Agent Toolkit',
    description: 'Comprehensive agent capabilities for web scraping, data extraction, and analysis',
    feed_type: 'llmfeed',
    domain: 'tools.ai-agent.cloud',
    timestamp: Date.now() - 1000 * 60 * 30,
    capabilities_count: 15,
    version: '1.5.2',
    author: 'AI Agent Labs'
  },
  {
    id: '5',
    url: 'https://feeds.opentools.org/.well-known/llmfeed.json',
    title: 'OpenTools Collection',
    description: 'Open-source LLM capabilities for document processing and semantic search',
    feed_type: 'webmcp',
    domain: 'feeds.opentools.org',
    timestamp: Date.now() - 1000 * 60 * 60 * 12,
    capabilities_count: 18,
    version: '2.0.0',
    author: 'OpenTools Foundation'
  },
  {
    id: '6',
    url: 'https://api.databridge.io/feeds/main.json',
    title: 'DataBridge Integration Hub',
    description: 'Connect and sync data across multiple platforms with automated workflows',
    feed_type: 'llmfeed',
    domain: 'api.databridge.io',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    capabilities_count: 22,
    version: '4.1.0',
    author: 'DataBridge Team'
  }
]

export function Directory() {
  const [archivedFeeds] = useKV<FeedMetadata[]>('archived-feeds', [])
  const [archives] = useKV<Record<string, ArchivedFeed>>('webmcp-archives', {})
  const [allFeeds, setAllFeeds] = useState<FeedMetadata[]>(SAMPLE_FEEDS)

  useEffect(() => {
    const combined = [...SAMPLE_FEEDS, ...(archivedFeeds || [])]
    const unique = Array.from(
      new Map(combined.map(feed => [feed.id, feed])).values()
    )
    setAllFeeds(unique)
  }, [archivedFeeds])

  const topFeeds = [...allFeeds]
    .sort((a, b) => (b.capabilities_count || 0) - (a.capabilities_count || 0))
    .slice(0, 10)

  const latestFeeds = [...allFeeds]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getArchivedSnapshotUrl = (feedId: string) => {
    const baseUrl = window.location.origin
    return `${baseUrl}/archive/${feedId}.json`
  }

  const findArchivedSnapshot = (feedId: string) => {
    if (!archives) return null
    
    for (const archiveDomain of Object.values(archives)) {
      const snapshot = archiveDomain.snapshots.find(s => s.id === feedId)
      if (snapshot) return snapshot
    }
    return null
  }

  const handleViewArchivedMirror = (feed: FeedMetadata) => {
    const archiveUrl = getArchivedSnapshotUrl(feed.id)
    window.open(archiveUrl, '_blank')
  }

  const handleDownloadArchivedMirror = (feed: FeedMetadata) => {
    const snapshot = findArchivedSnapshot(feed.id)
    if (snapshot) {
      const servedData = {
        snapshot_id: snapshot.id,
        domain: snapshot.domain,
        archived_at: new Date(snapshot.timestamp).toISOString(),
        archive_url: getArchivedSnapshotUrl(snapshot.id),
        feed_url: snapshot.feed.metadata.origin || `https://${snapshot.domain}/.well-known/mcp.llmfeed.json`,
        validation_score: snapshot.validationScore,
        signature_valid: snapshot.signatureValid,
        feed: snapshot.feed
      }
      
      const blob = new Blob([JSON.stringify(servedData, null, 2)], { 
        type: 'application/json' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${feed.domain}-archived-${feed.id}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Archived feed downloaded', {
        description: `${feed.title} mirror saved as JSON`
      })
    } else {
      toast.error('Archived snapshot not found')
    }
  }

  const FeedCard = ({ feed, isFromArchive }: { feed: FeedMetadata; isFromArchive?: boolean }) => (
    <Card 
      className="glass-card p-6 hover:glass-strong transition-all duration-300 group"
      itemScope
      itemType="https://schema.org/DataFeed"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 
                className="text-lg font-bold text-foreground font-mono truncate"
                itemProp="name"
              >
                {feed.title}
              </h3>
              {isFromArchive && (
                <Badge 
                  variant="outline" 
                  className="shrink-0 glass-strong text-primary border-primary/30 text-xs"
                >
                  <Archive size={12} className="mr-1" />
                  Archived
                </Badge>
              )}
            </div>
            <p 
              className="text-sm text-muted-foreground line-clamp-2 mb-3"
              itemProp="description"
            >
              {feed.description}
            </p>
            <meta itemProp="url" content={feed.url} />
            <meta itemProp="encodingFormat" content="application/json" />
            <meta itemProp="datePublished" content={new Date(feed.timestamp).toISOString()} />
          </div>
          <Badge 
            variant="outline" 
            className="shrink-0 glass text-primary border-primary/30"
          >
            <Tag size={14} className="mr-1" />
            <span itemProp="genre">{feed.feed_type}</span>
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Globe size={14} />
            <span className="font-mono" itemProp="provider">{feed.domain}</span>
          </div>
          {feed.capabilities_count !== undefined && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span>{feed.capabilities_count} capabilities</span>
            </>
          )}
          {feed.version && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span itemProp="version">v{feed.version}</span>
            </>
          )}
          {feed.author && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span itemProp="creator">{feed.author}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
          <a
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            data-feed-json-url={feed.url}
            data-feed-type={feed.feed_type}
            data-feed-domain={feed.domain}
            className="flex-1"
            itemProp="url"
          >
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full glass hover:glass-strong group-hover:border-primary/50 transition-all"
            >
              <Globe size={16} className="mr-2" />
              <span className="font-mono text-xs truncate">Live Feed</span>
              <ArrowUpRight size={14} className="ml-2 shrink-0 opacity-50 group-hover:opacity-100" />
            </Button>
          </a>
          
          {isFromArchive && (
            <>
              <a
                href={getArchivedSnapshotUrl(feed.id)}
                target="_blank"
                rel="noopener noreferrer"
                data-archived-feed-json-url={getArchivedSnapshotUrl(feed.id)}
                data-snapshot-id={feed.id}
                data-feed-type={feed.feed_type}
                className="flex-1"
                itemProp="distribution"
              >
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full glass-strong hover:border-accent/50 text-accent hover:text-accent transition-all"
                >
                  <Archive size={16} className="mr-2" />
                  <span className="font-mono text-xs">View Mirror</span>
                  <ArrowUpRight size={14} className="ml-2 shrink-0" />
                </Button>
              </a>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleDownloadArchivedMirror(feed)}
                className="flex-1 sm:flex-initial glass hover:border-accent/50 text-accent hover:text-accent transition-all"
                title="Download archived JSON"
              >
                <FileJs size={16} />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar size={14} />
          <time dateTime={new Date(feed.timestamp).toISOString()}>
            {formatTimestamp(feed.timestamp)}
          </time>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-8">
      <section 
        className="glass-strong rounded-2xl p-8"
        aria-labelledby="top-feeds-heading"
        itemScope
        itemType="https://schema.org/ItemList"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <TrendUp size={24} className="text-primary" />
          </div>
          <div>
            <h2 
              id="top-feeds-heading" 
              className="text-2xl font-bold text-foreground font-mono"
              itemProp="name"
            >
              Top Published Feeds
            </h2>
            <p className="text-sm text-muted-foreground" itemProp="description">
              Most capable feeds by number of available capabilities
            </p>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4" role="list" aria-label="Top published LLM feeds">
            {topFeeds.map((feed, index) => (
              <div key={`top-${feed.id}`} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" role="listitem">
                <meta itemProp="position" content={String(index + 1)} />
                <FeedCard 
                  feed={feed}
                  isFromArchive={archivedFeeds?.some(f => f.id === feed.id)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </section>

      <section 
        className="glass-strong rounded-2xl p-8"
        aria-labelledby="latest-feeds-heading"
        itemScope
        itemType="https://schema.org/ItemList"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-accent/10">
            <Clock size={24} className="text-accent" />
          </div>
          <div>
            <h2 
              id="latest-feeds-heading" 
              className="text-2xl font-bold text-foreground font-mono"
              itemProp="name"
            >
              Latest Published Feeds
            </h2>
            <p className="text-sm text-muted-foreground" itemProp="description">
              Recently published or updated LLM feeds
            </p>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4" role="list" aria-label="Latest published LLM feeds">
            {latestFeeds.map((feed, index) => (
              <div key={`latest-${feed.id}`} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" role="listitem">
                <meta itemProp="position" content={String(index + 1)} />
                <FeedCard 
                  feed={feed}
                  isFromArchive={archivedFeeds?.some(f => f.id === feed.id)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </section>

      <aside className="glass-card rounded-2xl p-6" aria-label="Developer and bot information">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          For Developers, Scrapers & AI Bots
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          All feed JSON URLs are marked with <code className="font-mono text-xs glass px-2 py-1 rounded">data-feed-json-url</code> attributes 
          for easy programmatic discovery. Click any feed URL to view the raw JSON schema directly.
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          Archived feeds are served at dedicated URLs with <code className="font-mono text-xs glass px-2 py-1 rounded">application/json</code> headers at 
          <code className="font-mono text-xs glass px-2 py-1 rounded">/archive/&#123;snapshot-id&#125;.json</code>. 
          These URLs are marked with <code className="font-mono text-xs glass px-2 py-1 rounded">data-archived-feed-json-url</code> attributes for crawler discovery. 
          Click "View Mirror" to open the served JSON in a new tab, or use the download button to save locally.
        </p>
      </aside>
    </div>
  )
}
