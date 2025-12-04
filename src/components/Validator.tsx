import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { validateLLMFeed, fetchLLMFeed, type ValidationResult, type LLMFeed } from '@/lib/llmfeed'
import { ShieldCheck, ShieldWarning, XCircle, CheckCircle, Warning, CloudArrowDown, FileArrowUp, Code, ArrowRight } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'
import { SignatureDebugger } from './SignatureDebugger'
import { toast } from 'sonner'

interface ValidatorProps {
  onNavigate?: (tab: string, feedUrl?: string) => void
  onComplete?: () => void
  initialUrl?: string
}

const EXAMPLE_FEED = `{
  "feed_type": "mcp",
  "metadata": {
    "title": "Example MCP Server",
    "origin": "https://example.com",
    "description": "A sample MCP server for testing",
    "version": "1.0.0"
  },
  "capabilities": [
    {
      "name": "greet",
      "type": "tool",
      "description": "Greet a user by name",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "The name to greet"
          }
        },
        "required": ["name"]
      }
    }
  ]
}`

export function Validator({ onNavigate, onComplete, initialUrl }: ValidatorProps) {
  const [feedInput, setFeedInput] = useState('')
  const [feedUrl, setFeedUrl] = useState(initialUrl || '')
  const [inputMode, setInputMode] = useState<'paste' | 'url' | 'file'>(initialUrl ? 'url' : 'paste')
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [parsedFeed, setParsedFeed] = useState<LLMFeed | null>(null)

  // Update feedUrl and inputMode when initialUrl changes
  useEffect(() => {
    if (initialUrl) {
      setFeedUrl(initialUrl)
      setInputMode('url')
    }
  }, [initialUrl])

  // Mark step as complete when validation succeeds
  useEffect(() => {
    if (result?.valid && onComplete) {
      onComplete()
    }
  }, [result, onComplete])

  const handleValidateFromPaste = async () => {
    setValidating(true)
    setResult(null)
    setParsedFeed(null)

    try {
      const feed = JSON.parse(feedInput)
      setParsedFeed(feed)
      const validationResult = await validateLLMFeed(feed)
      setResult(validationResult)
      toast.success('Feed validated successfully')
    } catch (error) {
      setResult({
        valid: false,
        errors: [{
          type: 'format',
          message: `Invalid JSON: ${error}`,
          severity: 'error'
        }],
        warnings: [],
        score: 0
      })
      toast.error('Failed to parse JSON')
    } finally {
      setValidating(false)
    }
  }

  const handleValidateFromUrl = async () => {
    if (!feedUrl.trim()) return

    setValidating(true)
    setResult(null)
    setParsedFeed(null)

    try {
      const feed = await fetchLLMFeed(feedUrl)
      setParsedFeed(feed)
      setFeedInput(JSON.stringify(feed, null, 2))
      const validationResult = await validateLLMFeed(feed)
      setResult(validationResult)
      toast.success('Feed fetched and validated')
    } catch (error) {
      setResult({
        valid: false,
        errors: [{
          type: 'format',
          message: `Failed to fetch feed: ${error}`,
          severity: 'error'
        }],
        warnings: [],
        score: 0
      })
      toast.error('Failed to fetch feed')
    } finally {
      setValidating(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setValidating(true)
    setResult(null)
    setParsedFeed(null)

    try {
      const fileContent = await file.text()
      const feed = JSON.parse(fileContent)
      setFeedInput(fileContent)
      setParsedFeed(feed)
      const validationResult = await validateLLMFeed(feed)
      setResult(validationResult)
      toast.success(`File "${file.name}" validated successfully`)
    } catch (error) {
      setResult({
        valid: false,
        errors: [{
          type: 'format',
          message: `Invalid JSON in file: ${error}`,
          severity: 'error'
        }],
        warnings: [],
        score: 0
      })
      toast.error('Failed to parse file')
    } finally {
      setValidating(false)
    }
  }

  const handleValidate = () => {
    if (inputMode === 'url') {
      handleValidateFromUrl()
    } else {
      handleValidateFromPaste()
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-accent'
    if (score >= 60) return 'text-warning'
    return 'text-destructive'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-accent/20'
    if (score >= 60) return 'bg-warning/20'
    return 'bg-destructive/20'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Universal Feed Validator</h2>
        <p className="text-muted-foreground">
          Validate any LLMFeed JSON from URL, file upload, or direct paste. Supports full structure, schema, and Ed25519 signature verification.
        </p>
      </div>

      <Alert className="glass-card border-primary/20">
        <ShieldCheck size={18} className="text-primary" />
        <AlertTitle className="text-sm font-semibold">Universal Feed Support</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          This validator works with any valid .llmfeed.json file from any location - whether it's hosted at a .well-known URI, a custom URL, uploaded from your local machine, or pasted directly as JSON.
        </AlertDescription>
      </Alert>

      <Card className="p-6 gradient-border shadow-2xl">
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'paste' | 'url' | 'file')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="paste">
              <Code size={18} className="mr-2" />
              Paste JSON
            </TabsTrigger>
            <TabsTrigger value="url">
              <CloudArrowDown size={18} className="mr-2" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileArrowUp size={18} className="mr-2" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-4 mt-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground uppercase tracking-wide">
                  Feed JSON Content
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFeedInput(EXAMPLE_FEED)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Load Example
                </Button>
              </div>
              <Textarea
                value={feedInput}
                onChange={(e) => setFeedInput(e.target.value)}
                placeholder='{"feed_type": "mcp", "metadata": {...}, ...}'
                className="min-h-[300px] font-mono text-sm"
                id="feed-input"
              />
            </div>

            <Button
              onClick={handleValidate}
              disabled={!feedInput.trim() || validating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              size="lg"
            >
              {validating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Validating...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2" size={20} />
                  Validate Feed
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-0">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                Feed URL
              </label>
              <div className="space-y-2">
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/feed.llmfeed.json or example.com"
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                  id="feed-url-input"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a full URL to a .llmfeed.json file, or just a domain to check the .well-known path
                </p>
              </div>
            </div>

            <Button
              onClick={handleValidate}
              disabled={!feedUrl.trim() || validating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              size="lg"
            >
              {validating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Fetching & Validating...
                </>
              ) : (
                <>
                  <CloudArrowDown className="mr-2" size={20} />
                  Fetch & Validate
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-0">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                Upload .llmfeed.json File
              </label>
              <div className="border-2 border-dashed border-border/30 rounded-2xl p-8 text-center hover:border-primary/50 transition-all duration-300 glass-card">
                <FileArrowUp size={48} className="mx-auto mb-4 text-primary/70" />
                <p className="text-sm text-foreground mb-4">
                  Click to select a .llmfeed.json file from your computer
                </p>
                <input
                  type="file"
                  accept=".json,.llmfeed.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload-input"
                />
                <Button
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  variant="outline"
                  disabled={validating}
                  className="bg-secondary hover:bg-secondary/80"
                >
                  <FileArrowUp size={18} className="mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Supported formats: .json, .llmfeed.json
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className={`p-6 glass-strong shadow-2xl ${getScoreBg(result.score)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {result.valid ? (
                  <CheckCircle size={32} className="text-accent" weight="fill" />
                ) : (
                  <XCircle size={32} className="text-destructive" weight="fill" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {result.valid ? 'Valid Feed' : 'Invalid Feed'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {result.errors.filter(e => e.severity === 'error').length} errors, {result.warnings.length} warnings
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}
                </div>
                <div className="text-sm text-muted-foreground">Security Score</div>
              </div>
            </div>

            <Progress value={result.score} className="h-2" />
          </Card>

          {result.signatureValid !== undefined && (
            <Alert className={result.signatureValid ? 'glass-card border-accent/30' : 'glass-card border-destructive/30'}>
              {result.signatureValid ? (
                <ShieldCheck size={20} className="text-accent" />
              ) : (
                <ShieldWarning size={20} className="text-destructive" />
              )}
              <AlertTitle className="font-bold">
                {result.signatureValid ? 'Signature Verified' : 'Signature Verification Failed'}
              </AlertTitle>
              <AlertDescription>
                {result.signatureValid
                  ? 'The Ed25519 cryptographic signature is valid. This feed is authentic and has not been tampered with.'
                  : (
                    <div className="space-y-2">
                      <p>The Ed25519 signature could not be verified. Do not trust this feed for production use.</p>
                      {result.errors.find(e => e.type === 'signature') && (
                        <p className="text-xs font-mono bg-destructive/20 p-2 rounded mt-2">
                          {result.errors.find(e => e.type === 'signature')?.message}
                        </p>
                      )}
                    </div>
                  )}
              </AlertDescription>
            </Alert>
          )}

          {result.errors.length > 0 && (
            <Card className="p-6 glass-card shadow-xl">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <XCircle size={20} className="text-destructive" />
                Errors
              </h4>
              <div className="space-y-3">
                {result.errors.map((error, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-xl glass border border-destructive/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="uppercase text-xs">
                          {error.type}
                        </Badge>
                        {error.field && (
                          <code className="text-xs text-muted-foreground font-mono">{error.field}</code>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{error.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.warnings.length > 0 && (
            <Card className="p-6 glass-card shadow-xl">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Warning size={20} className="text-warning" />
                Warnings
              </h4>
              <div className="space-y-3">
                {result.warnings.map((warning, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-xl glass border border-warning/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="uppercase text-xs bg-warning text-warning-foreground">
                          {warning.type}
                        </Badge>
                        {warning.field && (
                          <code className="text-xs text-muted-foreground font-mono">{warning.field}</code>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{warning.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {parsedFeed && (
            <Card className="p-6 glass-card shadow-xl">
              <h4 className="font-bold text-foreground mb-4">Parsed Feed Structure</h4>
              <JsonViewer data={parsedFeed} maxHeight="400px" />
            </Card>
          )}

          {result && result.signatureValid === false && feedInput && (
            <SignatureDebugger feedJson={feedInput} diagnostics={result.signatureDiagnostics} />
          )}

          {/* Next Step Navigation */}
          {result?.valid && onNavigate && (
            <Card className="p-6 glass-card shadow-xl border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">Validation Passed!</h4>
                  <p className="text-sm text-muted-foreground">Next, create an archive snapshot of this feed.</p>
                </div>
                <Button onClick={() => onNavigate('archive', feedUrl)} className="gap-2">
                  Archive Feed
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