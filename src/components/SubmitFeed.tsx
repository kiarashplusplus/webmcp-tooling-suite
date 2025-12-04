import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import { useKV } from '@/hooks/use-kv'
import { validateLLMFeed, fetchWithCorsProxy, type ValidationResult, type LLMFeed } from '@/lib/llmfeed'
import { generateAllBadges } from '@/lib/badge-generator'
import { toast } from 'sonner'
import {
  Globe,
  CheckCircle,
  XCircle,
  Spinner,
  SignIn,
  Upload,
  Code,
  Copy,
  Check,
  ShieldCheck,
  Star,
  ArrowRight
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
}

export function SubmitFeed() {
  const { user, isAuthenticated, signIn, loading: authLoading } = useAuth()
  const [archivedFeeds, setArchivedFeeds] = useKV<FeedMetadata[]>('archived-feeds', [])
  const [publishedBy, setPublishedBy] = useKV<Record<string, string>>('feed-publishers', {})
  
  const [feedUrl, setFeedUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [parsedFeed, setParsedFeed] = useState<LLMFeed | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copiedBadge, setCopiedBadge] = useState<string | null>(null)

  const handleValidate = async () => {
    if (!feedUrl.trim()) {
      toast.error('Please enter a feed URL')
      return
    }

    setIsValidating(true)
    setValidationResult(null)
    setParsedFeed(null)
    setSubmitted(false)

    try {
      let url = feedUrl.trim()
      // Auto-append .well-known path if just a domain
      if (!url.includes('.json') && !url.includes('/.well-known/')) {
        url = url.replace(/\/$/, '') + '/.well-known/mcp.llmfeed.json'
      }
      
      // Fetch and parse the feed
      const response = await fetchWithCorsProxy(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`)
      }
      const feed = await response.json() as LLMFeed
      setParsedFeed(feed)
      
      // Validate the feed
      const result = await validateLLMFeed(feed)
      setValidationResult(result)
      setFeedUrl(url)
      
      if (result.valid) {
        toast.success('Feed is valid!', {
          description: `Score: ${result.score}/100`
        })
      } else {
        toast.error('Feed validation failed', {
          description: result.errors?.[0]?.message || 'Unknown error'
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
    if (!validationResult?.valid || !parsedFeed) {
      toast.error('Please validate a feed first')
      return
    }

    if (!isAuthenticated || !user) {
      toast.error('Please sign in to submit')
      return
    }

    setIsSubmitting(true)

    try {
      const domain = new URL(feedUrl).hostname
      const feedId = `${domain}-${Date.now()}`

      const newFeed: FeedMetadata = {
        id: feedId,
        url: feedUrl,
        title: parsedFeed.metadata?.title || domain,
        description: parsedFeed.metadata?.description || 'No description available',
        feed_type: parsedFeed.feed_type || 'mcp',
        domain,
        timestamp: Date.now(),
        capabilities_count: parsedFeed.capabilities?.length || 0,
        version: parsedFeed.metadata?.version,
        author: user.login
      }

      // Check if already submitted
      const existing = archivedFeeds?.find(f => f.url === feedUrl)
      if (existing) {
        toast.error('This feed has already been submitted')
        setIsSubmitting(false)
        return
      }

      // Add to directory
      setArchivedFeeds(prev => [...(prev || []), newFeed])
      setPublishedBy(prev => ({ ...prev, [feedId]: user.login }))

      setSubmitted(true)
      toast.success('Feed submitted successfully!', {
        description: 'Your feed is now visible in the directory'
      })
    } catch (error) {
      toast.error('Submission failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyBadge = async (code: string, badgeType: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedBadge(badgeType)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedBadge(null), 2000)
  }

  const badges = validationResult?.valid 
    ? generateAllBadges(feedUrl, {
        isVerified: validationResult.valid,
        isSigned: validationResult.signatureValid,
        score: validationResult.score
      })
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold font-mono bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Submit Your Feed
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get your WebMCP-enabled site listed in our directory. Validate your feed, 
          sign in with GitHub, and earn badges to showcase your integration.
        </p>
      </div>

      {/* Step 1: Validate */}
      <Card className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
            1
          </div>
          <h3 className="text-lg font-semibold">Validate Your Feed</h3>
        </div>
        
        <div className="flex gap-3">
          <Input
            placeholder="https://example.com or https://example.com/.well-known/mcp.llmfeed.json"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            className="flex-1 glass font-mono text-sm"
          />
          <Button 
            onClick={handleValidate}
            disabled={isValidating || !feedUrl.trim()}
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

        {validationResult && (
          <div className="mt-4 p-4 rounded-lg glass-strong">
            <div className="flex items-center gap-3">
              {validationResult.valid ? (
                <CheckCircle size={24} className="text-green-500" weight="fill" />
              ) : (
                <XCircle size={24} className="text-red-500" weight="fill" />
              )}
              <div>
                <p className="font-semibold">
                  {validationResult.valid ? 'Feed is valid!' : 'Validation failed'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Score: {validationResult.score}/100
                  {validationResult.signatureValid && ' • Signature verified'}
                </p>
              </div>
            </div>
            
            {parsedFeed?.metadata && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="font-medium">{parsedFeed.metadata.title}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedFeed.metadata.description}
                </p>
              </div>
            )}

            {validationResult.errors && validationResult.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50 text-sm text-red-400">
                {validationResult.errors.map((error, i) => (
                  <p key={i}>• {error.message}</p>
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
            <div>
              <p className="font-semibold">{user.login}</p>
              <p className="text-sm text-muted-foreground">@{user.login}</p>
            </div>
            <CheckCircle size={24} className="ml-auto text-green-500" weight="fill" />
          </div>
        ) : (
          <Button 
            onClick={signIn}
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
              Your feed is now listed in the public directory
            </p>
          </div>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={!validationResult?.valid || !isAuthenticated || isSubmitting}
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

        {!validationResult?.valid && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Validate your feed first to enable submission
          </p>
        )}
        {validationResult?.valid && !isAuthenticated && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Sign in with GitHub to submit your feed
          </p>
        )}
      </Card>

      {/* Step 4: Get Badges */}
      {submitted && badges.length > 0 && (
        <Card className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold">
              4
            </div>
            <h3 className="text-lg font-semibold">Embed Badges on Your Site</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Add these badges to your README or website to showcase your WebMCP integration:
          </p>

          <div className="space-y-4">
            {badges.map((badge) => (
              <div key={badge.type} className="p-4 rounded-lg glass-strong">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {badge.type === 'verified' && <ShieldCheck size={20} className="text-green-500" />}
                    {badge.type === 'signed' && <ShieldCheck size={20} className="text-purple-500" />}
                    {badge.type === 'curated' && <Star size={20} className="text-amber-500" />}
                    {badge.type === 'llmfeed' && <Globe size={20} className="text-blue-500" />}
                    <span className="font-medium capitalize">{badge.type} Badge</span>
                  </div>
                  {/* Preview */}
                  <div 
                    dangerouslySetInnerHTML={{ __html: badge.svg }}
                    className="shrink-0"
                  />
                </div>

                <Separator className="my-3" />

                {/* Markdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">Markdown</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyBadge(badge.markdown, `${badge.type}-md`)}
                      className="h-6 px-2 gap-1"
                    >
                      {copiedBadge === `${badge.type}-md` ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                    <code>{badge.markdown}</code>
                  </pre>
                </div>

                {/* HTML */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">HTML</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyBadge(badge.html, `${badge.type}-html`)}
                      className="h-6 px-2 gap-1"
                    >
                      {copiedBadge === `${badge.type}-html` ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                    <code>{badge.html}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Info Box */}
      <Card className="glass-card p-6 border-accent/30">
        <div className="flex gap-4">
          <div className="p-3 rounded-xl bg-accent/10 h-fit">
            <Code size={24} className="text-accent" />
          </div>
          <div>
            <h4 className="font-semibold mb-1">Don't have a feed yet?</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Create your <code className="glass px-1.5 py-0.5 rounded text-xs font-mono">
              .well-known/mcp.llmfeed.json</code> file to get started with WebMCP.
            </p>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a 
                href="https://wellknownmcp.org/spec" 
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
