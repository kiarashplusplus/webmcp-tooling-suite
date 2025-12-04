import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useKV } from '@/hooks/use-kv'
import { useAuth } from '@/hooks/use-auth'
import { useDirectory, type DirectoryFeed } from '@/hooks/use-directory'
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
  Archive,
  Trash,
  Info,
  Warning,
  ArrowClockwise
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
  is_curated?: boolean
  signature_valid?: boolean
  score?: number
}

// Convert DirectoryFeed to FeedMetadata for backward compatibility
function directoryFeedToMetadata(feed: DirectoryFeed): FeedMetadata {
  return {
    id: feed.id,
    url: feed.url,
    title: feed.title || feed.domain,
    description: feed.description || 'No description available',
    feed_type: feed.feed_type,
    domain: feed.domain,
    timestamp: feed.submitted_at,
    capabilities_count: feed.capabilities_count,
    version: feed.version || undefined,
    author: feed.submitted_by || undefined,
    is_curated: feed.is_curated,
    signature_valid: feed.signature_valid,
    score: feed.score || undefined,
  }
}

// Fallback curated feeds for when API is unavailable
const FALLBACK_CURATED_FEEDS: FeedMetadata[] = [
  {
    id: 'reference-25x-codes',
    url: 'https://25x.codes/.well-known/mcp.llmfeed.json',
    title: '25x.codes Portfolio',
    description: 'AI-enabled portfolio with Ed25519 signed discovery. Query projects, skills, and execute terminal-style commands.',
    feed_type: 'mcp',
    domain: '25x.codes',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
    capabilities_count: 8,
    version: '2.0.0',
    author: 'Kiarash Adl',
    is_curated: true
  },
  {
    id: 'wellknownmcp-org',
    url: 'https://wellknownmcp.org/.well-known/mcp.llmfeed.json',
    title: 'WellKnownMCP Specification',
    description: 'Complete LLMFeed specification publisher with universal feed loading. Part of the LLMCA ecosystem.',
    feed_type: 'mcp',
    domain: 'wellknownmcp.org',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
    capabilities_count: 12,
    version: '2.0.0',
    author: 'WellKnownMCP',
    is_curated: true
  },
  {
    id: 'llmca-org',
    url: 'https://llmca.org/.well-known/mcp.llmfeed.json',
    title: 'LLMCA Trust System',
    description: 'Model Context Protocol integration with LLMCA cryptographic trust system for verified MCP feeds.',
    feed_type: 'mcp',
    domain: 'llmca.org',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
    capabilities_count: 10,
    version: '2.1.0',
    author: 'LLMCA',
    is_curated: true
  },
  {
    id: 'wellknownmcp-llm-index',
    url: 'https://wellknownmcp.org/.well-known/llm-index.llmfeed.json',
    title: 'WellKnownMCP Discovery Hub',
    description: 'Intelligent navigation system that guides agents to the perfect content based on context and intent.',
    feed_type: 'llm-index',
    domain: 'wellknownmcp.org',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 1,
    capabilities_count: 7,
    version: '2.2.0',
    author: 'WellKnownMCP',
    is_curated: true
  }
]

// Legacy reference for backward compatibility
const REFERENCE_FEED: FeedMetadata = FALLBACK_CURATED_FEEDS[0]

export function FeedDirectory() {
  const { user, isAuthenticated } = useAuth()
  const { 
    feeds: apiFeeds, 
    curatedFeeds: apiCuratedFeeds, 
    loading: apiLoading, 
    error: apiError,
    deleteFeed,
    refresh
  } = useDirectory()
  
  // Local archives for viewing archived snapshots
  const [archives] = useKV<Record<string, ArchivedFeed>>('webmcp-archives', {})
  
  // Convert API feeds to FeedMetadata format
  const allFeeds: FeedMetadata[] = apiError 
    ? FALLBACK_CURATED_FEEDS 
    : apiFeeds.map(directoryFeedToMetadata)
  
  // Determine which feeds are published by the current user
  const publishedByUser = new Set(
    apiFeeds.filter(f => f.submitted_by === user?.login).map(f => f.id)
  )

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

  const handleUnpublish = async (feed: FeedMetadata) => {
    if (!isAuthenticated || !user) {
      toast.error('Sign in required to unpublish')
      return
    }

    // Check if user owns this feed
    if (!publishedByUser.has(feed.id)) {
      toast.error('Permission denied', {
        description: `You can only unpublish feeds you submitted`
      })
      return
    }

    try {
      const success = await deleteFeed(feed.id)
      if (success) {
        toast.success(`Unpublished "${feed.title}"`, {
          description: 'This feed has been removed from the public directory'
        })
      }
    } catch (error) {
      toast.error('Failed to unpublish', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const canUnpublish = (feedId: string) => {
    if (!isAuthenticated || !user) return false
    // Can't unpublish curated feeds
    const feed = allFeeds.find(f => f.id === feedId)
    if (feed?.is_curated) return false
    return publishedByUser.has(feedId)
  }

  const isCuratedFeed = (feedId: string) => {
    const feed = allFeeds.find(f => f.id === feedId)
    return feed?.is_curated ?? false
  }

  const FeedCard = ({ feed, isFromArchive }: { feed: FeedMetadata; isFromArchive?: boolean }) => {
    const isCurated = isCuratedFeed(feed.id)
    
    return (
    <Card 
      className="glass-card p-6 hover:glass-strong transition-all duration-300 group"
      itemScope
      itemType="https://schema.org/DataFeed"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 
                className="text-lg font-bold text-foreground font-mono truncate"
                itemProp="name"
              >
                {feed.title}
              </h3>
              {isCurated && (
                <Badge 
                  variant="outline" 
                  className="shrink-0 bg-accent/10 text-accent border-accent/30 text-xs"
                >
                  ✨ Curated
                </Badge>
              )}
              {isFromArchive && !isCurated && (
                <Badge 
                  variant="outline" 
                  className="shrink-0 glass-strong text-primary border-primary/30 text-xs"
                >
                  <Archive size={12} className="mr-1" />
                  Published
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
          <div className="flex items-start gap-2">
            <Badge 
              variant="outline" 
              className="shrink-0 glass text-primary border-primary/30"
            >
              <Tag size={14} className="mr-1" />
              <span itemProp="genre">{feed.feed_type}</span>
            </Badge>
            {isFromArchive && canUnpublish(feed.id) && (
              <Button
                onClick={() => handleUnpublish(feed)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Unpublish from directory"
              >
                <Trash size={16} />
              </Button>
            )}
          </div>
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
              <span itemProp="creator">by @{feed.author}</span>
            </>
          )}
          {feed.score && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-accent">Score: {feed.score}/100</span>
            </>
          )}
          {feed.signature_valid && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-green-500">🔐 Signed</span>
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
  )}

  return (
    <div className="space-y-8">
      {/* API Error Banner */}
      {apiError && (
        <div className="glass-strong rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <Warning size={20} className="text-yellow-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-500">Directory API unavailable</p>
              <p className="text-xs text-muted-foreground">Showing cached curated feeds. {apiError}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refresh()}
              className="shrink-0"
            >
              <ArrowClockwise size={14} className="mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Section Label for Scrapers & AI Bots */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
          For Scrapers & AI Bots
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

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

        {apiLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-card p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : topFeeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info size={48} className="text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No feeds published yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Archive a feed and publish it to appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4" role="list" aria-label="Top published LLM feeds">
              {topFeeds.map((feed, index) => (
                <div key={`top-${feed.id}`} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" role="listitem">
                  <meta itemProp="position" content={String(index + 1)} />
                  <FeedCard 
                    feed={feed}
                    isFromArchive={!feed.is_curated}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
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

        {apiLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-card p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : latestFeeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info size={48} className="text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No feeds published yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Archive a feed and publish it to appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4" role="list" aria-label="Latest published LLM feeds">
              {latestFeeds.map((feed, index) => (
                <div key={`latest-${feed.id}`} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" role="listitem">
                  <meta itemProp="position" content={String(index + 1)} />
                  <FeedCard 
                    feed={feed}
                    isFromArchive={!feed.is_curated}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
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
