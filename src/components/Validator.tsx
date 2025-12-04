import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { validateLLMFeed, type ValidationResult, type LLMFeed } from '@/lib/llmfeed'
import { ShieldCheck, ShieldWarning, XCircle, CheckCircle, Warning } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'

export function Validator() {
  const [feedInput, setFeedInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [parsedFeed, setParsedFeed] = useState<LLMFeed | null>(null)

  const handleValidate = async () => {
    setValidating(true)
    setResult(null)
    setParsedFeed(null)

    try {
      const feed = JSON.parse(feedInput)
      setParsedFeed(feed)
      const validationResult = await validateLLMFeed(feed)
      setResult(validationResult)
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
    } finally {
      setValidating(false)
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
        <h2 className="text-2xl font-bold text-foreground mb-2">LLMFeed Validator</h2>
        <p className="text-muted-foreground">
          Paste your mcp.llmfeed.json content below to validate structure, schemas, and Ed25519 signatures.
        </p>
      </div>

      <Card className="p-6 gradient-border">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
              Feed JSON Content
            </label>
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
        </div>
      </Card>

      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className={`p-6 ${getScoreBg(result.score)}`}>
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
            <Alert className={result.signatureValid ? 'border-accent bg-accent/10' : 'border-destructive bg-destructive/10'}>
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
                  : 'The Ed25519 signature could not be verified. Do not trust this feed for production use.'}
              </AlertDescription>
            </Alert>
          )}

          {result.errors.length > 0 && (
            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <XCircle size={20} className="text-destructive" />
                Errors
              </h4>
              <div className="space-y-3">
                {result.errors.map((error, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded bg-destructive/10 border border-destructive/20">
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
            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Warning size={20} className="text-warning" />
                Warnings
              </h4>
              <div className="space-y-3">
                {result.warnings.map((warning, idx) => (
                  <div key={idx} className="flex gap-3 p-3 rounded bg-warning/10 border border-warning/20">
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
            <Card className="p-6">
              <h4 className="font-bold text-foreground mb-4">Parsed Feed Structure</h4>
              <JsonViewer data={parsedFeed} maxHeight="400px" />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}