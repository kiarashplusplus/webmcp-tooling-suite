import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { prepareForRAG, calculateTokenEstimate, fetchLLMFeed, type LLMFeed, type RAGIndexEntry } from '@/lib/llmfeed'
import { Database, Download, Lightbulb, CheckCircle, CloudArrowDown } from '@phosphor-icons/react'
import { JsonViewer } from './JsonViewer'
import { toast } from 'sonner'

interface RAGPrepProps {
  initialUrl?: string
}

export function RAGPrep({ initialUrl }: RAGPrepProps) {
  const [feedInput, setFeedInput] = useState('')
  const [feedUrl, setFeedUrl] = useState(initialUrl || '')
  const [inputMode, setInputMode] = useState<'paste' | 'url'>(initialUrl ? 'url' : 'paste')
  const [processing, setProcessing] = useState(false)
  const [ragEntries, setRagEntries] = useState<RAGIndexEntry[] | null>(null)
  const [tokenStats, setTokenStats] = useState<{ total: number; perCapability: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Update feedUrl and inputMode when initialUrl changes
  useEffect(() => {
    if (initialUrl) {
      setFeedUrl(initialUrl)
      setInputMode('url')
    }
  }, [initialUrl])

  const handlePrepareFromPaste = () => {
    setProcessing(true)
    setError(null)
    setRagEntries(null)
    setTokenStats(null)

    try {
      const feed: LLMFeed = JSON.parse(feedInput)
      const entries = prepareForRAG(feed)
      const tokens = calculateTokenEstimate(feed)
      
      setRagEntries(entries)
      setTokenStats(tokens)
      toast.success(`Prepared ${entries.length} entries for RAG indexing`)
    } catch (err) {
      setError(`Failed to prepare feed: ${err}`)
      toast.error('Preparation failed')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrepareFromUrl = async () => {
    if (!feedUrl.trim()) return

    setProcessing(true)
    setError(null)
    setRagEntries(null)
    setTokenStats(null)

    try {
      const feed = await fetchLLMFeed(feedUrl)
      const entries = prepareForRAG(feed)
      const tokens = calculateTokenEstimate(feed)
      
      setRagEntries(entries)
      setTokenStats(tokens)
      toast.success(`Prepared ${entries.length} entries for RAG indexing`)
    } catch (err) {
      setError(`Failed to fetch/prepare feed: ${err}`)
      toast.error('Preparation failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    if (!ragEntries) return

    const exportData = {
      export_type: 'llmfeed_rag_index',
      generated_at: new Date().toISOString(),
      entry_count: ragEntries.length,
      entries: ragEntries
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llmfeed-rag-index-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('RAG index exported successfully')
  }

  const estimatedTokenSavings = tokenStats && ragEntries 
    ? Math.round((tokenStats.total - (ragEntries.length * 50)) / tokenStats.total * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">RAG Indexing Preparation</h2>
        <p className="text-muted-foreground">
          Transform validated LLMFeed into structured format optimized for vector embeddings and semantic search.
        </p>
      </div>

      <Alert className="glass-card border-primary/20">
        <Lightbulb size={20} className="text-primary" />
        <AlertTitle className="font-bold text-foreground">Mitigates Prompt Bloat</AlertTitle>
        <AlertDescription className="text-foreground/80">
          RAG-based tool retrieval reduces token consumption by 50%+ compared to including full tool catalogs in prompts.
          This preparation generates semantic embeddings suitable for vector stores like Pinecone, Weaviate, or Chroma.
        </AlertDescription>
      </Alert>

      <Card className="p-6 gradient-border shadow-2xl">
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'paste' | 'url')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">\n            <TabsTrigger value="url" className="gap-2">
              <CloudArrowDown size={16} />
              From URL
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2">
              <Database size={16} />
              Paste JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                Feed URL or Domain
              </label>
              <div className="flex gap-2">
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="example.com or https://example.com/custom/feed.llmfeed.json"
                  className="flex-1 font-mono text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handlePrepareFromUrl()}
                />
              </div>
            </div>
            <Button
              onClick={handlePrepareFromUrl}
              disabled={!feedUrl.trim() || processing}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              size="lg"
            >
              {processing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" />
                  Fetching & Preparing...
                </>
              ) : (
                <>
                  <CloudArrowDown size={20} className="mr-2" />
                  Fetch & Prepare for RAG
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block uppercase tracking-wide">
                Validated Feed JSON
              </label>
              <Textarea
                value={feedInput}
                onChange={(e) => setFeedInput(e.target.value)}
                placeholder='Paste your validated mcp.llmfeed.json here...'
                className="min-h-[300px] font-mono text-sm"
                id="rag-feed-input"
              />
            </div>

            <Button
              onClick={handlePrepareFromPaste}
              disabled={!feedInput.trim() || processing}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              size="lg"
            >
              {processing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" />
                  Preparing...
                </>
              ) : (
                <>
                  <Database className="mr-2" size={20} />
                  Prepare for RAG
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="p-4 rounded-xl glass-card border border-destructive/30 text-destructive mt-4">
            {error}
          </div>
        )}
      </Card>

      {ragEntries && tokenStats && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="p-6 glass-strong border-accent/30 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">RAG Entries</div>
                <div className="text-4xl font-bold text-accent">{ragEntries.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Ready for embedding</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Original Tokens</div>
                <div className="text-4xl font-bold text-warning">~{tokenStats.total}</div>
                <div className="text-sm text-muted-foreground mt-1">Full feed size</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Estimated Savings</div>
                <div className="text-4xl font-bold text-accent">{estimatedTokenSavings}%</div>
                <div className="text-sm text-muted-foreground mt-1">With RAG retrieval</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-card shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-foreground">RAG Index Entries</h4>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download size={16} className="mr-2" />
                Export Index
              </Button>
            </div>

            <div className="space-y-3">
              {ragEntries.map((entry, idx) => (
                <div key={idx} className="p-4 rounded-xl glass-strong border border-border/30 hover:border-primary/50 transition-all duration-300">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.type === 'capability' ? 'default' : 'secondary'}>
                        {entry.type}
                      </Badge>
                      <span className="font-mono text-sm text-primary font-semibold">{entry.name}</span>
                    </div>
                    <CheckCircle size={16} className="text-accent" weight="fill" />
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{entry.description}</p>
                  
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Embed Content</div>
                    <code className="text-xs p-2 rounded bg-background/50 block text-foreground/80 font-mono">
                      {entry.embedContent}
                    </code>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    ID: <code className="font-mono">{entry.id}</code>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 glass-card shadow-xl">
            <h4 className="font-bold text-foreground mb-4">Complete RAG Export Structure</h4>
            <JsonViewer 
              data={{
                export_type: 'llmfeed_rag_index',
                generated_at: new Date().toISOString(),
                entry_count: ragEntries.length,
                entries: ragEntries
              }} 
              maxHeight="400px" 
            />
          </Card>

          <Alert className="glass-card border-accent/30">
            <Database size={20} className="text-accent" />
            <AlertTitle className="font-bold text-foreground">Next Steps: Vector Store Integration</AlertTitle>
            <AlertDescription className="text-foreground/80 space-y-2">
              <p>1. Export the RAG index using the button above</p>
              <p>2. Use an embedding model (e.g., nomic-embed-text, OpenAI text-embedding-3-small) to vectorize the <code className="font-mono text-xs bg-background/50 px-1 py-0.5 rounded">embedContent</code> field</p>
              <p>3. Store vectors in your vector database with associated metadata</p>
              <p>4. Implement semantic search to retrieve relevant capabilities based on user intent</p>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}