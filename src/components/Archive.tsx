import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchLLMFeed, validateLLMFeed, type LLMFeed } from '@/lib/llmfeed'
import { Archive as ArchiveIcon, CloudArrowDown, Clock, Trash, Download, Copy, FolderOpen, UploadSimple } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'
import { toast } from 'sonner'

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

export interface ArchivedSnapshot {
  id: string
  domain: string
  feed: LLMFeed
  timestamp: number
  validationScore?: number
  signatureValid?: boolean
}

export interface ArchivedFeed {
  domain: string
  snapshots: ArchivedSnapshot[]
  lastUpdated: number
}

export function Archive() {
  const [archives, setArchives] = useKV<Record<string, ArchivedFeed>>('webmcp-archives', {})
  const [archivedFeeds, setArchivedFeeds] = useKV<FeedMetadata[]>('archived-feeds', [])
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<ArchivedSnapshot | null>(null)

  const archiveList = Object.values(archives || {}).sort((a, b) => b.lastUpdated - a.lastUpdated)

  const handleArchiveFeed = async () => {
    if (!domain.trim()) return

    setLoading(true)
    try {
      const feed = await fetchLLMFeed(domain)
      const validation = await validateLLMFeed(feed)
      
      const normalizedDomain = new URL(feed.metadata.origin).hostname
      const snapshot: ArchivedSnapshot = {
        id: `${normalizedDomain}-${Date.now()}`,
        domain: normalizedDomain,
        feed,
        timestamp: Date.now(),
        validationScore: validation.score,
        signatureValid: validation.signatureValid
      }

      setArchives((currentArchives) => {
        const updated = { ...currentArchives }
        if (!updated[normalizedDomain]) {
          updated[normalizedDomain] = {
            domain: normalizedDomain,
            snapshots: [],
            lastUpdated: Date.now()
          }
        }
        
        updated[normalizedDomain].snapshots.unshift(snapshot)
        updated[normalizedDomain].lastUpdated = Date.now()
        
        return updated
      })

      toast.success(`Archived snapshot for ${normalizedDomain}`)
      setDomain('')
    } catch (err) {
      toast.error(`Failed to archive feed: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArchive = (domain: string) => {
    setArchives((currentArchives) => {
      const updated = { ...currentArchives }
      delete updated[domain]
      return updated
    })
    toast.success(`Deleted archive for ${domain}`)
    if (selectedSnapshot?.domain === domain) {
      setSelectedSnapshot(null)
    }
  }

  const handleDeleteSnapshot = (domain: string, snapshotId: string) => {
    setArchives((currentArchives) => {
      const updated = { ...currentArchives }
      if (updated[domain]) {
        updated[domain].snapshots = updated[domain].snapshots.filter(s => s.id !== snapshotId)
        
        if (updated[domain].snapshots.length === 0) {
          delete updated[domain]
        } else {
          updated[domain].lastUpdated = Date.now()
        }
      }
      return updated
    })
    
    toast.success('Snapshot deleted')
    if (selectedSnapshot?.id === snapshotId) {
      setSelectedSnapshot(null)
    }
  }

  const handleExportSnapshot = (snapshot: ArchivedSnapshot) => {
    const exportData = {
      archived_at: new Date(snapshot.timestamp).toISOString(),
      domain: snapshot.domain,
      validation_score: snapshot.validationScore,
      signature_valid: snapshot.signatureValid,
      feed: snapshot.feed
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${snapshot.domain}-${new Date(snapshot.timestamp).toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Snapshot exported')
  }

  const handleExportAllArchives = () => {
    const exportData = {
      export_type: 'webmcp_archive_collection',
      exported_at: new Date().toISOString(),
      archive_count: archiveList.length,
      total_snapshots: archiveList.reduce((acc, a) => acc + a.snapshots.length, 0),
      archives: archiveList
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `webmcp-archives-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('All archives exported')
  }

  const copySnapshotUrl = (snapshot: ArchivedSnapshot) => {
    const canonicalUrl = `archive://${snapshot.domain}/${snapshot.id}`
    navigator.clipboard.writeText(canonicalUrl)
    toast.success('Canonical URL copied to clipboard')
  }

  const publishToDirectory = (snapshot: ArchivedSnapshot) => {
    const feedUrl = snapshot.feed.metadata.origin || `https://${snapshot.domain}/.well-known/mcp.llmfeed.json`
    
    const feedMetadata: FeedMetadata = {
      id: snapshot.id,
      url: feedUrl,
      title: snapshot.feed.metadata.title || snapshot.domain,
      description: snapshot.feed.metadata.description || 'Published from archive',
      feed_type: snapshot.feed.metadata.feed_type || 'webmcp',
      domain: snapshot.domain,
      timestamp: snapshot.timestamp,
      capabilities_count: snapshot.feed.capabilities?.length,
      version: snapshot.feed.metadata.version,
      author: snapshot.feed.metadata.author
    }

    setArchivedFeeds((currentFeeds) => {
      const feeds = currentFeeds || []
      const exists = feeds.some(f => f.id === feedMetadata.id)
      if (exists) {
        toast.info('Feed already published to directory')
        return feeds
      }
      toast.success(`Published "${feedMetadata.title}" to directory`)
      return [...feeds, feedMetadata]
    })
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-muted-foreground'
    if (score >= 80) return 'text-accent'
    if (score >= 60) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">WebMCP Archive</h2>
        <p className="text-muted-foreground">
          Centralized archival system for LLM feeds with versioning, similar to the Wayback Machine for machine-readable feeds.
        </p>
      </div>

      <Alert className="glass-card border-primary/20">
        <ArchiveIcon size={18} className="text-primary" />
        <AlertTitle className="text-sm font-semibold">Persistent Feed Storage</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Archive any LLMFeed from any URL to ensure availability even if the original site goes offline. Each snapshot is timestamped and versioned, 
          providing reproducibility for AI agents and research applications.
        </AlertDescription>
      </Alert>

      <Card className="p-6 gradient-border shadow-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
              Archive Feed from URL
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com or https://example.com/custom/feed.llmfeed.json"
                  className="flex-1 font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleArchiveFeed()}
                  id="archive-domain-input"
                />
                <Button
                  onClick={handleArchiveFeed}
                  disabled={!domain.trim() || loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <CloudArrowDown className="mr-2" size={20} />
                      Archive Feed
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a full URL to any .llmfeed.json file, or just a domain to archive from .well-known/mcp.llmfeed.json
              </p>
            </div>
          </div>
        </div>
      </Card>

      {archiveList.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {archiveList.length} domain{archiveList.length !== 1 ? 's' : ''} archived • {' '}
            {archiveList.reduce((acc, a) => acc + a.snapshots.length, 0)} total snapshots
          </div>
          <Button
            onClick={handleExportAllArchives}
            variant="outline"
            size="sm"
          >
            <Download size={16} className="mr-2" />
            Export All
          </Button>
        </div>
      )}

      {archiveList.length === 0 ? (
        <Card className="p-12 text-center glass-card shadow-xl">
          <FolderOpen size={48} className="mx-auto mb-4 text-primary/50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Archives Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Start archiving LLM feeds by entering a domain above. Each feed will be timestamped and versioned automatically.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Archived Feeds</h3>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {archiveList.map((archive) => (
                  <Card key={archive.domain} className="p-4 glass-card hover:border-primary/50 transition-all duration-300 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-mono text-sm font-semibold text-foreground mb-1">
                          {archive.domain}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {archive.snapshots.length} snapshot{archive.snapshots.length !== 1 ? 's' : ''} • Last updated {formatTimestamp(archive.lastUpdated)}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeleteArchive(archive.domain)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="snapshots" className="border-none">
                        <AccordionTrigger className="py-2 hover:no-underline text-xs text-primary font-semibold uppercase tracking-wide">
                          View Snapshots
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {archive.snapshots.map((snapshot) => (
                              <div
                                key={snapshot.id}
                                className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                                  selectedSnapshot?.id === snapshot.id
                                    ? 'border-primary glass-strong shadow-lg'
                                    : 'glass border-border/30 hover:border-primary/40'
                                }`}
                                onClick={() => setSelectedSnapshot(snapshot)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-muted-foreground" />
                                    <span className="text-xs font-mono text-foreground">
                                      {formatTimestamp(snapshot.timestamp)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        publishToDirectory(snapshot)
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-accent hover:text-accent hover:bg-accent/10"
                                      title="Publish to Directory"
                                    >
                                      <UploadSimple size={12} />
                                    </Button>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteSnapshot(archive.domain, snapshot.id)
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash size={12} />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {snapshot.validationScore !== undefined && (
                                    <Badge variant="secondary" className="text-xs">
                                      <span className={getScoreColor(snapshot.validationScore)}>
                                        Score: {snapshot.validationScore}
                                      </span>
                                    </Badge>
                                  )}
                                  {snapshot.signatureValid !== undefined && (
                                    <Badge 
                                      variant={snapshot.signatureValid ? 'default' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {snapshot.signatureValid ? '✓ Signed' : '✗ Invalid Sig'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-4">
            {selectedSnapshot ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Snapshot Details</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => publishToDirectory(selectedSnapshot)}
                      variant="default"
                      size="sm"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      <UploadSimple size={16} className="mr-2" />
                      Publish to Directory
                    </Button>
                    <Button
                      onClick={() => copySnapshotUrl(selectedSnapshot)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy size={16} className="mr-2" />
                      Copy URL
                    </Button>
                    <Button
                      onClick={() => handleExportSnapshot(selectedSnapshot)}
                      variant="outline"
                      size="sm"
                    >
                      <Download size={16} className="mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                <Card className="p-6 glass-card shadow-xl">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Domain</div>
                      <div className="font-mono text-sm text-foreground">{selectedSnapshot.domain}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Archived</div>
                      <div className="text-sm text-foreground">{formatTimestamp(selectedSnapshot.timestamp)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Canonical URL</div>
                      <code className="text-xs p-2 rounded bg-muted block text-foreground font-mono break-all">
                        archive://{selectedSnapshot.domain}/{selectedSnapshot.id}
                      </code>
                    </div>
                    {selectedSnapshot.validationScore !== undefined && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Validation Score</div>
                        <div className={`text-2xl font-bold ${getScoreColor(selectedSnapshot.validationScore)}`}>
                          {selectedSnapshot.validationScore}
                        </div>
                      </div>
                    )}
                    {selectedSnapshot.signatureValid !== undefined && (
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Signature Status</div>
                        <Badge variant={selectedSnapshot.signatureValid ? 'default' : 'destructive'}>
                          {selectedSnapshot.signatureValid ? 'Valid' : 'Invalid'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6 glass-card shadow-xl">
                  <h4 className="font-bold text-foreground mb-2">Feed Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Title: </span>
                      <span className="text-foreground">{selectedSnapshot.feed.metadata.title}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Description: </span>
                      <span className="text-foreground">{selectedSnapshot.feed.metadata.description}</span>
                    </div>
                    {selectedSnapshot.feed.metadata.version && (
                      <div>
                        <span className="text-muted-foreground">Version: </span>
                        <span className="text-foreground font-mono">{selectedSnapshot.feed.metadata.version}</span>
                      </div>
                    )}
                    {selectedSnapshot.feed.capabilities && (
                      <div>
                        <span className="text-muted-foreground">Capabilities: </span>
                        <span className="text-accent font-bold">{selectedSnapshot.feed.capabilities.length}</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6 glass-card shadow-xl">
                  <h4 className="font-bold text-foreground mb-4">Complete Feed JSON</h4>
                  <JsonViewer data={selectedSnapshot.feed} maxHeight="400px" />
                </Card>
              </>
            ) : (
              <Card className="p-12 text-center glass-card shadow-xl">
                <Clock size={48} className="mx-auto mb-4 text-primary/50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Snapshot Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a snapshot from the list to view its details and archived feed data.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
