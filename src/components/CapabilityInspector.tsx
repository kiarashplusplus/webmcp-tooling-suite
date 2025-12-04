import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { JsonViewer } from './JsonViewer'
import type { Capability, LLMFeed } from '@/lib/llmfeed'
import { toast } from 'sonner'
import { 
  Code, 
  Copy, 
  Play, 
  FileJs, 
  Lightbulb,
  ArrowRight,
  CheckCircle,
  WarningCircle
} from '@phosphor-icons/react'

interface CapabilityInspectorProps {
  capability: Capability
  feed: LLMFeed
  onClose?: () => void
}

/**
 * Generate a sample JSON-RPC 2.0 request for a capability
 */
function generateJsonRpcRequest(capability: Capability, feed: LLMFeed): object {
  const sampleParams: Record<string, any> = {}
  
  if (capability.inputSchema?.properties) {
    for (const [key, schema] of Object.entries(capability.inputSchema.properties)) {
      const s = schema as Record<string, any>
      sampleParams[key] = getSampleValue(key, s)
    }
  }

  return {
    jsonrpc: '2.0',
    id: 1,
    method: `tools/${capability.name}`,
    params: sampleParams
  }
}

/**
 * Generate a sample value based on JSON Schema type
 */
function getSampleValue(key: string, schema: Record<string, any>): any {
  // Use example if provided
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  
  // Generate based on type
  const type = schema.type
  
  if (type === 'string') {
    if (schema.enum) return schema.enum[0]
    if (key.includes('url')) return 'https://example.com'
    if (key.includes('email')) return 'user@example.com'
    if (key.includes('name')) return 'example'
    if (key.includes('id')) return 'abc123'
    return `<${key}>`
  }
  
  if (type === 'number' || type === 'integer') {
    if (schema.minimum !== undefined) return schema.minimum
    if (schema.maximum !== undefined) return Math.min(schema.maximum, 10)
    return 1
  }
  
  if (type === 'boolean') return true
  
  if (type === 'array') {
    const itemSample = schema.items 
      ? getSampleValue('item', schema.items)
      : '<item>'
    return [itemSample]
  }
  
  if (type === 'object') {
    if (schema.properties) {
      const obj: Record<string, any> = {}
      for (const [propKey, propSchema] of Object.entries(schema.properties)) {
        obj[propKey] = getSampleValue(propKey, propSchema as Record<string, any>)
      }
      return obj
    }
    return {}
  }
  
  return null
}

/**
 * Validate the capability schema structure
 */
function validateCapabilitySchema(capability: Capability): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!capability.name) {
    issues.push('Missing capability name')
  }
  
  if (!capability.description) {
    issues.push('Missing capability description')
  }
  
  if (capability.inputSchema) {
    if (capability.inputSchema.type !== 'object') {
      issues.push('Input schema should have type "object"')
    }
    if (capability.inputSchema.properties) {
      for (const [key, schema] of Object.entries(capability.inputSchema.properties)) {
        const s = schema as Record<string, any>
        if (!s.type && !s.$ref) {
          issues.push(`Property "${key}" is missing type definition`)
        }
      }
    }
  }
  
  if (capability.outputSchema) {
    if (!capability.outputSchema.type && !capability.outputSchema.$ref) {
      issues.push('Output schema is missing type definition')
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  }
}

export function CapabilityInspector({ capability, feed, onClose }: CapabilityInspectorProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const jsonRpcRequest = generateJsonRpcRequest(capability, feed)
  const schemaValidation = validateCapabilitySchema(capability)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const getInvocationUrl = () => {
    if (capability.url) return capability.url
    if (feed.metadata.origin) {
      return `${feed.metadata.origin}/mcp`
    }
    return '<endpoint-url>'
  }

  const curlCommand = `curl -X POST ${getInvocationUrl()} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(jsonRpcRequest)}'`

  const fetchCode = `const response = await fetch('${getInvocationUrl()}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(jsonRpcRequest, null, 2)})
});
const result = await response.json();`

  const pythonCode = `import requests

response = requests.post(
    '${getInvocationUrl()}',
    json=${JSON.stringify(jsonRpcRequest, null, 4).replace(/"/g, "'")}
)
result = response.json()`

  return (
    <Card className="glass-strong p-6 shadow-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Code size={24} className="text-primary" />
            <h3 className="text-xl font-bold text-foreground font-mono">
              {capability.name}
            </h3>
            <Badge variant="outline" className="text-xs">
              {capability.type || 'tool'}
            </Badge>
          </div>
          <p className="text-muted-foreground">{capability.description}</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      {!schemaValidation.valid && (
        <Alert className="mb-6 border-warning/30 bg-warning/5">
          <WarningCircle size={20} className="text-warning" />
          <AlertTitle className="text-warning">Schema Issues Detected</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {schemaValidation.issues.map((issue, idx) => (
                <li key={idx}>• {issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
          <TabsTrigger value="invoke">Invoke</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {capability.type && (
              <div className="glass-card p-4 rounded-xl">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</div>
                <div className="font-mono text-foreground">{capability.type}</div>
              </div>
            )}
            {capability.method && (
              <div className="glass-card p-4 rounded-xl">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HTTP Method</div>
                <Badge>{capability.method}</Badge>
              </div>
            )}
            {capability.protocol && (
              <div className="glass-card p-4 rounded-xl">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Protocol</div>
                <Badge variant="secondary">{capability.protocol}</Badge>
              </div>
            )}
            <div className="glass-card p-4 rounded-xl">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Parameters</div>
              <div className="font-mono text-foreground">
                {capability.inputSchema?.properties 
                  ? Object.keys(capability.inputSchema.properties).length 
                  : 0}
              </div>
            </div>
          </div>

          {capability.url && (
            <div className="glass-card p-4 rounded-xl">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Endpoint URL</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded bg-muted text-xs font-mono text-foreground overflow-x-auto">
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

          {capability.inputSchema?.required && capability.inputSchema.required.length > 0 && (
            <div className="glass-card p-4 rounded-xl">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Required Parameters</div>
              <div className="flex flex-wrap gap-2">
                {capability.inputSchema.required.map((param: string) => (
                  <Badge key={param} variant="destructive" className="font-mono text-xs">
                    {param}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="schemas" className="space-y-6">
          {capability.inputSchema ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight size={16} className="text-primary" />
                <h4 className="font-semibold text-foreground">Input Schema</h4>
                {schemaValidation.valid && (
                  <CheckCircle size={16} className="text-accent" weight="fill" />
                )}
              </div>
              <JsonViewer data={capability.inputSchema} maxHeight="300px" />
            </div>
          ) : (
            <Alert className="border-muted">
              <Lightbulb size={20} />
              <AlertDescription>
                No input schema defined. This capability accepts no parameters.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {capability.outputSchema ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight size={16} className="text-accent rotate-180" />
                <h4 className="font-semibold text-foreground">Output Schema</h4>
              </div>
              <JsonViewer data={capability.outputSchema} maxHeight="300px" />
            </div>
          ) : (
            <Alert className="border-muted">
              <Lightbulb size={20} />
              <AlertDescription>
                No output schema defined. Response format may vary.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="invoke" className="space-y-4">
          <Alert className="border-primary/30 bg-primary/5">
            <Play size={20} className="text-primary" />
            <AlertTitle>JSON-RPC 2.0 Request</AlertTitle>
            <AlertDescription>
              Sample request payload following the MCP JSON-RPC 2.0 specification
            </AlertDescription>
          </Alert>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">Request Payload</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(jsonRpcRequest, null, 2), 'JSON-RPC request')}
              >
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
            <JsonViewer data={jsonRpcRequest} maxHeight="300px" />
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground text-sm">cURL Command</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(curlCommand, 'cURL command')}
              >
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-4 rounded-xl glass-card text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
              {curlCommand}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="code" className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileJs size={18} className="text-yellow-500" />
                <h4 className="font-semibold text-foreground text-sm">JavaScript / TypeScript</h4>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(fetchCode, 'JavaScript code')}
              >
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-4 rounded-xl glass-card text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
              {fetchCode}
            </pre>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-blue-500" />
                <h4 className="font-semibold text-foreground text-sm">Python</h4>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(pythonCode, 'Python code')}
              >
                <Copy size={14} className="mr-1" />
                Copy
              </Button>
            </div>
            <pre className="p-4 rounded-xl glass-card text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
              {pythonCode}
            </pre>
          </div>
        </TabsContent>
      </Tabs>

      <Separator className="my-6" />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(JSON.stringify(capability, null, 2), 'Capability JSON')}
          className="flex-1"
        >
          <Copy size={14} className="mr-2" />
          Copy Full Capability
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(JSON.stringify(jsonRpcRequest, null, 2), 'JSON-RPC request')}
          className="flex-1"
        >
          <Play size={14} className="mr-2" />
          Copy JSON-RPC Request
        </Button>
      </div>
    </Card>
  )
}
