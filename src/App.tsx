import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Validator } from '@/components/Validator'
import { Discovery } from '@/components/Discovery'
import { RAGPrep } from '@/components/RAGPrep'
import { Archive } from '@/components/Archive'
import { Directory } from '@/components/Directory'
import { ArchiveServer } from '@/components/ArchiveServer'
import { Toaster } from '@/components/ui/sonner'
import { ShieldCheck, MagnifyingGlass, Database, Archive as ArchiveIcon, FolderOpen } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

function App() {
  const [isArchiveRoute, setIsArchiveRoute] = useState(false)

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      setIsArchiveRoute(path.startsWith('/archive/') && path.endsWith('.json'))
    }
    
    checkRoute()
    window.addEventListener('popstate', checkRoute)
    
    return () => window.removeEventListener('popstate', checkRoute)
  }, [])

  if (isArchiveRoute) {
    return (
      <>
        <ArchiveServer />
        <Toaster position="bottom-right" />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.65_0.20_200)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.75_0.22_150)_0%,transparent_50%),radial-gradient(ellipse_at_top_right,oklch(0.60_0.18_280)_0%,transparent_50%)] opacity-30" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <header className="mb-16 text-center">
            <div className="inline-block mb-6 px-6 py-2 rounded-full glass-strong">
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">Universal Feed Analysis</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 font-mono tracking-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                LLMFeed Analyzer
              </span>
            </h1>
            <p className="text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Comprehensive validation, discovery, and archival tools for any LLMFeed-enabled website or custom feed URL
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <span className="uppercase tracking-wider font-semibold">Works with Any .llmfeed.json File, Anywhere</span>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            </div>
          </header>

          <Tabs defaultValue="directory" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-10 glass-strong p-2 rounded-2xl">
              <TabsTrigger 
                value="directory" 
                className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
              >
                <FolderOpen size={18} className="mr-2" />
                <span className="hidden sm:inline">Directory</span>
              </TabsTrigger>
              <TabsTrigger 
                value="validator" 
                className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
              >
                <ShieldCheck size={18} className="mr-2" />
                <span className="hidden sm:inline">Validator</span>
              </TabsTrigger>
              <TabsTrigger 
                value="discovery" 
                className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
              >
                <MagnifyingGlass size={18} className="mr-2" />
                <span className="hidden sm:inline">Discovery</span>
              </TabsTrigger>
              <TabsTrigger 
                value="archive" 
                className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
              >
                <ArchiveIcon size={18} className="mr-2" />
                <span className="hidden sm:inline">Archive</span>
              </TabsTrigger>
              <TabsTrigger 
                value="rag" 
                className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
              >
                <Database size={18} className="mr-2" />
                <span className="hidden sm:inline">RAG Prep</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="mt-0">
              <Directory />
            </TabsContent>

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

          <footer className="mt-20 pt-10 text-center">
            <div className="glass-card rounded-2xl p-8 mx-auto max-w-3xl">
              <p className="mb-3 text-foreground/90 font-medium">
                Universal Feed Analyzer • Supports any .llmfeed.json file from any location
              </p>
              <p className="text-sm text-muted-foreground">
                Provides validation, discovery, archival, and RAG preparation for WebMCP/LLMFeed ecosystem
              </p>
            </div>
          </footer>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}

export default App