import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Bug, Copy, CheckCircle, XCircle, Warning, Info, ArrowRight } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { SignatureVerificationResult, SignatureIssue, SignatureVerificationStep } from '@/lib/llmfeed'

interface SignatureDebuggerProps {
  feedJson: string
  diagnostics?: SignatureVerificationResult
}

function deepSortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSortObject(item))
  }

  const sortedKeys = Object.keys(obj).sort()
  const sorted: Record<string, any> = {}
  for (const key of sortedKeys) {
    sorted[key] = deepSortObject(obj[key])
  }
  return sorted
}

function StepStatusIcon({ status }: { status: 'success' | 'failed' | 'skipped' }) {
  if (status === 'success') {
    return <CheckCircle size={16} className="text-green-500" weight="fill" />
  }
  if (status === 'failed') {
    return <XCircle size={16} className="text-red-500" weight="fill" />
  }
  return <ArrowRight size={16} className="text-muted-foreground" />
}

function IssueCard({ issue }: { issue: SignatureIssue }) {
  const bgColors = {
    critical: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    info: 'bg-blue-500/10 border-blue-500/30'
  }
  
  const icons = {
    critical: <XCircle size={18} className="text-red-500" weight="fill" />,
    warning: <Warning size={18} className="text-yellow-500" weight="fill" />,
    info: <Info size={18} className="text-blue-500" weight="fill" />
  }
  
  return (
    <Alert className={`${bgColors[issue.type]} border`}>
      <div className="flex gap-2">
        {icons[issue.type]}
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold flex items-center gap-2">
            {issue.title}
            <code className="text-xs bg-muted px-1 rounded">{issue.code}</code>
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {issue.description}
          </AlertDescription>
          {issue.recommendation && (
            <div className="mt-2 text-xs text-muted-foreground border-t border-dashed pt-2">
              <strong>Recommendation:</strong> {issue.recommendation}
            </div>
          )}
        </div>
      </div>
    </Alert>
  )
}

export function SignatureDebugger({ feedJson, diagnostics }: SignatureDebuggerProps) {
  const [localDebugInfo, setLocalDebugInfo] = useState<{
    canonicalPayload?: string
    payloadLength?: number
  } | null>(null)
  const [debugging, setDebugging] = useState(false)

  // Use passed diagnostics if available, otherwise generate local analysis
  const handleDebug = async () => {
    if (diagnostics) {
      // If we already have diagnostics from validation, use them
      setLocalDebugInfo({
        canonicalPayload: diagnostics.canonicalPayload?.json,
        payloadLength: diagnostics.canonicalPayload?.bytes
      })
      return
    }
    
    setDebugging(true)
    try {
      const feed = JSON.parse(feedJson)
      
      const signedBlocks = feed.trust?.signed_blocks || []
      if (signedBlocks.length > 0) {
        const payloadParts: Record<string, any> = {}
        for (const block of signedBlocks) {
          if (feed[block] !== undefined) {
            payloadParts[block] = feed[block]
          }
        }
        const sortedPayload = deepSortObject(payloadParts)
        const canonicalPayload = JSON.stringify(sortedPayload)
        setLocalDebugInfo({
          canonicalPayload,
          payloadLength: canonicalPayload.length
        })
      }
    } catch (error) {
      toast.error(`Debug failed: ${error}`)
    } finally {
      setDebugging(false)
    }
  }

  const copyToClipboard = (text: string, label: string = 'Content') => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // If we have rich diagnostics, render them
  if (diagnostics) {
    return (
      <Card className="p-6 border-muted">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bug size={20} className="text-muted-foreground" />
            <h4 className="font-bold text-foreground">Signature Verification Details</h4>
          </div>

          {/* Verification Steps */}
          <div className="space-y-2">
            <h5 className="text-sm font-semibold text-muted-foreground">Verification Steps</h5>
            <div className="space-y-1">
              {diagnostics.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm py-1 border-b border-muted/50 last:border-0">
                  <StepStatusIcon status={step.status} />
                  <div className="flex-1">
                    <span className={step.status === 'failed' ? 'text-red-500' : 'text-foreground'}>
                      {step.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {diagnostics.signature && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Signature:</span>
                <div className="flex gap-1">
                  <Badge variant={diagnostics.signature.validLength ? 'default' : 'destructive'}>
                    {diagnostics.signature.bytes} bytes
                  </Badge>
                  {diagnostics.signature.createdAt && (
                    <Badge variant="outline" className="text-xs">
                      {new Date(diagnostics.signature.createdAt).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {diagnostics.publicKey && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Public Key:</span>
                <div className="flex gap-1">
                  <Badge variant={diagnostics.publicKey.fetchSuccess ? 'default' : 'destructive'}>
                    {diagnostics.publicKey.fetchSuccess ? 'Fetched' : 'Failed'}
                  </Badge>
                  {diagnostics.publicKey.bytes && (
                    <Badge variant={diagnostics.publicKey.validLength ? 'default' : 'destructive'}>
                      {diagnostics.publicKey.bytes} bytes
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Trust Block Info */}
          {diagnostics.trust && (
            <div className="space-y-1 text-sm">
              <span className="text-muted-foreground">Algorithm:</span>
              <code className="ml-2 font-mono text-xs bg-muted px-1 rounded">{diagnostics.trust.algorithm}</code>
              <div className="mt-1">
                <span className="text-muted-foreground">Signed Blocks:</span>
                <code className="ml-2 font-mono text-xs bg-muted px-1 rounded">
                  {diagnostics.trust.signedBlocks.join(', ')}
                </code>
              </div>
            </div>
          )}

          {/* Detected Issues */}
          {diagnostics.detectedIssues.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-destructive">
                Detected Issues ({diagnostics.detectedIssues.length})
              </h5>
              <div className="space-y-2">
                {diagnostics.detectedIssues.map((issue, idx) => (
                  <IssueCard key={idx} issue={issue} />
                ))}
              </div>
            </div>
          )}

          {/* Canonical Payload */}
          {diagnostics.canonicalPayload && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Canonical Payload ({diagnostics.canonicalPayload.bytes} bytes)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(diagnostics.canonicalPayload!.json, 'Canonical payload')}
                    className="h-6 text-xs"
                  >
                    <Copy size={14} className="mr-1" />
                    Copy JSON
                  </Button>
                  {diagnostics.canonicalPayload.hash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(diagnostics.canonicalPayload!.hash!, 'SHA-256 hash')}
                      className="h-6 text-xs"
                    >
                      <Copy size={14} className="mr-1" />
                      Copy SHA-256
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={diagnostics.canonicalPayload.json}
                readOnly
                className="font-mono text-xs h-32"
              />
              {diagnostics.canonicalPayload.hash && (
                <div className="text-xs text-muted-foreground">
                  SHA-256: <code className="bg-muted px-1 rounded">{diagnostics.canonicalPayload.hash}</code>
                </div>
              )}
              <Alert className="bg-primary/5 border-primary/30">
                <AlertTitle className="text-xs font-semibold">About Canonical Payload</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  This is the exact JSON string that was verified. All object keys are sorted recursively.
                  If verification failed, compare this with what the signing server produced.
                  The SHA-256 hash can be used to quickly compare payloads.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Public Key URL */}
          {diagnostics.publicKey?.url && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Public Key URL:</span>
                {diagnostics.publicKey.fetchError && (
                  <Badge variant="destructive" className="text-xs">Error</Badge>
                )}
              </div>
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded block break-all">
                {diagnostics.publicKey.url}
              </code>
              {diagnostics.publicKey.fetchError && (
                <Alert className="bg-destructive/10 border-destructive/30">
                  <AlertDescription className="text-xs">
                    {diagnostics.publicKey.fetchError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Fallback: Simple debugger when no diagnostics available
  return (
    <Card className="p-6 border-muted">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bug size={20} className="text-muted-foreground" />
          <h4 className="font-bold text-foreground">Signature Debug Info</h4>
        </div>

        <Button
          onClick={handleDebug}
          disabled={!feedJson || debugging}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {debugging ? 'Analyzing...' : 'Analyze Signature Components'}
        </Button>

        {localDebugInfo?.canonicalPayload && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Canonical Payload ({localDebugInfo.payloadLength} chars)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(localDebugInfo.canonicalPayload!, 'Canonical payload')}
                className="h-6 text-xs"
              >
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
            <Textarea
              value={localDebugInfo.canonicalPayload}
              readOnly
              className="font-mono text-xs h-32"
            />
          </div>
        )}
      </div>
    </Card>
  )
}
