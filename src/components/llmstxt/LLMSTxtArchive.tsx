import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
    fetchLLMSTxt,
    validateLLMSTxt,
    type LLMSTxtDocument
} from '@/lib/llmstxt'
import {
    Archive as ArchiveIcon,
    CloudArrowDown,
    ArrowRight,
    GithubLogo,
    Copy,
    Check,
    LinkSimple,
    Trash,
    Clock
} from '@phosphor-icons/react'
import { GitHubSignIn } from '@/components/GitHubSignIn'
import { UserProfile } from '@/components/UserProfile'
import { useAuth } from '@/hooks/use-auth'
import { useGistArchive, type GistArchive } from '@/hooks/use-gist-archive'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface LLMSTxtArchiveProps {
    onNavigate?: (tab: string, url?: string) => void
    onComplete?: () => void
    initialUrl?: string
}

export function LLMSTxtArchive({ onNavigate, onComplete, initialUrl }: LLMSTxtArchiveProps) {
    const { user, loading: authLoading, isAuthenticated } = useAuth()
    const {
        archives: gistArchives,
        loading: gistLoading,
        error: gistError,
        archiveToGist,
        fetchArchives: fetchGistArchives,
        deleteArchive: deleteGistArchive
    } = useGistArchive()

    const [domain, setDomain] = useState(initialUrl || '')
    const [loading, setLoading] = useState(false)
    const [showSignInDialog, setShowSignInDialog] = useState(false)
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
    const [recentlyArchived, setRecentlyArchived] = useState<{ domain: string; gistUrl: string } | null>(null)

    // Update domain when initialUrl changes
    useEffect(() => {
        if (initialUrl) {
            setDomain(initialUrl)
        }
    }, [initialUrl])

    // Fetch Gist archives when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchGistArchives()
        }
    }, [isAuthenticated, fetchGistArchives])

    // Filter to only show llms.txt archives (stored as "llmstxt-domain-name" OR "webmcp-archive-llmstxt-...")
    const llmstxtArchives = gistArchives.filter(g =>
        g.domain.startsWith('llmstxt-') ||
        g.filename?.includes('llmstxt') ||
        g.description?.toLowerCase().includes('llms.txt')
    )

    const handleArchive = async () => {
        if (!domain.trim()) return

        // Require authentication for archiving (since we publish to Gist)
        if (!isAuthenticated) {
            setShowSignInDialog(true)
            toast.error('Sign in required', {
                description: 'GitHub authentication is required to create archives'
            })
            return
        }

        setLoading(true)
        try {
            const doc = await fetchLLMSTxt(domain)
            const validation = validateLLMSTxt(doc)

            // Create a normalized domain for the archive
            // Strip www. prefix and convert to lowercase for consistent gist identification
            let normalizedDomain = domain.toLowerCase().replace(/^www\./, '')
            try {
                const url = new URL(doc.sourceUrl || `https://${domain}`)
                normalizedDomain = url.hostname.toLowerCase().replace(/^www\./, '')
            } catch {
                // Keep original if parsing fails
            }

            // Create a feed-like object for archiving
            const feedForArchive = {
                feed_type: 'llmstxt',
                metadata: {
                    title: doc.title || normalizedDomain,
                    origin: doc.sourceUrl || `https://${normalizedDomain}`,
                    description: doc.summary || 'LLMS.txt document',
                    version: '1.0.0',
                },
                llmstxt: {
                    raw: doc.raw,
                    sections_count: doc.sections.length,
                    links_count: doc.links.length,
                    has_summary: !!doc.summary,
                }
            }

            // Publish directly to Gist
            const gistResult = await archiveToGist(
                `llmstxt-${normalizedDomain}`,
                feedForArchive as any,
                {
                    validationScore: validation.score,
                    feedUrl: doc.sourceUrl || `https://${normalizedDomain}/llms.txt`
                }
            )

            if (gistResult) {
                // Set recently archived to show success hint
                setRecentlyArchived({
                    domain: normalizedDomain,
                    gistUrl: gistResult.htmlUrl
                })

                toast.success(`Archived ${normalizedDomain} llms.txt to GitHub Gist!`, {
                    description: 'Your archive may take up to a minute to appear in the list below',
                    action: {
                        label: 'View Gist',
                        onClick: () => window.open(gistResult.htmlUrl, '_blank')
                    }
                })

                // Refresh gist archives list
                await fetchGistArchives()

                if (onComplete) {
                    onComplete()
                }
            } else {
                throw new Error('Failed to create Gist archive')
            }

            setDomain('')
        } catch (err) {
            toast.error(`Failed to archive: ${err}`)
        } finally {
            setLoading(false)
        }
    }

    // Copy URL to clipboard
    const copyUrl = async (url: string) => {
        await navigator.clipboard.writeText(url)
        setCopiedUrl(url)
        toast.success('URL copied!')
        setTimeout(() => setCopiedUrl(null), 2000)
    }

    // Delete Gist archive
    const handleDeleteGist = async (gistId: string) => {
        const success = await deleteGistArchive(gistId)
        if (success) {
            toast.success('Gist archive deleted')
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">LLMS.txt Archive</h2>
                <p className="text-muted-foreground">
                    Archive llms.txt documents to GitHub Gist for versioned, permanent storage.
                </p>
            </div>

            {isAuthenticated && user && (
                <UserProfile user={user} compact />
            )}

            {!isAuthenticated && !authLoading && (
                <Card className="p-6 glass-card border-accent/30 shadow-xl">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <GithubLogo size={24} className="text-accent" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                Sign in to Publish to GitHub
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Publish your llms.txt archives as <span className="font-semibold text-accent">GitHub Gists</span> with automatic versioning.
                                Each archive gets a permanent URL that's publicly accessible and tracked in your GitHub account.
                            </p>
                            <Button
                                onClick={() => setShowSignInDialog(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <GithubLogo size={16} className="mr-2" />
                                Sign in with GitHub
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <Alert className="glass-card border-primary/20">
                <ArchiveIcon size={18} className="text-primary" />
                <AlertTitle className="text-sm font-semibold">Persistent Storage with GitHub Gists</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground space-y-2">
                    <p>
                        Archive any llms.txt from any URL to ensure availability even if the original site goes offline. Each snapshot is timestamped and versioned.
                    </p>
                    <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                        <GithubLogo size={14} className="text-accent mt-0.5 flex-shrink-0" />
                        <p>
                            <span className="font-semibold text-accent">Publish to GitHub Gist:</span> Archives are saved as versioned Gists in your GitHub account.
                            Each revision is tracked, and the raw URL works directly for AI consumption. <span className="font-semibold">No storage costs, unlimited archives.</span>
                        </p>
                    </div>
                </AlertDescription>
            </Alert>

            <Card className="p-6 gradient-border shadow-2xl">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                            Archive llms.txt from URL
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="example.com or https://example.com/llms.txt"
                                    className="flex-1 font-mono text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleArchive()}
                                    id="llmstxt-archive-domain-input"
                                />
                                <Button
                                    onClick={handleArchive}
                                    disabled={!domain.trim() || loading}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                                            Archiving...
                                        </>
                                    ) : (
                                        <>
                                            <CloudArrowDown className="mr-2" size={20} />
                                            Archive
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter a domain to archive from /llms.txt, or provide a direct URL to any llms.txt file
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Success Hint - shows after archiving */}
            {recentlyArchived && (
                <Alert className="glass-card border-green-500/30 bg-green-500/5">
                    <Check size={18} className="text-green-500" />
                    <AlertTitle className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Successfully archived {recentlyArchived.domain}!
                    </AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground space-y-2">
                        <p>
                            Your archive has been saved to GitHub Gist. <strong>It may take up to a minute</strong> for it to appear in "Your Published Gist Archives" below due to GitHub's API caching.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                onClick={() => window.open(recentlyArchived.gistUrl, '_blank')}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-green-500/30 hover:bg-green-500/10"
                            >
                                <GithubLogo size={14} className="mr-1.5" />
                                View Gist Now
                            </Button>
                            <Button
                                onClick={() => setRecentlyArchived(null)}
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                            >
                                Dismiss
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Published GitHub Gist Archives */}
            {isAuthenticated && llmstxtArchives.length > 0 && (
                <Card className="p-6 glass-card border-accent/30">
                    <div className="flex items-center gap-3 mb-4">
                        <GithubLogo size={24} className="text-accent" />
                        <div>
                            <h3 className="font-bold text-foreground">Your Published Gist Archives</h3>
                            <p className="text-xs text-muted-foreground">{llmstxtArchives.length} llms.txt archive(s) stored on GitHub</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {llmstxtArchives.map((gist) => (
                            <div key={gist.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono text-sm font-semibold text-foreground">{gist.domain}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Clock size={12} />
                                        {gist.revisions} revision(s) • Updated {new Date(gist.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        onClick={() => copyUrl(gist.rawUrl)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title="Copy raw JSON URL"
                                    >
                                        {copiedUrl === gist.rawUrl ? (
                                            <Check size={16} className="text-accent" />
                                        ) : (
                                            <LinkSimple size={16} />
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => window.open(gist.htmlUrl, '_blank')}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        title="View on GitHub"
                                    >
                                        <GithubLogo size={16} />
                                    </Button>
                                    <Button
                                        onClick={() => handleDeleteGist(gist.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        title="Delete Gist"
                                    >
                                        <Trash size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {gistError && (
                        <p className="text-xs text-destructive mt-2">{gistError}</p>
                    )}
                </Card>
            )}

            {/* Next Step Navigation */}
            {onNavigate && isAuthenticated && llmstxtArchives.length > 0 && (
                <Card className="p-6 glass-card shadow-xl border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-foreground">Archives Published!</h4>
                            <p className="text-sm text-muted-foreground">Prepare your documents for RAG consumption.</p>
                        </div>
                        <Button onClick={() => onNavigate('rag')} className="gap-2">
                            RAG Prep
                            <ArrowRight size={16} weight="bold" />
                        </Button>
                    </div>
                </Card>
            )}

            {/* Sign In Dialog */}
            <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
                <DialogContent className="glass-strong border-primary/20">
                    <DialogHeader>
                        <DialogTitle>Sign in with GitHub</DialogTitle>
                    </DialogHeader>
                    <GitHubSignIn
                        onClose={() => setShowSignInDialog(false)}
                        context="publish"
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}
