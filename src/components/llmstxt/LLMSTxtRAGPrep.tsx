import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    fetchLLMSTxt,
    parseLLMSTxt,
    estimateTokens,
    toRAGFormat,
    extractLinksForIndex,
    type LLMSTxtDocument
} from '@/lib/llmstxt'
import {
    Robot,
    Copy,
    Download,
    Hash,
    Link as LinkIcon,
    FileText,
    Spinner,
    Check
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface LLMSTxtRAGPrepProps {
    initialUrl?: string
}

type OutputFormat = 'text' | 'json' | 'links'

export function LLMSTxtRAGPrep({ initialUrl }: LLMSTxtRAGPrepProps) {
    const [input, setInput] = useState(initialUrl || '')
    const [loading, setLoading] = useState(false)
    const [doc, setDoc] = useState<LLMSTxtDocument | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('text')
    const [copied, setCopied] = useState(false)

    // Handle initial URL
    useEffect(() => {
        if (initialUrl && initialUrl !== input) {
            setInput(initialUrl)
            handleFetch(initialUrl)
        }
    }, [initialUrl])

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

    const getOutput = (): string => {
        if (!doc) return ''

        switch (outputFormat) {
            case 'text':
                return toRAGFormat(doc)
            case 'json':
                return JSON.stringify({
                    title: doc.title,
                    summary: doc.summary,
                    sourceUrl: doc.sourceUrl,
                    sections: doc.sections.map(s => ({
                        heading: s.heading,
                        content: s.content,
                        links: s.links.map(l => ({
                            title: l.title,
                            url: l.url,
                            description: l.description,
                        })),
                    })),
                }, null, 2)
            case 'links':
                return JSON.stringify(extractLinksForIndex(doc), null, 2)
            default:
                return doc.raw
        }
    }

    const copyOutput = () => {
        navigator.clipboard.writeText(getOutput())
        setCopied(true)
        toast.success('Copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadOutput = () => {
        const output = getOutput()
        const ext = outputFormat === 'text' ? 'txt' : 'json'
        const mime = outputFormat === 'text' ? 'text/plain' : 'application/json'

        const blob = new Blob([output], { type: mime })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `llmstxt-rag-${outputFormat}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Downloaded')
    }

    const tokenEstimate = doc ? estimateTokens(doc) : null
    const output = getOutput()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">RAG Preparation</h2>
                <p className="text-muted-foreground">
                    Transform llms.txt documents into RAG-optimized formats for embedding and indexing.
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
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Document Stats */}
                    <Card className="p-6 glass-card">
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
                            <Badge className="bg-primary text-primary-foreground">llms.txt</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Sections</div>
                                <div className="font-semibold text-foreground">{doc.sections.length}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Links</div>
                                <div className="font-semibold text-foreground">{doc.links.length}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Characters</div>
                                <div className="font-semibold text-foreground">{doc.raw.length.toLocaleString()}</div>
                            </div>
                            {tokenEstimate && (
                                <>
                                    <div className="p-3 rounded-lg bg-warning/20 border border-warning/30">
                                        <div className="text-xs text-warning uppercase">Est. Tokens</div>
                                        <div className="font-semibold text-warning">~{tokenEstimate.total}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-success/20 border border-success/30">
                                        <div className="text-xs text-success uppercase">RAG Tokens</div>
                                        <div className="font-semibold text-success">
                                            ~{Math.ceil(output.length * 0.25)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* Output Format Selection */}
                    <Card className="p-6 glass-card">
                        <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <Robot size={20} />
                            Output Format
                        </h4>

                        <div className="flex gap-2 mb-4">
                            <Button
                                variant={outputFormat === 'text' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setOutputFormat('text')}
                            >
                                <FileText size={16} className="mr-1" />
                                Clean Text
                            </Button>
                            <Button
                                variant={outputFormat === 'json' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setOutputFormat('json')}
                            >
                                <Hash size={16} className="mr-1" />
                                Structured JSON
                            </Button>
                            <Button
                                variant={outputFormat === 'links' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setOutputFormat('links')}
                            >
                                <LinkIcon size={16} className="mr-1" />
                                Links Index
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground mb-4">
                            {outputFormat === 'text' && 'Clean markdown text optimized for embedding. Removes noise and standardizes formatting.'}
                            {outputFormat === 'json' && 'Structured JSON with title, sections, and links. Ideal for vector databases with metadata.'}
                            {outputFormat === 'links' && 'Flat link array with embed-ready content strings. Perfect for link-based retrieval.'}
                        </div>

                        {/* Output Preview */}
                        <div className="relative">
                            <pre className="p-4 rounded-xl bg-muted/30 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
                                {output.slice(0, 5000)}
                                {output.length > 5000 && '\n\n... truncated for preview ...'}
                            </pre>

                            <div className="absolute top-2 right-2 flex gap-2">
                                <Button variant="secondary" size="sm" onClick={copyOutput}>
                                    {copied ? (
                                        <Check size={16} className="mr-1" />
                                    ) : (
                                        <Copy size={16} className="mr-1" />
                                    )}
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                                <Button variant="secondary" size="sm" onClick={downloadOutput}>
                                    <Download size={16} className="mr-1" />
                                    Download
                                </Button>
                            </div>
                        </div>

                        {/* Token savings */}
                        {tokenEstimate && outputFormat === 'text' && (
                            <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
                                <p className="text-sm text-success">
                                    <strong>Token Savings:</strong> RAG format uses ~{Math.round((1 - (output.length / doc.raw.length)) * 100)}% fewer characters than raw markdown while preserving all semantic content.
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Per-Section Token Breakdown */}
                    {tokenEstimate && tokenEstimate.bySection.length > 0 && (
                        <Card className="p-6 glass-card">
                            <h4 className="font-bold text-foreground mb-4">Token Breakdown by Section</h4>
                            <div className="space-y-2">
                                {tokenEstimate.bySection.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
                                    >
                                        <span className="text-sm text-foreground">{item.section}</span>
                                        <Badge variant="secondary" className="font-mono">
                                            ~{item.tokens} tokens
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
