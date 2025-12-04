import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, FileCode, Folder } from '@phosphor-icons/react'

export function ExampleUrls() {
  const examples = [
    {
      icon: Globe,
      title: 'Standard .well-known',
      description: 'Most common location for LLMFeed files',
      urls: [
        'example.com',
        'https://example.com/.well-known/mcp.llmfeed.json'
      ]
    },
    {
      icon: FileCode,
      title: 'Custom Locations',
      description: 'Any URL hosting a .llmfeed.json file',
      urls: [
        'https://cdn.example.com/feeds/v2/api.llmfeed.json',
        'https://api.example.com/mcp/feed.json'
      ]
    },
    {
      icon: Folder,
      title: 'GitHub & Raw Files',
      description: 'Direct links to JSON files',
      urls: [
        'https://raw.githubusercontent.com/user/repo/main/feed.llmfeed.json'
      ]
    }
  ]

  return (
    <Card className="p-6 bg-muted/30 border-muted">
      <h4 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide">
        Supported Feed Locations
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {examples.map((example, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <example.icon size={18} className="text-primary" />
              <h5 className="font-semibold text-sm text-foreground">{example.title}</h5>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{example.description}</p>
            <div className="space-y-1">
              {example.urls.map((url, urlIdx) => (
                <code key={urlIdx} className="block text-xs p-2 rounded bg-background/50 text-foreground font-mono break-all">
                  {url}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
