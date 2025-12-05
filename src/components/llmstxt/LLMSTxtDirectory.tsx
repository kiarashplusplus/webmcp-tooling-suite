import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useGistArchive, type GistArchive } from '@/hooks/use-gist-archive'
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
    LinkSimple,
    Check,
    Info
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

    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

    // Fetch archives on mount if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchArchives()
        }
    }, [isAuthenticated, fetchArchives])

    // Filter to show llmstxt-related archives
    const llmstxtArchives = gistArchives.filter(g =>
        g.domain.startsWith('llmstxt-') ||
        g.description?.toLowerCase().includes('llms.txt')
    )

    // Sort archives for different views
    const topArchives = [...llmstxtArchives]
        .sort((a, b) => b.revisions - a.revisions)
        .slice(0, 10)

    const latestArchives = [...llmstxtArchives]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10)

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = Date.now()
        const diff = now - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 30) return `${days}d ago`
        return date.toLocaleDateString()
    }

    const copyUrl = async (url: string) => {
        await navigator.clipboard.writeText(url)
        setCopiedUrl(url)
        toast.success('URL copied!')
        setTimeout(() => setCopiedUrl(null), 2000)
    }

    const handleDelete = async (gistId: string) => {
        const success = await deleteGistArchive(gistId)
        if (success) {
            toast.success('Archive deleted')
        }
    }

    // Archive card component for consistency
    const ArchiveCard = ({ archive }: { archive: GistArchive }) => (
        <Card className="glass-card p-6 hover:glass-strong transition-all duration-300">
            <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-lg font-bold text-foreground font-mono truncate">
                                {archive.domain.replace('llmstxt-', '')}
                            </h3>
                            <Badge variant="outline" className="shrink-0 glass text-primary border-primary/30">
                                <Hash size={14} className="mr-1" />
                                llms.txt
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {archive.revisions} revision(s) archived
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        {isAuthenticated && (
                            <Button
                                onClick={() => handleDelete(archive.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete archive"
                            >
                                <Trash size={16} />
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Globe size={14} />
                        <span className="font-mono">{archive.domain.replace('llmstxt-', '')}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{archive.revisions} revision(s)</span>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatTimestamp(archive.updatedAt)}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2">
                    <a
                        href={archive.rawUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full glass hover:glass-strong transition-all"
                        >
                            <Globe size={16} className="mr-2" />
                            <span className="font-mono text-xs truncate">View Raw</span>
                            <ArrowUpRight size={14} className="ml-2 shrink-0" />
                        </Button>
                    </a>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(archive.htmlUrl, '_blank')}
                        className="flex-1 glass-strong hover:border-accent/50 text-accent hover:text-accent transition-all"
                    >
                        <GithubLogo size={16} className="mr-2" />
                        <span className="font-mono text-xs">View Gist</span>
                        <ArrowUpRight size={14} className="ml-2 shrink-0" />
                    </Button>
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
            <p className="text-muted-foreground">No llms.txt archives published yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
                Use the Archive tab to publish llms.txt files to GitHub Gist
            </p>
        </div>
    )

    return (
        <div className="space-y-8">
            {/* Section Label for Scrapers & AI Bots */}
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                    For Scrapers & AI Bots
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
            </div>

            {/* Top Published Archives - matches LLMFeed "Top Published Feeds" */}
            <section
                className="glass-strong rounded-2xl p-8"
                aria-labelledby="top-archives-heading"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                        <TrendUp size={24} className="text-primary" />
                    </div>
                    <div>
                        <h2
                            id="top-archives-heading"
                            className="text-2xl font-bold text-foreground font-mono"
                        >
                            Top Published Archives
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Most revised llms.txt archives by number of revisions
                        </p>
                    </div>
                </div>

                {gistLoading ? (
                    <LoadingSkeleton />
                ) : topArchives.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-4" role="list" aria-label="Top published llms.txt archives">
                            {topArchives.map((archive, index) => (
                                <div key={`top-${archive.id}`} role="listitem">
                                    <ArchiveCard archive={archive} />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </section>

            {/* Latest Published Archives - matches LLMFeed "Latest Published Feeds" */}
            <section
                className="glass-strong rounded-2xl p-8"
                aria-labelledby="latest-archives-heading"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-accent/10">
                        <Clock size={24} className="text-accent" />
                    </div>
                    <div>
                        <h2
                            id="latest-archives-heading"
                            className="text-2xl font-bold text-foreground font-mono"
                        >
                            Latest Published Archives
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Recently published or updated llms.txt archives
                        </p>
                    </div>
                </div>

                {gistLoading ? (
                    <LoadingSkeleton />
                ) : latestArchives.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-4" role="list" aria-label="Latest published llms.txt archives">
                            {latestArchives.map((archive, index) => (
                                <div key={`latest-${archive.id}`} role="listitem">
                                    <ArchiveCard archive={archive} />
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
                        <strong className="text-foreground">GitHub Gist Archives:</strong> Archived llms.txt files are stored as public GitHub Gists
                        with versioned history. Each archive includes the raw markdown content and metadata.
                        "View Gist" opens the Gist page on GitHub with full revision history.
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
