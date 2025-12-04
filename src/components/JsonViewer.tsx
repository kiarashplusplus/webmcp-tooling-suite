import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface JsonViewerProps {
  data: any
  className?: string
  maxHeight?: string
}

export function JsonViewer({ data, className, maxHeight = '500px' }: JsonViewerProps) {
  const jsonString = JSON.stringify(data, null, 2)

  const highlightJson = (json: string) => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="text-primary font-semibold">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-accent">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-warning">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-[oklch(0.65_0.18_310)]">$1</span>')
      .replace(/: null/g, ': <span class="text-destructive/70">null</span>')
  }

  return (
    <ScrollArea className={cn("w-full rounded-md border border-border", className)} style={{ maxHeight }}>
      <pre className="p-4 text-sm font-mono text-foreground/90">
        <code dangerouslySetInnerHTML={{ __html: highlightJson(jsonString) }} />
      </pre>
    </ScrollArea>
  )
}