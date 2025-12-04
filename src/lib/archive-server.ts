import type { ArchivedSnapshot, ArchivedFeed } from '@/components/Archive'

export interface ServedArchive {
  snapshot_id: string
  domain: string
  archived_at: string
  archive_url: string
  feed_url: string
  validation_score?: number
  signature_valid?: boolean
  feed: any
}

export function getArchiveUrl(snapshotId: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/archive/${snapshotId}.json`
}

export function serializeSnapshot(snapshot: ArchivedSnapshot): ServedArchive {
  return {
    snapshot_id: snapshot.id,
    domain: snapshot.domain,
    archived_at: new Date(snapshot.timestamp).toISOString(),
    archive_url: getArchiveUrl(snapshot.id),
    feed_url: snapshot.feed.metadata.origin || `https://${snapshot.domain}/.well-known/mcp.llmfeed.json`,
    validation_score: snapshot.validationScore,
    signature_valid: snapshot.signatureValid,
    feed: snapshot.feed
  }
}

export function downloadAsJson(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function serveSnapshotAsJson(snapshot: ArchivedSnapshot): void {
  const served = serializeSnapshot(snapshot)
  downloadAsJson(served, `${snapshot.domain}-${snapshot.id}.json`)
}

export function copyJsonToClipboard(data: any): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2)
  return navigator.clipboard.writeText(jsonString)
}
