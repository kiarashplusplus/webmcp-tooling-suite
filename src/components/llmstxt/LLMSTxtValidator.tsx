import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    fetchLLMSTxt,
    parseLLMSTxt,
    validateLLMSTxt,
    type LLMSTxtDocument,
    type LLMSTxtValidationResult
} from '@/lib/llmstxt'
import {
    Shield,
    CheckCircle,
    XCircle,
    Warning,
    ArrowRight,
    FileText,
    Link as LinkIcon,
    ArrowSquareOut,
    Spinner
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface LLMSTxtValidatorProps {
    onNavigate?: (tab: string, url?: string) => void
    onComplete?: () => void
    initialUrl?: string
}

export function LLMSTxtValidator({ onNavigate, onComplete, initialUrl }: LLMSTxtValidatorProps) {
    const [input, setInput] = useState(initialUrl || '')
    const [inputType, setInputType] = useState<'url' | 'paste'>('url')
    const [pastedContent, setPastedContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [doc, setDoc] = useState<LLMSTxtDocument | null>(null)
    const [validation, setValidation] = useState<LLMSTxtValidationResult | null>(null)
    const [linkCheckResults, setLinkCheckResults] = useState<Map<string, 'checking' | 'valid' | 'invalid'>>(new Map())
    const [error, setError] = useState<string | null>(null)

    // Handle initial URL
    useEffect(() => {
        if (initialUrl && initialUrl !== input) {
            setInput(initialUrl)
            handleValidate(initialUrl)
        }
    }, [initialUrl])

    // Mark step as complete when validation succeeds
    useEffect(() => {
        if (validation?.valid && onComplete) {
            onComplete()
        }
    }, [validation, onComplete])

    const handleValidate = async (urlOverride?: string) => {
        const target = urlOverride || input.trim()
        setLoading(true)
        setError(null)
        setDoc(null)
        setValidation(null)
        setLinkCheckResults(new Map())

        try {
            let document: LLMSTxtDocument

            if (inputType === 'paste') {
                if (!pastedContent.trim()) {
                    throw new Error('Please paste llms.txt content')
                }
                document = parseLLMSTxt(pastedContent)
            } else {
                if (!target) {
                    throw new Error('Please enter a URL or domain')
                }
                document = await fetchLLMSTxt(target)
            }

            setDoc(document)
            const result = validateLLMSTxt(document)
            setValidation(result)

            if (result.valid) {
                toast.success('Validation passed!')
            } else {
                toast.warning('Validation found issues')
            }
        } catch (err) {
            setError(`Validation failed: ${err}`)
            toast.error('Validation failed')
        } finally {
            setLoading(false)
        }
    }

    const checkLinks = async () => {
        if (!doc) return

        const newResults = new Map<string, 'checking' | 'valid' | 'invalid'>()

        // Set all to checking
        doc.links.forEach(link => {
            newResults.set(link.url, 'checking')
        })
        setLinkCheckResults(new Map(newResults))

        // Check each link (with a small delay to avoid rate limiting)
        for (const link of doc.links) {
            try {
                const response = await fetch(
                    `https://llmfeed-cors-proxy.the-safe.workers.dev/?url=${encodeURIComponent(link.url)}`,
                    { method: 'HEAD' }
                )
                newResults.set(link.url, response.ok ? 'valid' : 'invalid')
            } catch {
                newResults.set(link.url, 'invalid')
            }
            setLinkCheckResults(new Map(newResults))
        }

        // Summary
        const valid = [...newResults.values()].filter(v => v === 'valid').length
        const invalid = [...newResults.values()].filter(v => v === 'invalid').length
        toast.success(`Link check complete: ${valid} valid, ${invalid} invalid`)
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-success'
        if (score >= 60) return 'text-warning'
        return 'text-destructive'
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">LLMS.txt Validator</h2>
                <p className="text-muted-foreground">
                    Validate llms.txt files against the specification. Check structure, links, and content quality.
                </p>
            </div>

            <Card className="p-6 gradient-border shadow-2xl">
                <div className="space-y-4">
                    {/* Input Type Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setInputType('url')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'url'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            From URL
                        </button>
                        <button
                            onClick={() => setInputType('paste')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'paste'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            Paste Content
                        </button>
                    </div>

                    {inputType === 'url' ? (
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
                                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                                />
                                <Button
                                    onClick={() => handleValidate()}
                                    disabled={!input.trim() || loading}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {loading ? (
                                        <Spinner className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            <Shield className="mr-2" size={20} />
                                            Validate
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                                Paste llms.txt Content
                            </label>
                            <textarea
                                value={pastedContent}
                                onChange={(e) => setPastedContent(e.target.value)}
                                placeholder="# My Project&#10;&#10;> Description goes here&#10;&#10;## Section&#10;- [Link](https://example.com): Description"
                                className="w-full h-48 p-4 rounded-xl bg-muted/30 border border-input font-mono text-sm resize-none"
                            />
                            <Button
                                onClick={() => handleValidate()}
                                disabled={!pastedContent.trim() || loading}
                                className="mt-3 bg-primary hover:bg-primary/90"
                            >
                                {loading ? (
                                    <Spinner className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Shield className="mr-2" size={20} />
                                        Validate
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-xl glass-card border border-destructive/30 text-destructive">
                            {error}
                        </div>
                    )}
                </div>
            </Card>

            {validation && doc && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Score Card */}
                    <Card className="p-6 gradient-border shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {validation.valid ? (
                                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                                        <CheckCircle size={32} weight="fill" className="text-success" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                                        <XCircle size={32} weight="fill" className="text-destructive" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">
                                        {validation.valid ? 'Valid Document' : 'Issues Found'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {validation.errors.length} error(s), {validation.warnings.length} warning(s)
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-5xl font-bold ${getScoreColor(validation.score)}`}>
                                    {validation.score}
                                </div>
                                <div className="text-sm text-muted-foreground">Score</div>
                            </div>
                        </div>
                    </Card>

                    {/* Document Info */}
                    <Card className="p-6 glass-card">
                        <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                            <FileText size={20} />
                            Document Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Title</div>
                                <div className="font-semibold text-foreground truncate">{doc.title || '(none)'}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Sections</div>
                                <div className="font-semibold text-foreground">{doc.sections.length}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Links</div>
                                <div className="font-semibold text-foreground">{doc.links.length}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30">
                                <div className="text-xs text-muted-foreground uppercase">Has Summary</div>
                                <div className="font-semibold text-foreground">{doc.summary ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    </Card>

                    {/* Errors */}
                    {validation.errors.length > 0 && (
                        <Card className="p-6 glass-card border-destructive/30">
                            <h4 className="font-bold text-destructive mb-4 flex items-center gap-2">
                                <XCircle size={20} weight="fill" />
                                Errors ({validation.errors.length})
                            </h4>
                            <div className="space-y-2">
                                {validation.errors.map((err, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="destructive" className="text-xs">{err.type}</Badge>
                                            {err.field && (
                                                <span className="text-xs font-mono text-muted-foreground">{err.field}</span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-foreground">{err.message}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Warnings */}
                    {validation.warnings.length > 0 && (
                        <Card className="p-6 glass-card border-warning/30">
                            <h4 className="font-bold text-warning mb-4 flex items-center gap-2">
                                <Warning size={20} weight="fill" />
                                Warnings ({validation.warnings.length})
                            </h4>
                            <div className="space-y-2">
                                {validation.warnings.map((warn, idx) => (
                                    <div key={idx} className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-warning text-warning-foreground text-xs">{warn.type}</Badge>
                                            {warn.field && (
                                                <span className="text-xs font-mono text-muted-foreground">{warn.field}</span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-foreground">{warn.message}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Link Checker */}
                    <Card className="p-6 glass-card">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                                <LinkIcon size={20} />
                                Link Checker ({doc.links.length} links)
                            </h4>
                            <Button variant="outline" size="sm" onClick={checkLinks}>
                                Check All Links
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {doc.links.map((link, idx) => {
                                const status = linkCheckResults.get(link.url)
                                return (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/20"
                                    >
                                        {status === 'checking' && (
                                            <Spinner size={16} className="animate-spin text-muted-foreground" />
                                        )}
                                        {status === 'valid' && (
                                            <CheckCircle size={16} weight="fill" className="text-success" />
                                        )}
                                        {status === 'invalid' && (
                                            <XCircle size={16} weight="fill" className="text-destructive" />
                                        )}
                                        {!status && (
                                            <div className="w-4 h-4 rounded-full bg-muted" />
                                        )}
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 text-sm font-mono text-foreground hover:text-primary truncate"
                                        >
                                            {link.url}
                                        </a>
                                        <ArrowSquareOut size={14} className="text-muted-foreground" />
                                    </div>
                                )
                            })}
                        </div>
                    </Card>

                    {/* Next Step Navigation */}
                    {onNavigate && validation.valid && (
                        <Card className="p-6 glass-card shadow-xl border-primary/30 bg-primary/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-foreground">Validation Passed!</h4>
                                    <p className="text-sm text-muted-foreground">Next, archive this document for versioning.</p>
                                </div>
                                <Button onClick={() => onNavigate('archive', doc.sourceUrl)} className="gap-2">
                                    Archive
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
