import { Tabs, TabsContent } from '@/components/ui/tabs'
import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { ArchiveServer } from '@/components/ArchiveServer'
import { FeedStructuredData } from '@/components/FeedStructuredData'
import { SitemapGenerator } from '@/components/SitemapGenerator'
import { SEOMetaTags } from '@/components/SEOMetaTags'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { WorkflowStepper } from '@/components/WorkflowStepper'
import { TermsOfService } from '@/components/TermsOfService'
import { FeedDirectory } from '@/components/Directory'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'

// Lazy load tab content components for code splitting
const Validator = lazy(() => import('@/components/Validator').then(m => ({ default: m.Validator })))
const Discovery = lazy(() => import('@/components/Discovery').then(m => ({ default: m.Discovery })))
const RAGPrep = lazy(() => import('@/components/RAGPrep').then(m => ({ default: m.RAGPrep })))
const Archive = lazy(() => import('@/components/Archive').then(m => ({ default: m.Archive })))

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
  const [activeTab, setActiveTab] = useState('discovery')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [showTerms, setShowTerms] = useState(false)
  const [discoveredFeedUrl, setDiscoveredFeedUrl] = useState('')

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      // Handle both root deployment and subdirectory deployment (e.g., /repo-name/archive/...)
      const isArchive = path.includes('/archive/') && path.endsWith('.json')
      setIsArchiveRoute(isArchive)
    }
    
    checkRoute()
    window.addEventListener('popstate', checkRoute)
    
    // Listen for terms dialog trigger
    const handleShowTerms = () => setShowTerms(true)
    window.addEventListener('show-terms', handleShowTerms)
    
    return () => {
      window.removeEventListener('popstate', checkRoute)
      window.removeEventListener('show-terms', handleShowTerms)
    }
  }, [])

  const handleTabChange = useCallback((value: string, feedUrl?: string) => {
    setActiveTab(value)
    if (feedUrl) {
      setDiscoveredFeedUrl(feedUrl)
    }
    // Scroll to the developer workflow section when navigating between tabs
    const workflowSection = document.getElementById('developer-workflow')
    if (workflowSection) {
      workflowSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleStepComplete = useCallback((stepId: string) => {
    setCompletedSteps(prev => prev.includes(stepId) ? prev : [...prev, stepId])
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
            {/* Developer Workflow Tools */}
            <div className="mb-8" id="developer-workflow">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
                  For Developers
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>
              
              <WorkflowStepper 
                currentStep={activeTab} 
                onStepClick={handleTabChange}
                completedSteps={completedSteps}
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsContent value="discovery" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Discovery onNavigate={handleTabChange} onComplete={() => handleStepComplete('discovery')} />
                </Suspense>
              </TabsContent>

              <TabsContent value="validator" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Validator 
                    onNavigate={handleTabChange} 
                    onComplete={() => handleStepComplete('validator')}
                    initialUrl={discoveredFeedUrl}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="archive" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <Archive 
                    onNavigate={handleTabChange} 
                    onComplete={() => handleStepComplete('archive')}
                    initialUrl={discoveredFeedUrl}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="rag" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <RAGPrep initialUrl={discoveredFeedUrl} />
                </Suspense>
              </TabsContent>
            </Tabs>

            {/* Feed Directory - Always visible for scrapers & AI bots */}
            <div className="mt-12">
              <FeedDirectory />
            </div>
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
                <p className="text-xs text-muted-foreground/80 mb-2">
                  Open source •{' '}
                  <a 
                    href="https://github.com/kiarashplusplus/webmcp-tooling-suite" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary/80 hover:text-accent transition-colors underline underline-offset-2"
                  >
                    View on GitHub
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/60">
                  <button 
                    onClick={() => setShowTerms(true)}
                    className="text-primary/60 hover:text-accent transition-colors underline underline-offset-2"
                  >
                    Terms of Service
                  </button>
                  {' • '}
                  Software provided "as-is" without warranty
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Terms of Service Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-strong border-primary/20">
          <DialogHeader>
            <DialogTitle className="sr-only">Terms of Service</DialogTitle>
          </DialogHeader>
          <TermsOfService embedded />
        </DialogContent>
      </Dialog>

      <Toaster position="bottom-right" />
    </div>
  )
}

export default App