import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { lazy, Suspense, useState, useEffect } from 'react'
import { ArchiveServer } from '@/components/ArchiveServer'
import { FeedStructuredData } from '@/components/FeedStructuredData'
import { SitemapGenerator } from '@/components/SitemapGenerator'
import { SEOMetaTags } from '@/components/SEOMetaTags'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { Toaster } from '@/components/ui/sonner'
import { ShieldCheck, MagnifyingGlass, Database, Archive as ArchiveIcon, FolderOpen } from '@phosphor-icons/react'

// Lazy load tab content components for code splitting
const Validator = lazy(() => import('@/components/Validator').then(m => ({ default: m.Validator })))
const Discovery = lazy(() => import('@/components/Discovery').then(m => ({ default: m.Discovery })))
const RAGPrep = lazy(() => import('@/components/RAGPrep').then(m => ({ default: m.RAGPrep })))
const Archive = lazy(() => import('@/components/Archive').then(m => ({ default: m.Archive })))
const Directory = lazy(() => import('@/components/Directory').then(m => ({ default: m.Directory })))

// Loading skeleton for tab content
function TabLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded-lg" />
      <div className="h-4 w-96 bg-muted/50 rounded" />
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="h-10 bg-muted/30 rounded-lg" />
        <div className="h-32 bg-muted/20 rounded-lg" />
        <div className="h-10 w-32 bg-primary/20 rounded-lg" />
      </div>
    </div>
  )
}

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
        <SEOMetaTags />
        <ArchiveServer />
        <Toaster position="bottom-right" />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOMetaTags />
      <FeedStructuredData />
      <SitemapGenerator />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.70_0.15_220)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.12_190)_0%,transparent_50%),radial-gradient(ellipse_at_top_right,oklch(0.60_0.14_240)_0%,transparent_50%)] opacity-30" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <header className="mb-16 text-center relative">
            <div className="absolute top-0 right-0">
              <ThemeSwitcher />
            </div>
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

          <main>
            <Tabs defaultValue="directory" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-10 glass-strong p-2 rounded-2xl" role="tablist" aria-label="Main navigation">
                <TabsTrigger 
                  value="directory" 
                  className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
                  aria-label="Feed Directory"
                >
                  <FolderOpen size={18} className="mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Directory</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="validator" 
                  className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
                  aria-label="Feed Validator"
                >
                  <ShieldCheck size={18} className="mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Validator</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="discovery" 
                  className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
                  aria-label="Feed Discovery"
                >
                  <MagnifyingGlass size={18} className="mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Discovery</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="archive" 
                  className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
                  aria-label="Feed Archive"
                >
                  <ArchiveIcon size={18} className="mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Archive</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="rag" 
                  className="data-[state=active]:glass-strong data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-semibold rounded-xl transition-all duration-300"
                  aria-label="RAG Preparation"
                >
                  <Database size={18} className="mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">RAG Prep</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="directory" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Directory />
                </Suspense>
              </TabsContent>

              <TabsContent value="validator" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Validator />
                </Suspense>
              </TabsContent>

              <TabsContent value="discovery" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Discovery />
                </Suspense>
              </TabsContent>

              <TabsContent value="archive" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Archive />
                </Suspense>
              </TabsContent>

              <TabsContent value="rag" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <RAGPrep />
                </Suspense>
              </TabsContent>
            </Tabs>
          </main>

          <footer className="mt-20 pt-10 text-center">
            <div className="glass-card rounded-2xl p-8 mx-auto max-w-3xl">
              <p className="mb-3 text-foreground/90 font-medium">
                Universal Feed Analyzer • Supports any .llmfeed.json file from any location
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Provides validation, discovery, archival, and RAG preparation for WebMCP/LLMFeed ecosystem
              </p>
              <div className="pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-3">
                  Created by{' '}
                  <a 
                    href="https://25x.codes/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-accent transition-colors font-semibold"
                  >
                    Kiarash Adl
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Open source •{' '}
                  <a 
                    href="https://github.com/websearch-via-camera/webmcp-tooling-suite" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary/80 hover:text-accent transition-colors underline underline-offset-2"
                  >
                    View on GitHub
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}

export default App