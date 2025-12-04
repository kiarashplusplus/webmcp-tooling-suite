import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useKV } from '@github/spark/hooks'
import { JsonViewer } from './JsonViewer'
import type { ArchivedFeed } from './Archive'
import { 
  TrendUp, 
  Clock, 
  FileJs, 
  Globe,
  Tag,
  Calendar,
  ArrowUpRight,
  Archive,
  X
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
  const [viewingSnapshot, setViewingSnapshot] = useState<{ feed: any; metadata: FeedMetadata } | null>(null)

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
    return `#/archive/${feedId}`
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
    const snapshot = findArchivedSnapshot(feed.id)
    if (snapshot) {
      setViewingSnapshot({ feed: snapshot.feed, metadata: feed })
    }
  }

  const FeedCard = ({ feed, isFromArchive }: { feed: FeedMetadata; isFromArchive?: boolean }) => (
    <Card className="glass-card p-6 hover:glass-strong transition-all duration-300 group">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-foreground font-mono truncate">
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
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {feed.description}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className="shrink-0 glass text-primary border-primary/30"
          >
            <Tag size={14} className="mr-1" />
            {feed.feed_type}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Globe size={14} />
            <span className="font-mono">{feed.domain}</span>
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
              <span>v{feed.version}</span>
            </>
          )}
          {feed.author && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span>{feed.author}</span>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
          <a
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            data-feed-json-url={feed.url}
            className="flex-1"
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewArchivedMirror(feed)}
              data-archived-feed-json-url={getArchivedSnapshotUrl(feed.id)}
              className="flex-1 glass-strong hover:border-accent/50 text-accent hover:text-accent transition-all"
            >
              <Archive size={16} className="mr-2" />
              <span className="font-mono text-xs">Archived Mirror</span>
              <FileJs size={14} className="ml-2 shrink-0" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar size={14} />
          <span>{formatTimestamp(feed.timestamp)}</span>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-8">
      <div className="glass-strong rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <TrendUp size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground font-mono">Top Published Feeds</h2>
            <p className="text-sm text-muted-foreground">Most capable feeds by number of available capabilities</p>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {topFeeds.map((feed) => (
              <FeedCard 
                key={`top-${feed.id}`} 
                feed={feed}
                isFromArchive={archivedFeeds?.some(f => f.id === feed.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="glass-strong rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-accent/10">
            <Clock size={24} className="text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground font-mono">Latest Published Feeds</h2>
            <p className="text-sm text-muted-foreground">Recently published or updated LLM feeds</p>
          </div>
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {latestFeeds.map((feed) => (
              <FeedCard 
                key={`latest-${feed.id}`} 
                feed={feed}
                isFromArchive={archivedFeeds?.some(f => f.id === feed.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          For Developers & Scrapers
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed">
          All feed JSON URLs are marked with <code className="font-mono text-xs glass px-2 py-1 rounded">data-feed-json-url</code> attributes 
          for easy programmatic discovery. Click any feed URL to view the raw JSON schema directly.
          Archived feeds include a <code className="font-mono text-xs glass px-2 py-1 rounded">data-archived-feed-json-url</code> attribute 
          linking to the archived mirror snapshot.
        </p>
      </div>

      <Dialog open={!!viewingSnapshot} onOpenChange={(open) => !open && setViewingSnapshot(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-mono">
              <Archive size={24} className="text-accent" />
              Archived Feed Mirror
            </DialogTitle>
            <DialogDescription>
              {viewingSnapshot?.metadata.title} • {viewingSnapshot?.metadata.domain}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar size={14} />
              <span>Archived: {viewingSnapshot && formatTimestamp(viewingSnapshot.metadata.timestamp)}</span>
            </div>
            
            <ScrollArea className="h-[60vh] rounded-lg glass p-4">
              {viewingSnapshot && <JsonViewer data={viewingSnapshot.feed} />}
            </ScrollArea>

            <div className="flex gap-2 justify-end pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (viewingSnapshot) {
                    const blob = new Blob([JSON.stringify(viewingSnapshot.feed, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${viewingSnapshot.metadata.domain}-archived.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                }}
                className="glass"
              >
                <FileJs size={16} className="mr-2" />
                Download JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setViewingSnapshot(null)}
                className="glass-strong"
              >
                <X size={16} className="mr-2" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
