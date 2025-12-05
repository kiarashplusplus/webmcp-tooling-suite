import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import { useGistArchive } from '@/hooks/use-gist-archive'
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
    Check
} from '@phosphor-icons/react'
import { useState } from 'react'

export function LLMSTxtDirectory() {
    const { user, isAuthenticated } = useAuth()
    const {
        archives: gistArchives,
        loading: gistLoading,
        deleteArchive: deleteGistArchive
    } = useGistArchive()

    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

    // Filter to show llmstxt-related archives
    const llmstxtArchives = gistArchives.filter(g =>
        g.domain.startsWith('llmstxt-') ||
        g.description?.toLowerCase().includes('llms.txt')
    )

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

    // Example llms.txt sites for display
    const exampleSites = [
        {
            domain: 'cursor.com',
            title: 'Cursor',
            description: 'AI-first code editor with integrated llms.txt',
            url: 'https://cursor.com/llms.txt'
        },
        {
            domain: 'supabase.com',
            title: 'Supabase',
            description: 'Open source Firebase alternative with comprehensive docs',
            url: 'https://supabase.com/llms.txt'
        },
        {
            domain: 'stripe.com',
            title: 'Stripe',
            description: 'Payment infrastructure documentation for LLMs',
            url: 'https://docs.stripe.com/llms.txt'
        }
    ]

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

            {/* Published LLMS.txt Archives */}
            <section className="glass-strong rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                        <Hash size={24} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground font-mono">
                            Published llms.txt Archives
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Archived llms.txt files stored on GitHub Gist
                        </p>
                    </div>
                </div>

                {gistLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="glass-card p-6">
                                <div className="animate-pulse space-y-3">
                                    <div className="h-6 w-48 bg-muted rounded" />
                                    <div className="h-4 w-full bg-muted/50 rounded" />
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : llmstxtArchives.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText size={48} className="text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No llms.txt archives published yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            Use the Archive tab to publish llms.txt files to GitHub Gist
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                            {llmstxtArchives.map((archive) => (
                                <Card key={archive.id} className="glass-card p-6 hover:glass-strong transition-all duration-300">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-foreground font-mono truncate">
                                                    {archive.domain.replace('llmstxt-', '')}
                                                </h3>
                                                <Badge variant="outline" className="shrink-0 glass text-primary border-primary/30">
                                                    <Hash size={14} className="mr-1" />
                                                    llms.txt
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {archive.revisions} revision(s) archived
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => copyUrl(archive.rawUrl)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                title="Copy raw URL"
                                            >
                                                {copiedUrl === archive.rawUrl ? (
                                                    <Check size={16} className="text-accent" />
                                                ) : (
                                                    <LinkSimple size={16} />
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => window.open(archive.htmlUrl, '_blank')}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                title="View on GitHub"
                                            >
                                                <GithubLogo size={16} />
                                            </Button>
                                            {isAuthenticated && (
                                                <Button
                                                    onClick={() => handleDelete(archive.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                                        <Calendar size={14} />
                                        <span>Updated {formatTimestamp(archive.updatedAt)}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </section>

            {/* Example Sites */}
            <section className="glass-strong rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-accent/10">
                        <Globe size={24} className="text-accent" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground font-mono">
                            Example llms.txt Sites
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Sites with published llms.txt files you can analyze
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {exampleSites.map((site) => (
                        <Card key={site.domain} className="glass-card p-6 hover:glass-strong transition-all duration-300">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-foreground font-mono mb-1">
                                        {site.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {site.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Globe size={14} />
                                        <span className="font-mono">{site.domain}</span>
                                    </div>
                                </div>
                                <a
                                    href={site.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0"
                                >
                                    <Button variant="outline" size="sm" className="glass hover:glass-strong">
                                        <span className="font-mono text-xs">View llms.txt</span>
                                        <ArrowUpRight size={14} className="ml-2" />
                                    </Button>
                                </a>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* For Developers Info */}
            <aside className="glass-card rounded-2xl p-6 border border-border/50">
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
                        Raw Gist URLs serve content directly for AI consumption.
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
