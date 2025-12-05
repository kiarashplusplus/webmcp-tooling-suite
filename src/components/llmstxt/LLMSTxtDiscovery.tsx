import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
    fetchLLMSTxt,
    discoverLLMSTxtFiles,
    estimateTokens,
    type LLMSTxtDocument,
    type LLMSTxtSection
} from '@/lib/llmstxt'
import { MagnifyingGlass, Link as LinkIcon, FileText, ArrowRight, Copy, Hash, ArrowSquareOut } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface LLMSTxtDiscoveryProps {
    onNavigate?: (tab: string, url?: string) => void
    onComplete?: () => void
}

const EXAMPLE_DOMAINS = [
    { domain: 'ai-sdk.dev', description: 'Vercel AI SDK' },
    { domain: 'cursor.com', description: 'Cursor Editor' },
    { domain: 'supabase.com', description: 'Supabase' },
]

export function LLMSTxtDiscovery({ onNavigate, onComplete }: LLMSTxtDiscoveryProps) {
    const [domain, setDomain] = useState('')
    const [loading, setLoading] = useState(false)
    const [doc, setDoc] = useState<LLMSTxtDocument | null>(null)
    const [discoveredFiles, setDiscoveredFiles] = useState<{ url: string; type: 'standard' | 'full' }[]>([])
    const [error, setError] = useState<string | null>(null)

    // Mark step as complete when a doc is discovered
    useEffect(() => {
        if (doc && onComplete) {
            onComplete()
        }
    }, [doc, onComplete])

    const handleDiscover = async () => {
        if (!domain.trim()) return

        setLoading(true)
        setError(null)
        setDoc(null)
        setDiscoveredFiles([])

        try {
            // First discover available files
            const files = await discoverLLMSTxtFiles(domain)
            setDiscoveredFiles(files)

            // Fetch the main file
            const document = await fetchLLMSTxt(domain)
            setDoc(document)
            toast.success('llms.txt discovered successfully')
        } catch (err) {
            setError(`Failed to discover llms.txt: ${err}`)
            toast.error('llms.txt discovery failed')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard`)
    }

    const tokenEstimate = doc ? estimateTokens(doc) : null

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">LLMS.txt Discovery</h2>
                <p className="text-muted-foreground">
                    Discover and analyze llms.txt files from any website. Compatible with the{' '}
                    <a
                        href="https://llmstxt.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        llmstxt.org
                    </a>{' '}
                    specification.
                </p>
            </div>

            {/* Example Domains */}
            <Card className="p-4 glass-card">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Try:</span>
                    {EXAMPLE_DOMAINS.map((ex) => (
                        <button
                            key={ex.domain}
                            onClick={() => {
                                setDomain(ex.domain)
                                toast.info(`Selected ${ex.description}`)
                            }}
                            className="px-3 py-1 rounded-full text-sm font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground transition-colors"
                        >
                            {ex.domain}
                        </button>
                    ))}
                </div>
            </Card>

            <Card className="p-6 gradient-border shadow-2xl">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                            Domain or URL
                        </label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="example.com or https://example.com/llms.txt"
                                    className="flex-1 font-mono text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                                    id="llmstxt-domain-input"
                                />
                                <Button
                                    onClick={handleDiscover}
                                    disabled={!domain.trim() || loading}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                                            Discovering...
                                        </>
                                    ) : (
                                        <>
                                            <MagnifyingGlass className="mr-2" size={20} />
                                            Discover
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Enter a domain to check /llms.txt and /llms-full.txt, or provide a direct URL
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl glass-card border border-destructive/30 text-destructive">
                            {error}
                        </div>
                    )}
                </div>
            </Card>

            {/* Discovered Files */}
            {discoveredFiles.length > 0 && (
                <Card className="p-4 glass-card">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileText size={16} />
                        Discovered Files ({discoveredFiles.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {discoveredFiles.map((file) => (
                            <a
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-sm font-mono transition-colors"
                            >
                                {file.type === 'full' ? (
                                    <Badge className="bg-accent text-accent-foreground text-xs">FULL</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-xs">STD</Badge>
                                )}
                                {file.url.split('/').pop()}
                                <ArrowSquareOut size={12} />
                            </a>
                        ))}
                    </div>
                </Card>
            )}

            {doc && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Document Header */}
                    <Card className="p-6 gradient-border shadow-2xl">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
                                    <Hash size={24} className="text-primary" />
                                    {doc.title || 'Untitled Document'}
                                </h3>
                                {doc.sourceUrl && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <LinkIcon size={16} />
                                        <a
                                            href={doc.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-primary transition-colors"
                                        >
                                            {doc.sourceUrl}
                                        </a>
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {doc.isFull && (
                                    <Badge className="bg-accent text-accent-foreground">Full Version</Badge>
                                )}
                                <Badge className="bg-primary text-primary-foreground">llms.txt</Badge>
                            </div>
                        </div>

                        {doc.summary && (
                            <blockquote className="border-l-4 border-primary/50 pl-4 py-2 my-4 text-foreground/80 italic">
                                {doc.summary}
                            </blockquote>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sections</div>
                                <div className="text-accent font-bold text-xl">{doc.sections.length}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Links</div>
                                <div className="text-accent font-bold text-xl">{doc.links.length}</div>
                            </div>
                            {tokenEstimate && (
                                <>
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Token Est.</div>
                                        <div className="text-warning font-bold text-xl">~{tokenEstimate.total}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Characters</div>
                                        <div className="text-foreground font-bold text-xl">{doc.raw.length.toLocaleString()}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Sections */}
                    {doc.sections.length > 0 && (
                        <Card className="p-6 glass-card shadow-xl">
                            <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                <FileText size={20} />
                                Sections ({doc.sections.length})
                            </h4>
                            <Accordion type="single" collapsible className="w-full">
                                {doc.sections.map((section, idx) => (
                                    <SectionAccordionItem key={idx} section={section} index={idx} />
                                ))}
                            </Accordion>
                        </Card>
                    )}

                    {/* All Links */}
                    {doc.links.length > 0 && (
                        <Card className="p-6 glass-card shadow-xl">
                            <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                <LinkIcon size={20} />
                                All Links ({doc.links.length})
                            </h4>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {doc.links.map((link, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3 rounded-lg glass-strong hover:bg-muted/30 transition-colors"
                                    >
                                        <ArrowSquareOut size={16} className="text-primary mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-foreground hover:text-primary transition-colors block truncate"
                                            >
                                                {link.title}
                                            </a>
                                            <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                                            {link.description && (
                                                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                                            )}
                                        </div>
                                        {link.section && (
                                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                {link.section}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Raw Markdown */}
                    <Card className="p-6 glass-card shadow-xl">
                        <h4 className="font-bold text-foreground mb-4">Raw Markdown</h4>
                        <pre className="p-4 rounded-xl bg-muted/30 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                            {doc.raw}
                        </pre>
                        <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => copyToClipboard(doc.raw, 'Markdown')}
                        >
                            <Copy size={16} className="mr-2" />
                            Copy Raw Markdown
                        </Button>
                    </Card>

                    {/* Next Step Navigation */}
                    {onNavigate && (
                        <Card className="p-6 glass-card shadow-xl border-primary/30 bg-primary/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-foreground">Document Discovered!</h4>
                                    <p className="text-sm text-muted-foreground">Next, validate the document structure and links.</p>
                                </div>
                                <Button onClick={() => onNavigate('validator', doc.sourceUrl)} className="gap-2">
                                    Validate
                                    <ArrowRight size={16} weight="bold" />
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}

function SectionAccordionItem({ section, index }: { section: LLMSTxtSection; index: number }) {
    return (
        <AccordionItem value={`section-${index}`}>
            <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                    <Badge variant="outline" className="font-mono text-xs">
                        H{section.level}
                    </Badge>
                    <span className="font-semibold text-foreground">{section.heading}</span>
                    <span className="text-xs text-muted-foreground">
                        ({section.links.length} link{section.links.length !== 1 ? 's' : ''})
                    </span>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4 pt-4">
                    {section.content && (
                        <p className="text-sm text-foreground/80">{section.content}</p>
                    )}

                    {section.links.length > 0 && (
                        <div className="space-y-2">
                            {section.links.map((link, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/20"
                                >
                                    <ArrowSquareOut size={14} className="text-primary mt-0.5" />
                                    <div className="flex-1">
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-foreground hover:text-primary"
                                        >
                                            {link.title}
                                        </a>
                                        {link.description && (
                                            <p className="text-xs text-muted-foreground">{link.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}
