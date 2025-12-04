import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Validator } from '@/components/Validator'
import { Discovery } from '@/components/Discovery'
import { RAGPrep } from '@/components/RAGPrep'
import { Archive } from '@/components/Archive'
import { Toaster } from '@/components/ui/sonner'
import { ShieldCheck, MagnifyingGlass, Database, Archive as ArchiveIcon } from '@phosphor-icons/react'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.55_0.15_195)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.75_0.20_130)_0%,transparent_50%)] opacity-10" />
        
        <div className="relative">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <header className="mb-12 text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 font-mono tracking-tight">
                WebMCP Tooling Suite
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive validation, discovery, and archival tools for LLMFeed-enabled websites
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="h-px w-8 bg-border" />
                <span className="uppercase tracking-wide">Addressing Critical Gaps in WebMCP Ecosystem</span>
                <div className="h-px w-8 bg-border" />
              </div>
            </header>

            <Tabs defaultValue="validator" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted/50 p-1">
                <TabsTrigger value="validator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                  <ShieldCheck size={18} className="mr-2" />
                  <span className="hidden sm:inline">Validator</span>
                </TabsTrigger>
                <TabsTrigger value="discovery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                  <MagnifyingGlass size={18} className="mr-2" />
                  <span className="hidden sm:inline">Discovery</span>
                </TabsTrigger>
                <TabsTrigger value="archive" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                  <ArchiveIcon size={18} className="mr-2" />
                  <span className="hidden sm:inline">Archive</span>
                </TabsTrigger>
                <TabsTrigger value="rag" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
                  <Database size={18} className="mr-2" />
                  <span className="hidden sm:inline">RAG Prep</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="validator" className="mt-0">
                <Validator />
              </TabsContent>

              <TabsContent value="discovery" className="mt-0">
                <Discovery />
              </TabsContent>

              <TabsContent value="archive" className="mt-0">
                <Archive />
              </TabsContent>

              <TabsContent value="rag" className="mt-0">
                <RAGPrep />
              </TabsContent>
            </Tabs>

            <footer className="mt-16 pt-8 border-t border-border text-center text-sm text-muted-foreground">
              <p className="mb-2">
                Built for the WebMCP ecosystem • Addresses Gap 1 (Trust Validation), Gap 2 (RAG Indexing), and Gap 3 (Feed Archival)
              </p>
              <p className="text-xs">
                Based on comprehensive research of MCP, WebMCP, and LLMFeed specifications
              </p>
            </footer>
          </div>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}

export default App