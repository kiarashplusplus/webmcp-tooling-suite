import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    fetchLLMSTxt,
    parseLLMSTxt,
    type LLMSTxtDocument
} from '@/lib/llmstxt'
import {
    Archive as ArchiveIcon,
    Copy,
    Download,
    Clock,
    Hash,
    ArrowRight,
    GithubLogo,
    Spinner
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface LLMSTxtArchiveProps {
    onNavigate?: (tab: string, url?: string) => void
    onComplete?: () => void
    initialUrl?: string
}

interface ArchiveEntry {
    id: string
    timestamp: string
    doc: LLMSTxtDocument
    hash: string
}

export function LLMSTxtArchive({ onNavigate, onComplete, initialUrl }: LLMSTxtArchiveProps) {
    const [input, setInput] = useState(initialUrl || '')
    const [loading, setLoading] = useState(false)
    const [doc, setDoc] = useState<LLMSTxtDocument | null>(null)
    const [archives, setArchives] = useState<ArchiveEntry[]>([])
    const [error, setError] = useState<string | null>(null)
    const [gistUrl, setGistUrl] = useState<string | null>(null)
    const [publishing, setPublishing] = useState(false)

    // Handle initial URL
    useEffect(() => {
        if (initialUrl && initialUrl !== input) {
            setInput(initialUrl)
            handleFetch(initialUrl)
        }
    }, [initialUrl])

    // Load archives from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('llmstxt-archives')
        if (stored) {
            try {
                setArchives(JSON.parse(stored))
            } catch {
                // Ignore parse errors
            }
        }
    }, [])

    const handleFetch = async (urlOverride?: string) => {
        const target = urlOverride || input.trim()
        if (!target) return

        setLoading(true)
        setError(null)

        try {
            const document = await fetchLLMSTxt(target)
            setDoc(document)
            toast.success('Document fetched')
        } catch (err) {
            setError(`Failed to fetch: ${err}`)
            toast.error('Fetch failed')
        } finally {
            setLoading(false)
        }
    }

    const computeHash = async (content: string): Promise<string> => {
        const encoder = new TextEncoder()
        const data = encoder.encode(content)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const createArchive = async () => {
        if (!doc) return

        const hash = await computeHash(doc.raw)
        const entry: ArchiveEntry = {
            id: `${Date.now()}-${hash}`,
            timestamp: new Date().toISOString(),
            doc,
            hash,
        }

        const newArchives = [entry, ...archives]
        setArchives(newArchives)
        localStorage.setItem('llmstxt-archives', JSON.stringify(newArchives))
        toast.success('Archive created')

        if (onComplete) {
            onComplete()
        }
    }

    const downloadArchive = (entry: ArchiveEntry) => {
        const data = {
            archived_at: entry.timestamp,
            hash: entry.hash,
            source_url: entry.doc.sourceUrl,
            document: entry.doc,
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `llmstxt-archive-${entry.hash}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Archive downloaded')
    }

    const publishToGist = async () => {
        if (!doc) return

        const token = localStorage.getItem('github-token')
        if (!token) {
            toast.error('Please sign in with GitHub first')
            return
        }

        setPublishing(true)

        try {
            const hash = await computeHash(doc.raw)
            const gistData = {
                description: `llms.txt archive: ${doc.title} (${hash})`,
                public: true,
                files: {
                    'llms.txt': {
                        content: doc.raw,
                    },
                    'archive-metadata.json': {
                        content: JSON.stringify({
                            archived_at: new Date().toISOString(),
                            hash,
                            source_url: doc.sourceUrl,
                            title: doc.title,
                            sections: doc.sections.length,
                            links: doc.links.length,
                        }, null, 2),
                    },
                },
            }

            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gistData),
            })

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`)
            }

            const gist = await response.json()
            setGistUrl(gist.html_url)
            toast.success('Published to GitHub Gist!')
        } catch (err) {
            toast.error(`Failed to publish: ${err}`)
        } finally {
            setPublishing(false)
        }
    }

    const deleteArchive = (id: string) => {
        const newArchives = archives.filter(a => a.id !== id)
        setArchives(newArchives)
        localStorage.setItem('llmstxt-archives', JSON.stringify(newArchives))
        toast.success('Archive deleted')
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">LLMS.txt Archive</h2>
                <p className="text-muted-foreground">
                    Create versioned snapshots of llms.txt documents. Track changes over time and publish to GitHub Gist.
                </p>
            </div>

            <Card className="p-6 gradient-border shadow-2xl">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                            URL or Domain
                        </label>
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="example.com or https://example.com/llms.txt"
                                className="flex-1 font-mono text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                            />
                            <Button
                                onClick={() => handleFetch()}
                                disabled={!input.trim() || loading}
                                className="bg-primary hover:bg-primary/90"
                            >
                                {loading ? (
                                    <Spinner className="animate-spin" size={20} />
                                ) : (
                                    'Fetch'
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl glass-card border border-destructive/30 text-destructive">
                            {error}
                        </div>
                    )}
                </div>
            </Card>

            {doc && (
                <Card className="p-6 glass-card animate-in fade-in duration-300">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Hash size={20} className="text-primary" />
                                {doc.title}
                            </h3>
                            {doc.sourceUrl && (
                                <p className="text-sm text-muted-foreground">{doc.sourceUrl}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={createArchive}>
                                <ArchiveIcon size={16} className="mr-1" />
                                Archive Now
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={publishToGist}
                                disabled={publishing}
                            >
                                {publishing ? (
                                    <Spinner size={16} className="animate-spin mr-1" />
                                ) : (
                                    <GithubLogo size={16} className="mr-1" />
                                )}
                                Publish to Gist
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground">Sections</div>
                            <div className="font-semibold text-foreground">{doc.sections.length}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground">Links</div>
                            <div className="font-semibold text-foreground">{doc.links.length}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground">Characters</div>
                            <div className="font-semibold text-foreground">{doc.raw.length.toLocaleString()}</div>
                        </div>
                    </div>

                    {gistUrl && (
                        <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
                            <p className="text-sm text-success font-medium mb-2">Published to GitHub Gist!</p>
                            <a
                                href={gistUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline font-mono"
                            >
                                {gistUrl}
                            </a>
                        </div>
                    )}
                </Card>
            )}

            {/* Archives List */}
            <Card className="p-6 glass-card">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <ArchiveIcon size={20} />
                    Local Archives ({archives.length})
                </h4>

                {archives.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No archives yet. Fetch a document and click "Archive Now" to create one.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {archives.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <Hash size={20} className="text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground">{entry.doc.title}</div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock size={12} />
                                            {new Date(entry.timestamp).toLocaleString()}
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {entry.hash}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(entry.doc.raw)
                                            toast.success('Copied to clipboard')
                                        }}
                                    >
                                        <Copy size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadArchive(entry)}
                                    >
                                        <Download size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteArchive(entry.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        ×
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Next Step Navigation */}
            {onNavigate && doc && (
                <Card className="p-6 glass-card shadow-xl border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-foreground">Document Archived!</h4>
                            <p className="text-sm text-muted-foreground">Prepare this document for RAG consumption.</p>
                        </div>
                        <Button onClick={() => onNavigate('rag', doc.sourceUrl)} className="gap-2">
                            RAG Prep
                            <ArrowRight size={16} weight="bold" />
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    )
}
