import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Bug, Copy, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface DebugInfo {
  hasSignature: boolean
  hasTrust: boolean
  algorithm?: string
  signedBlocks?: string[]
  publicKeyHint?: string
  signatureValue?: string
  signatureLength?: number
  publicKeyFetchable?: boolean
  publicKeyError?: string
  canonicalPayload?: string
  payloadLength?: number
}

export function SignatureDebugger({ feedJson }: { feedJson: string }) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [debugging, setDebugging] = useState(false)

  const handleDebug = async () => {
    setDebugging(true)
    try {
      const feed = JSON.parse(feedJson)
      const info: DebugInfo = {
        hasSignature: !!feed.signature,
        hasTrust: !!feed.trust
      }

      if (feed.trust) {
        info.algorithm = feed.trust.algorithm
        info.signedBlocks = feed.trust.signed_blocks
        info.publicKeyHint = feed.trust.public_key_hint
      }

      if (feed.signature) {
        info.signatureValue = feed.signature.value
        if (info.signatureValue) {
          try {
            const decoded = atob(info.signatureValue)
            info.signatureLength = decoded.length
          } catch {
            info.signatureLength = -1
          }
        }
      }

      if (info.publicKeyHint) {
        try {
          const response = await fetch(info.publicKeyHint, { mode: 'cors' })
          info.publicKeyFetchable = response.ok
          if (!response.ok) {
            info.publicKeyError = `HTTP ${response.status}: ${response.statusText}`
          }
        } catch (error) {
          info.publicKeyFetchable = false
          info.publicKeyError = String(error)
        }
      }

      if (info.signedBlocks && info.signedBlocks.length > 0) {
        const payloadParts: Record<string, any> = {}
        for (const block of info.signedBlocks) {
          if (feed[block] !== undefined) {
            payloadParts[block] = feed[block]
          }
        }
        const sortedKeys = Object.keys(payloadParts).sort()
        const sortedPayload: Record<string, any> = {}
        for (const key of sortedKeys) {
          sortedPayload[key] = payloadParts[key]
        }
        info.canonicalPayload = JSON.stringify(sortedPayload)
        info.payloadLength = info.canonicalPayload.length
      }

      setDebugInfo(info)
    } catch (error) {
      toast.error(`Debug failed: ${error}`)
    } finally {
      setDebugging(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

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

        {debugInfo && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Has Trust Block:</span>
                <Badge variant={debugInfo.hasTrust ? 'default' : 'destructive'}>
                  {debugInfo.hasTrust ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Has Signature:</span>
                <Badge variant={debugInfo.hasSignature ? 'default' : 'destructive'}>
                  {debugInfo.hasSignature ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            {debugInfo.algorithm && (
              <div>
                <span className="text-muted-foreground">Algorithm:</span>{' '}
                <code className="font-mono text-xs bg-muted px-1 rounded">{debugInfo.algorithm}</code>
              </div>
            )}

            {debugInfo.signedBlocks && (
              <div>
                <span className="text-muted-foreground">Signed Blocks:</span>{' '}
                <code className="font-mono text-xs bg-muted px-1 rounded">
                  {debugInfo.signedBlocks.join(', ')}
                </code>
              </div>
            )}

            {debugInfo.publicKeyHint && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Public Key URL:</span>
                  {debugInfo.publicKeyFetchable !== undefined && (
                    <Badge variant={debugInfo.publicKeyFetchable ? 'default' : 'destructive'} className="text-xs">
                      {debugInfo.publicKeyFetchable ? 'Fetchable' : 'Error'}
                    </Badge>
                  )}
                </div>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded block break-all">
                  {debugInfo.publicKeyHint}
                </code>
                {debugInfo.publicKeyError && (
                  <Alert className="bg-destructive/10 border-destructive/30">
                    <AlertDescription className="text-xs">
                      {debugInfo.publicKeyError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {debugInfo.signatureLength !== undefined && (
              <div>
                <span className="text-muted-foreground">Signature Length:</span>{' '}
                <Badge variant={debugInfo.signatureLength === 64 ? 'default' : 'destructive'}>
                  {debugInfo.signatureLength} bytes {debugInfo.signatureLength === 64 && '✓'}
                </Badge>
              </div>
            )}

            {debugInfo.canonicalPayload && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Canonical Payload ({debugInfo.payloadLength} chars):</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(debugInfo.canonicalPayload!)}
                    className="h-6 text-xs"
                  >
                    <Copy size={14} className="mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={debugInfo.canonicalPayload}
                  readOnly
                  className="font-mono text-xs h-32"
                />
                <Alert className="bg-primary/5 border-primary/30">
                  <AlertTitle className="text-xs font-semibold">Verification Payload</AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground">
                    This is the exact string that should have been signed. If verification fails, compare this with what was actually signed.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
