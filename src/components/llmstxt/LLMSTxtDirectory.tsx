import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useGistArchive, type GistArchive } from '@/hooks/use-gist-archive'
import { useDirectory, type DirectoryFeed } from '@/hooks/use-directory'
import { toast } from 'sonner'
import {
    TrendUp,
    Clock,
    Globe,
    Calendar,
    ArrowUpRight,
    Archive,
    Trash,
    Hash,
    FileText,
    GithubLogo,
    Info,
    Warning,
    ArrowClockwise,
    Tag
} from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

export function LLMSTxtDirectory() {
    const { user, isAuthenticated } = useAuth()
    const {
        archives: gistArchives,
        loading: gistLoading,
        deleteArchive: deleteGistArchive,
        fetchArchives
    } = useGistArchive()

    // Fetch from D1 API with llmstxt filter
    const {
        feeds: apiFeeds,
        loading: apiLoading,
        error: apiError,
        deleteFeed,
        refresh
    } = useDirectory()

    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

    // Fetch archives on mount if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchArchives()
        }
    }, [isAuthenticated, fetchArchives])

    // Filter API feeds to show only llmstxt type
    const llmstxtFeeds = apiFeeds.filter(f => f.feed_type === 'llmstxt')

    // Sort feeds for different views
    const topFeeds = [...llmstxtFeeds]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)

    const latestFeeds = [...llmstxtFeeds]
        .sort((a, b) => b.submitted_at - a.submitted_at)
        .slice(0, 10)

    // Determine which feeds are published by the current user
    const publishedByUser = new Set(
        apiFeeds.filter(f => f.submitted_by === user?.login).map(f => f.id)
    )

    const formatTimestamp = (timestamp: number, isCurated?: boolean) => {
        if (isCurated) return 'Curated'

        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 30) return `${days}d ago`
        return new Date(timestamp).toLocaleDateString()
    }

    const copyUrl = async (url: string) => {
        await navigator.clipboard.writeText(url)
        setCopiedUrl(url)
        toast.success('URL copied!')
        setTimeout(() => setCopiedUrl(null), 2000)
    }

    const handleUnpublish = async (feed: DirectoryFeed) => {
        if (!isAuthenticated || !user) {
            toast.error('Sign in required to unpublish')
            return
        }

        if (!publishedByUser.has(feed.id)) {
            toast.error('Permission denied', {
                description: 'You can only unpublish feeds you submitted'
            })
            return
        }

        try {
            const success = await deleteFeed(feed.id)
            if (success) {
                toast.success(`Unpublished "${feed.title}"`, {
                    description: 'This entry has been removed from the public directory'
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
        const feed = llmstxtFeeds.find(f => f.id === feedId)
        if (feed?.is_curated) return false
        return publishedByUser.has(feedId)
    }

    // Feed card component for D1 API entries
    const FeedCard = ({ feed }: { feed: DirectoryFeed }) => (
        <Card className="glass-card p-6 hover:glass-strong transition-all duration-300 group">
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground font-mono truncate">
                                {feed.title || feed.domain}
                            </h3>
                            {feed.is_curated && (
                                <Badge variant="outline" className="shrink-0 bg-accent/10 text-accent border-accent/30 text-xs">
                                    ✨ Curated
                                </Badge>
                            )}
                            <Badge variant="outline" className="shrink-0 glass text-primary border-primary/30">
                                <Hash size={14} className="mr-1" />
                                llms.txt
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {feed.description || 'No description available'}
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        {canUnpublish(feed.id) && (
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
                        <span className="font-mono">{feed.domain}</span>
                    </div>
                    {feed.score && (
                        <>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-accent">Score: {feed.score}/100</span>
                        </>
                    )}
                    {feed.submitted_by && (
                        <>
                            <Separator orientation="vertical" className="h-4" />
                            <span>by @{feed.submitted_by}</span>
                        </>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
                    <a
                        href={feed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full glass hover:glass-strong group-hover:border-primary/50 transition-all"
                        >
                            <Globe size={16} className="mr-2" />
                            <span className="font-mono text-xs truncate">View llms.txt</span>
                            <ArrowUpRight size={14} className="ml-2 shrink-0" />
                        </Button>
                    </a>

                    {feed.gist_html_url && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(feed.gist_html_url!, '_blank')}
                            className="flex-1 glass-strong hover:border-accent/50 text-accent hover:text-accent transition-all"
                        >
                            <GithubLogo size={16} className="mr-2" />
                            <span className="font-mono text-xs">View Gist</span>
                            <ArrowUpRight size={14} className="ml-2 shrink-0" />
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar size={14} />
                    <time dateTime={new Date(feed.submitted_at).toISOString()}>
                        {formatTimestamp(feed.submitted_at, feed.is_curated)}
                    </time>
                </div>
            </div>
        </Card>
    )

    // Loading skeleton matching LLMFeed style
    const LoadingSkeleton = () => (
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
    )

    // Empty state matching LLMFeed style
    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info size={48} className="text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No llms.txt entries published yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
                Use the Submit tab to add your llms.txt to the directory
            </p>
        </div>
    )

    const loading = apiLoading || gistLoading

    return (
        <div className="space-y-8">
            {/* API Error Banner */}
            {apiError && (
                <div className="glass-strong rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-center gap-3">
                        <Warning size={20} className="text-yellow-500 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-500">Directory API unavailable</p>
                            <p className="text-xs text-muted-foreground">{apiError}</p>
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

            {/* Top Published llms.txt - matches LLMFeed "Top Published Feeds" */}
            <section
                className="glass-strong rounded-2xl p-8"
                aria-labelledby="top-llmstxt-heading"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                        <TrendUp size={24} className="text-primary" />
                    </div>
                    <div>
                        <h2
                            id="top-llmstxt-heading"
                            className="text-2xl font-bold text-foreground font-mono"
                        >
                            Top Published llms.txt
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Highest scored llms.txt entries in the directory
                        </p>
                    </div>
                </div>

                {loading ? (
                    <LoadingSkeleton />
                ) : topFeeds.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-4" role="list" aria-label="Top published llms.txt entries">
                            {topFeeds.map((feed) => (
                                <div key={`top-${feed.id}`} role="listitem">
                                    <FeedCard feed={feed} />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </section>

            {/* Latest Published llms.txt - matches LLMFeed "Latest Published Feeds" */}
            <section
                className="glass-strong rounded-2xl p-8"
                aria-labelledby="latest-llmstxt-heading"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-accent/10">
                        <Clock size={24} className="text-accent" />
                    </div>
                    <div>
                        <h2
                            id="latest-llmstxt-heading"
                            className="text-2xl font-bold text-foreground font-mono"
                        >
                            Latest Published llms.txt
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Recently published or updated llms.txt entries
                        </p>
                    </div>
                </div>

                {loading ? (
                    <LoadingSkeleton />
                ) : latestFeeds.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-4" role="list" aria-label="Latest published llms.txt entries">
                            {latestFeeds.map((feed) => (
                                <div key={`latest-${feed.id}`} role="listitem">
                                    <FeedCard feed={feed} />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </section>

            {/* For Developers Info - matches LLMFeed structure */}
            <aside className="glass-card rounded-2xl p-6 border border-border/50" aria-label="Developer and bot information">
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                    For Developers, Scrapers & AI Bots
                </h3>
                <div className="space-y-4">
                    <p className="text-sm text-foreground leading-relaxed">
                        <strong className="text-foreground">llms.txt Format:</strong> A markdown-based file at{' '}
                        <code className="font-mono text-xs bg-muted text-foreground px-1.5 py-0.5 rounded border border-border">/llms.txt</code>{' '}
                        that provides structured context for LLMs. Follows the{' '}
                        <a
                            href="https://llmstxt.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            llmstxt.org
                        </a> specification.
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                        <strong className="text-foreground">Directory API:</strong> Query llms.txt entries via{' '}
                        <a
                            href="https://webmcp-directory.the-safe.workers.dev/api/feeds?feed_type=llmstxt"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono text-xs"
                        >
                            /api/feeds?feed_type=llmstxt
                        </a>{' '}
                        — Returns all llms.txt entries as JSON with gist URLs and metadata.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Standard Locations:</strong>{' '}
                        <code className="font-mono text-xs bg-muted text-foreground px-1.5 py-0.5 rounded border border-border">/llms.txt</code> (standard) and{' '}
                        <code className="font-mono text-xs bg-muted text-foreground px-1.5 py-0.5 rounded border border-border">/llms-full.txt</code> (complete docs).
                    </p>
                </div>
            </aside>
        </div>
    )
}
