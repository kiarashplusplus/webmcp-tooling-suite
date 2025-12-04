import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetchLLMFeed, type LLMFeed, type Capability, calculateTokenEstimate } from '@/lib/llmfeed'
import { MagnifyingGlass, CloudArrowDown, Code, CheckCircle, Copy, ArrowsOutSimple, ArrowRight } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'
import { ExampleUrls } from './ExampleUrls'
import { CapabilityInspector } from './CapabilityInspector'
import { toast } from 'sonner'

interface DiscoveryProps {
  onNavigate?: (tab: string) => void
  onComplete?: () => void
}

export function Discovery({ onNavigate, onComplete }: DiscoveryProps) {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [feed, setFeed] = useState<LLMFeed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCapability, setSelectedCapability] = useState<Capability | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  // Mark step as complete when a feed is discovered
  useEffect(() => {
    if (feed && onComplete) {
      onComplete()
    }
  }, [feed, onComplete])

  const handleDiscover = async () => {
    if (!domain.trim()) return

    setLoading(true)
    setError(null)
    setFeed(null)

    try {
      const discoveredFeed = await fetchLLMFeed(domain)
      setFeed(discoveredFeed)
      toast.success('Feed discovered successfully')
    } catch (err) {
      setError(`Failed to discover feed: ${err}`)
      toast.error('Feed discovery failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const openCapabilityInspector = (capability: Capability) => {
    setSelectedCapability(capability)
    setInspectorOpen(true)
  }

  const tokenEstimate = feed ? calculateTokenEstimate(feed) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Universal Feed Discovery</h2>
        <p className="text-muted-foreground">
          Discover and analyze any LLMFeed from custom URLs or .well-known URIs. Works with any .llmfeed.json location.
        </p>
      </div>

      <ExampleUrls />

      <Card className="p-6 gradient-border shadow-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
              Feed URL or Domain
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com or https://example.com/custom/feed.llmfeed.json"
                  className="flex-1 font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                  id="domain-input"
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
                Enter a full URL to any .llmfeed.json file, or just a domain to check .well-known/mcp.llmfeed.json
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

      {feed && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="p-6 gradient-border shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">{feed.metadata.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CloudArrowDown size={16} />
                  {feed.metadata.origin}
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                {feed.feed_type}
              </Badge>
            </div>

            <p className="text-foreground mb-4">{feed.metadata.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {feed.metadata.version && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Version</div>
                  <div className="text-foreground font-mono">{feed.metadata.version}</div>
                </div>
              )}
              {feed.metadata.lang && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Language</div>
                  <div className="text-foreground font-mono">{feed.metadata.lang}</div>
                </div>
              )}
              {feed.capabilities && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Capabilities</div>
                  <div className="text-accent font-bold text-xl">{feed.capabilities.length}</div>
                </div>
              )}
              {tokenEstimate && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Token Est.</div>
                  <div className="text-warning font-bold text-xl">~{tokenEstimate.total}</div>
                </div>
              )}
            </div>

            {feed.metadata.topics && feed.metadata.topics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {feed.metadata.topics.map((topic, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {feed.agent_guidance && (
            <Card className="p-6 glass-card shadow-xl">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Code size={20} />
                Agent Guidance
              </h4>
              {feed.agent_guidance.on_load && (
                <div className="mb-4 p-4 rounded-xl glass-strong border border-border/30">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">On Load</div>
                  <p className="text-foreground text-sm">{feed.agent_guidance.on_load}</p>
                </div>
              )}
              {feed.agent_guidance.interaction_tone && (
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground">Interaction Tone: </span>
                  <Badge variant="outline">{feed.agent_guidance.interaction_tone}</Badge>
                </div>
              )}
              {feed.agent_guidance.primary_actions && feed.agent_guidance.primary_actions.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-foreground mb-2">Primary Actions</div>
                  <div className="space-y-2">
                    {feed.agent_guidance.primary_actions.map((action, idx) => (
                      <div key={idx} className="p-3 rounded-xl glass-strong border border-primary/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle size={16} className="text-accent" weight="fill" />
                          <span className="font-mono text-sm text-primary">{action.tool}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {feed.capabilities && feed.capabilities.length > 0 && (
            <Card className="p-6 glass-card shadow-xl">
              <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Code size={20} />
                Capabilities ({feed.capabilities.length})
              </h4>
              <Accordion type="single" collapsible className="w-full">
                {feed.capabilities.map((capability, idx) => (
                  <AccordionItem key={idx} value={`capability-${idx}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Badge variant="outline" className="font-mono text-xs">
                          {capability.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{capability.description}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          {capability.type && (
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</div>
                              <Badge variant="secondary">{capability.type}</Badge>
                            </div>
                          )}
                          {capability.method && (
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Method</div>
                              <Badge variant="secondary">{capability.method}</Badge>
                            </div>
                          )}
                          {capability.protocol && (
                            <div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Protocol</div>
                              <Badge variant="secondary">{capability.protocol}</Badge>
                            </div>
                          )}
                        </div>

                        {capability.url && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Endpoint URL</div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 p-2 rounded bg-muted text-xs font-mono text-foreground">
                                {capability.url}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(capability.url!, 'URL')}
                              >
                                <Copy size={16} />
                              </Button>
                            </div>
                          </div>
                        )}

                        {capability.inputSchema && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Input Schema</div>
                            <JsonViewer data={capability.inputSchema} maxHeight="300px" />
                          </div>
                        )}

                        {capability.outputSchema && (
                          <div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Output Schema</div>
                            <JsonViewer data={capability.outputSchema} maxHeight="300px" />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(capability, null, 2), 'Capability')}
                            className="flex-1"
                          >
                            <Copy size={16} className="mr-2" />
                            Copy JSON
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openCapabilityInspector(capability)}
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            <ArrowsOutSimple size={16} className="mr-2" />
                            Deep Inspect
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          )}

          <Card className="p-6 glass-card shadow-xl">
            <h4 className="font-bold text-foreground mb-4">Complete Feed JSON</h4>
            <JsonViewer data={feed} maxHeight="500px" />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => copyToClipboard(JSON.stringify(feed, null, 2), 'Feed')}
            >
              <Copy size={16} className="mr-2" />
              Copy Complete Feed
            </Button>
          </Card>

          {/* Next Step Navigation */}
          {onNavigate && (
            <Card className="p-6 glass-card shadow-xl border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">Feed Discovered!</h4>
                  <p className="text-sm text-muted-foreground">Next, validate the feed to check its integrity and signature.</p>
                </div>
                <Button onClick={() => onNavigate('validator')} className="gap-2">
                  Validate Feed
                  <ArrowRight size={16} weight="bold" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Capability Inspector Dialog */}
      <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-strong border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-mono flex items-center gap-2">
              <Code size={24} className="text-primary" />
              Capability Inspector
            </DialogTitle>
          </DialogHeader>
          {selectedCapability && feed && (
            <CapabilityInspector 
              capability={selectedCapability} 
              feed={feed}
              onClose={() => setInspectorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}