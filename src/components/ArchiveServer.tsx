import { useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { ArchivedFeed, ArchivedSnapshot } from './Archive'
import { serializeSnapshot } from '@/lib/archive-server'

export function ArchiveServer() {
  const [archives] = useKV<Record<string, ArchivedFeed>>('webmcp-archives', {})
  const [requestedId, setRequestedId] = useState<string | null>(null)

  useEffect(() => {
    const checkForArchiveRequest = () => {
      const path = window.location.pathname
      const match = path.match(/\/archive\/([^/]+)\.json$/)
      
      if (match) {
        const snapshotId = match[1]
        setRequestedId(snapshotId)
        
        if (archives) {
          for (const archiveDomain of Object.values(archives)) {
            const snapshot = archiveDomain.snapshots.find(s => s.id === snapshotId)
            if (snapshot) {
              const served = serializeSnapshot(snapshot)
              const jsonString = JSON.stringify(served, null, 2)
              
              const blob = new Blob([jsonString], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              
              const preElement = document.getElementById('archive-json-display')
              if (preElement) {
                preElement.textContent = jsonString
              }
              
              const downloadLink = document.getElementById('archive-download-link') as HTMLAnchorElement
              if (downloadLink) {
                downloadLink.href = url
                downloadLink.download = `${snapshot.domain}-${snapshotId}.json`
              }
              
              return
            }
          }
        }
      }
    }
    
    checkForArchiveRequest()
    
    window.addEventListener('popstate', checkForArchiveRequest)
    return () => window.removeEventListener('popstate', checkForArchiveRequest)
  }, [archives])

  if (!requestedId) {
    return null
  }

  let snapshot: ArchivedSnapshot | null = null
  if (archives) {
    for (const archiveDomain of Object.values(archives)) {
      const found = archiveDomain.snapshots.find(s => s.id === requestedId)
      if (found) {
        snapshot = found
        break
      }
    }
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Archive Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The requested snapshot ID <code className="font-mono glass px-2 py-1 rounded">{requestedId}</code> does not exist in the archive.
          </p>
          <a href="/" className="text-primary hover:underline">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  const served = serializeSnapshot(snapshot)
  const jsonString = JSON.stringify(served, null, 2)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="glass-strong rounded-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-foreground font-mono mb-4">
            Archived Snapshot: {snapshot.domain}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Snapshot ID:</span>{' '}
              <code className="font-mono text-foreground">{snapshot.id}</code>
            </div>
            <div>
              <span className="text-muted-foreground">Archived:</span>{' '}
              <span className="text-foreground">{new Date(snapshot.timestamp).toLocaleString()}</span>
            </div>
            {snapshot.validationScore !== undefined && (
              <div>
                <span className="text-muted-foreground">Score:</span>{' '}
                <span className="text-accent font-bold">{snapshot.validationScore}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <a
              id="archive-download-link"
              href="#"
              download={`${snapshot.domain}-${snapshot.id}.json`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
            >
              Download JSON
            </a>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 glass border border-border rounded-lg hover:glass-strong transition-colors text-sm font-semibold"
            >
              Return to Home
            </a>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">JSON Response</h2>
            <span className="text-xs font-mono glass px-3 py-1 rounded">application/json</span>
          </div>
          <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[600px]">
            <pre 
              id="archive-json-display"
              className="text-xs font-mono text-foreground whitespace-pre-wrap break-words"
            >
              {jsonString}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
