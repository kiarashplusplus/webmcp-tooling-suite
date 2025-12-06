import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import { useDirectory } from '@/hooks/use-directory'
import { useGistArchive } from '@/hooks/use-gist-archive'
import {
    fetchLLMSTxt,
    validateLLMSTxt,
    estimateTokens,
    type LLMSTxtDocument,
    type LLMSTxtValidationResult
} from '@/lib/llmstxt'
import { toast } from 'sonner'
import {
    Globe,
    CheckCircle,
    XCircle,
    Spinner,
    SignIn,
    SignOut,
    Upload,
    Hash,
    FileText,
    ArrowRight
} from '@phosphor-icons/react'

interface LLMSTxtSubmitProps {
    onComplete?: () => void
}

export function LLMSTxtSubmit({ onComplete }: LLMSTxtSubmitProps) {
    const { user, isAuthenticated, signIn, signOut, loading: authLoading } = useAuth()
    const { submitFeed, submitting: apiSubmitting } = useDirectory()
    const { archiveToGist } = useGistArchive()

    const [domain, setDomain] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [doc, setDoc] = useState<LLMSTxtDocument | null>(null)
    const [validationResult, setValidationResult] = useState<LLMSTxtValidationResult | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // Restore state after OAuth callback
    useEffect(() => {
        const handleAuthComplete = (event: CustomEvent<{ feedUrl?: string; tab?: string }>) => {
            const { feedUrl: savedUrl } = event.detail
            if (savedUrl) {
                setDomain(savedUrl)
                toast.success('Signed in! Continue submitting your llms.txt.')
            }
        }

        window.addEventListener('webmcp-auth-complete', handleAuthComplete as EventListener)

        // Also check localStorage on mount for pending state
        const pending = localStorage.getItem('webmcp-auth-pending')
        if (pending && isAuthenticated) {
            try {
                const state = JSON.parse(pending)
                if (state.feedUrl && state.tab === 'llmstxt-submit') {
                    setDomain(state.feedUrl)
                    localStorage.removeItem('webmcp-auth-pending')
                }
            } catch { /* ignore */ }
        }

        return () => {
            window.removeEventListener('webmcp-auth-complete', handleAuthComplete as EventListener)
        }
    }, [isAuthenticated])

    // Sign in with state preservation
    const handleSignIn = () => {
        signIn({
            tab: 'llmstxt-submit',
            feedUrl: domain.trim()
        })
    }

    const handleValidate = async () => {
        if (!domain.trim()) {
            toast.error('Please enter a domain')
            return
        }

        setIsValidating(true)
        setValidationResult(null)
        setDoc(null)
        setSubmitted(false)

        try {
            // Fetch and parse the llms.txt
            const document = await fetchLLMSTxt(domain.trim())
            setDoc(document)

            // Validate the document
            const result = validateLLMSTxt(document)
            setValidationResult(result)

            if (result.valid) {
                toast.success('llms.txt is valid!', {
                    description: `${document.sections.length} sections, ${document.links.length} links`
                })
            } else {
                toast.error('llms.txt validation failed', {
                    description: typeof result.errors?.[0] === 'string'
                        ? result.errors[0]
                        : result.errors?.[0]?.message || 'Unknown error'
                })
            }
        } catch (error) {
            toast.error('Validation failed', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setIsValidating(false)
        }
    }

    const handleSubmit = async () => {
        if (!validationResult || !doc) {
            toast.error('Please validate an llms.txt first')
            return
        }

        if (!isAuthenticated || !user) {
            toast.error('Please sign in to submit')
            return
        }

        setIsSubmitting(true)

        try {
            // Extract domain for archive
            const normalizedDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

            // First, create a Gist archive for the llms.txt
            const gistResult = await archiveToGist(
                `llmstxt-${normalizedDomain}`,
                { raw: doc.raw, metadata: { title: doc.title, sourceUrl: doc.sourceUrl } },
                {
                    validationScore: validationResult.valid ? 100 : 50,
                    signatureValid: false,
                    feedUrl: doc.sourceUrl || `https://${normalizedDomain}/llms.txt`
                }
            )

            if (!gistResult) {
                throw new Error('Failed to create Gist archive')
            }

            const tokenEstimate = estimateTokens(doc)

            // Submit to directory API with llmstxt feed type
            const result = await submitFeed({
                url: doc.sourceUrl || `https://${normalizedDomain}/llms.txt`,
                title: doc.title || normalizedDomain,
                description: doc.summary || `llms.txt with ${doc.sections.length} sections and ${doc.links.length} links`,
                feed_type: 'llmstxt',
                capabilities_count: doc.links.length,
                version: undefined,
                score: validationResult.valid ? 100 : 50,
                signature_valid: false,
                gist_raw_url: gistResult.rawUrl,
                gist_html_url: gistResult.htmlUrl,
            })

            if (result) {
                setSubmitted(true)
                toast.success('llms.txt submitted successfully!', {
                    description: 'Your llms.txt is now in the directory with a permanent Gist archive',
                    action: {
                        label: 'View Gist',
                        onClick: () => window.open(gistResult.htmlUrl, '_blank')
                    }
                })
                if (onComplete) {
                    onComplete()
                }
            }
        } catch (error) {
            toast.error('Submission failed', {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const tokenEstimate = doc ? estimateTokens(doc) : null

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold font-mono bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Submit Your llms.txt
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Get your llms.txt listed in our directory. Validate your file,
                    sign in with GitHub, and make it discoverable by AI agents.
                </p>
            </div>

            {/* Step 1: Validate */}
            <Card className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                        1
                    </div>
                    <h3 className="text-lg font-semibold">Validate Your llms.txt</h3>
                </div>

                <div className="flex gap-3">
                    <Input
                        placeholder="example.com or https://example.com/llms.txt"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                        className="flex-1 glass font-mono text-sm"
                        id="llmstxt-submit-domain-input"
                    />
                    <Button
                        onClick={handleValidate}
                        disabled={isValidating || !domain.trim()}
                        className="gap-2"
                    >
                        {isValidating ? (
                            <Spinner className="animate-spin" size={18} />
                        ) : (
                            <Globe size={18} />
                        )}
                        Validate
                    </Button>
                </div>

                {validationResult && doc && (
                    <div className="mt-4 p-4 rounded-lg glass-strong">
                        <div className="flex items-center gap-3">
                            {validationResult.valid ? (
                                <CheckCircle size={24} className="text-green-500" weight="fill" />
                            ) : (
                                <XCircle size={24} className="text-red-500" weight="fill" />
                            )}
                            <div>
                                <p className="font-semibold">
                                    {validationResult.valid ? 'llms.txt is valid!' : 'Validation failed'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {doc.sections.length} sections • {doc.links.length} links
                                    {tokenEstimate && ` • ~${tokenEstimate.total} tokens`}
                                </p>
                            </div>
                        </div>

                        {doc.title && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <Hash size={16} className="text-primary" />
                                    <p className="font-medium">{doc.title}</p>
                                </div>
                                {doc.summary && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {doc.summary}
                                    </p>
                                )}
                            </div>
                        )}

                        {validationResult.errors && validationResult.errors.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50 text-sm text-red-400">
                                {validationResult.errors.map((error, i) => (
                                    <p key={i}>• {typeof error === 'string' ? error : error.message}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Step 2: Sign In */}
            <Card className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                        2
                    </div>
                    <h3 className="text-lg font-semibold">Sign In with GitHub</h3>
                </div>

                {isAuthenticated && user ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg glass-strong">
                        <img
                            src={user.avatarUrl}
                            alt={user.login}
                            className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                            <p className="font-semibold">{user.login}</p>
                            <p className="text-sm text-muted-foreground">Ready to submit</p>
                        </div>
                        <CheckCircle size={24} className="text-green-500" weight="fill" />
                        <Button
                            onClick={signOut}
                            disabled={authLoading}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            title="Sign out"
                        >
                            {authLoading ? (
                                <Spinner className="animate-spin" size={18} />
                            ) : (
                                <SignOut size={18} />
                            )}
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleSignIn}
                        disabled={authLoading}
                        variant="outline"
                        className="w-full gap-2 glass hover:glass-strong"
                    >
                        {authLoading ? (
                            <Spinner className="animate-spin" size={18} />
                        ) : (
                            <SignIn size={18} />
                        )}
                        Sign in with GitHub
                    </Button>
                )}
            </Card>

            {/* Step 3: Submit */}
            <Card className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                        3
                    </div>
                    <h3 className="text-lg font-semibold">Submit to Directory</h3>
                </div>

                {submitted ? (
                    <div className="p-4 rounded-lg glass-strong text-center">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" weight="fill" />
                        <p className="font-semibold text-lg">Successfully Submitted!</p>
                        <p className="text-sm text-muted-foreground">
                            Your llms.txt is now listed in the public directory
                        </p>
                    </div>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={!validationResult || !doc || !isAuthenticated || isSubmitting}
                        className="w-full gap-2"
                    >
                        {isSubmitting ? (
                            <Spinner className="animate-spin" size={18} />
                        ) : (
                            <Upload size={18} />
                        )}
                        Submit to Directory
                    </Button>
                )}

                {!validationResult && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                        Validate your llms.txt first to enable submission
                    </p>
                )}
                {validationResult && !isAuthenticated && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                        Sign in with GitHub to submit your llms.txt
                    </p>
                )}
            </Card>

            {/* Info Box */}
            <Card className="glass-card p-6 border-accent/30">
                <div className="flex gap-4">
                    <div className="p-3 rounded-xl bg-accent/10 h-fit">
                        <FileText size={24} className="text-accent" />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Don't have an llms.txt yet?</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                            Create your <code className="glass px-1.5 py-0.5 rounded text-xs font-mono">
                                /llms.txt</code> file to provide context for AI models.
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" asChild>
                            <a
                                href="https://llmstxt.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Read the Spec
                                <ArrowRight size={14} />
                            </a>
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
