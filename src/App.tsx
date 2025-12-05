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
import { FeedModeSwitch } from '@/components/FeedModeSwitch'
import { FeedModeProvider, useFeedMode, useModeConfig } from '@/context/FeedModeContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'

// Lazy load LLMFeed tab content components
const Validator = lazy(() => import('@/components/Validator').then(m => ({ default: m.Validator })))
const Discovery = lazy(() => import('@/components/Discovery').then(m => ({ default: m.Discovery })))
const RAGPrep = lazy(() => import('@/components/RAGPrep').then(m => ({ default: m.RAGPrep })))
const Archive = lazy(() => import('@/components/Archive').then(m => ({ default: m.Archive })))
const SubmitFeed = lazy(() => import('@/components/SubmitFeed').then(m => ({ default: m.SubmitFeed })))

// Lazy load LLMS.txt tab content components
const LLMSTxtDiscovery = lazy(() => import('@/components/llmstxt/LLMSTxtDiscovery').then(m => ({ default: m.LLMSTxtDiscovery })))
const LLMSTxtValidator = lazy(() => import('@/components/llmstxt/LLMSTxtValidator').then(m => ({ default: m.LLMSTxtValidator })))
const LLMSTxtArchive = lazy(() => import('@/components/llmstxt/LLMSTxtArchive').then(m => ({ default: m.LLMSTxtArchive })))
const LLMSTxtRAGPrep = lazy(() => import('@/components/llmstxt/LLMSTxtRAGPrep').then(m => ({ default: m.LLMSTxtRAGPrep })))
const LLMSTxtDirectory = lazy(() => import('@/components/llmstxt/LLMSTxtDirectory').then(m => ({ default: m.LLMSTxtDirectory })))

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

function AppContent() {
  const { mode } = useFeedMode()
  const { title, tagline, description, filePattern } = useModeConfig()

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

    // Listen for auth complete to restore tab
    const handleAuthComplete = (event: CustomEvent<{ tab?: string }>) => {
      if (event.detail.tab) {
        setActiveTab(event.detail.tab)
      }
    }
    window.addEventListener('webmcp-auth-complete', handleAuthComplete as EventListener)

    // Check for pending auth state on mount (backup restoration)
    const pending = localStorage.getItem('webmcp-auth-pending')
    if (pending) {
      try {
        const state = JSON.parse(pending)
        if (state.tab) {
          setActiveTab(state.tab)
        }
      } catch { /* ignore */ }
    }

    return () => {
      window.removeEventListener('popstate', checkRoute)
      window.removeEventListener('show-terms', handleShowTerms)
      window.removeEventListener('webmcp-auth-complete', handleAuthComplete as EventListener)
    }
  }, [])

  // Reset completed steps and active tab when mode changes
  useEffect(() => {
    setCompletedSteps([])
    setActiveTab('discovery')
    setDiscoveredFeedUrl('')
  }, [mode])

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

  // Background gradient based on mode
  const bgGradient = mode === 'llmfeed'
    ? "bg-[radial-gradient(ellipse_at_top_left,oklch(0.70_0.15_220)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.12_190)_0%,transparent_50%),radial-gradient(ellipse_at_top_right,oklch(0.60_0.14_240)_0%,transparent_50%)]"
    : "bg-[radial-gradient(ellipse_at_top_left,oklch(0.72_0.16_45)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.80_0.14_65)_0%,transparent_50%),radial-gradient(ellipse_at_top_right,oklch(0.65_0.15_30)_0%,transparent_50%)]"

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOMetaTags />
      <FeedStructuredData />
      <SitemapGenerator />
      <div className={`fixed inset-0 ${bgGradient} opacity-30 transition-all duration-500`} />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />

      <div className="relative">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <header className="mb-16 text-center relative">
            <div className="absolute top-0 right-0 flex items-center gap-2">
              <a
                href="./docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
                </svg>
                Docs
              </a>
              <ThemeSwitcher />
            </div>

            {/* Mode Switcher - Prominent placement */}
            <div className="flex justify-center mb-6">
              <FeedModeSwitch />
            </div>

            <div className="inline-block mb-6 px-6 py-2 rounded-full glass-strong">
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">{tagline}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 font-mono tracking-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            <p className="text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <span className="uppercase tracking-wider font-semibold">Works with Any {filePattern} File, Anywhere</span>
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
                mode={mode}
              />
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              {/* Discovery Tab */}
              <TabsContent value="discovery" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  {mode === 'llmfeed' ? (
                    <Discovery onNavigate={handleTabChange} onComplete={() => handleStepComplete('discovery')} />
                  ) : (
                    <LLMSTxtDiscovery onNavigate={handleTabChange} onComplete={() => handleStepComplete('discovery')} />
                  )}
                </Suspense>
              </TabsContent>

              {/* Validator Tab */}
              <TabsContent value="validator" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  {mode === 'llmfeed' ? (
                    <Validator
                      onNavigate={handleTabChange}
                      onComplete={() => handleStepComplete('validator')}
                      initialUrl={discoveredFeedUrl}
                    />
                  ) : (
                    <LLMSTxtValidator
                      onNavigate={handleTabChange}
                      onComplete={() => handleStepComplete('validator')}
                      initialUrl={discoveredFeedUrl}
                    />
                  )}
                </Suspense>
              </TabsContent>

              {/* Archive Tab */}
              <TabsContent value="archive" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  {mode === 'llmfeed' ? (
                    <Archive
                      onNavigate={handleTabChange}
                      onComplete={() => handleStepComplete('archive')}
                      initialUrl={discoveredFeedUrl}
                    />
                  ) : (
                    <LLMSTxtArchive
                      onNavigate={handleTabChange}
                      onComplete={() => handleStepComplete('archive')}
                      initialUrl={discoveredFeedUrl}
                    />
                  )}
                </Suspense>
              </TabsContent>

              {/* Submit Tab - LLMFeed only */}
              {mode === 'llmfeed' && (
                <TabsContent value="submit" className="mt-0">
                  <Suspense fallback={<TabLoadingSkeleton />}>
                    <SubmitFeed />
                  </Suspense>
                </TabsContent>
              )}

              {/* RAG Prep Tab */}
              <TabsContent value="rag" className="mt-0">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  {mode === 'llmfeed' ? (
                    <RAGPrep initialUrl={discoveredFeedUrl} />
                  ) : (
                    <LLMSTxtRAGPrep initialUrl={discoveredFeedUrl} />
                  )}
                </Suspense>
              </TabsContent>
            </Tabs>

            {/* Submit Your Feed CTA - LLMFeed only */}
            {mode === 'llmfeed' && activeTab !== 'submit' && (
              <div className="mt-12 mb-8">
                <div className="glass-card rounded-2xl p-6 border border-primary/20 bg-primary/5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground font-mono">Own a WebMCP-enabled site?</h3>
                      <p className="text-sm text-muted-foreground">Get listed in our directory and earn verification badges</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('submit')}
                      className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Submit Your Feed →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Your Site CTA - LLMS.txt mode */}
            {mode === 'llmstxt' && activeTab !== 'archive' && (
              <div className="mt-12 mb-8">
                <div className="glass-card rounded-2xl p-6 border border-primary/20 bg-primary/5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground font-mono">Own a WebMCP-enabled site?</h3>
                      <p className="text-sm text-muted-foreground">Archive your llms.txt and get listed in our directory</p>
                    </div>
                    <button
                      onClick={() => handleTabChange('archive')}
                      className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Submit Your llms.txt →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feed Directory - LLMFeed mode only */}
            {mode === 'llmfeed' && (
              <div className="mt-12">
                <FeedDirectory />
              </div>
            )}

            {/* LLMS.txt Directory - LLMS.txt mode only */}
            {mode === 'llmstxt' && (
              <div className="mt-12">
                <Suspense fallback={<TabLoadingSkeleton />}>
                  <LLMSTxtDirectory />
                </Suspense>
              </div>
            )}
          </main>

          <footer className="mt-20 pt-10 text-center">
            <div className="glass-card rounded-2xl p-8 mx-auto max-w-3xl">
              <p className="mb-3 text-foreground/90 font-medium">
                Universal Feed Analyzer • Supports {mode === 'llmfeed' ? '.llmfeed.json' : 'llms.txt'} files from any location
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {mode === 'llmfeed'
                  ? 'Provides validation, discovery, archival, and RAG preparation for WebMCP/LLMFeed ecosystem'
                  : 'Analyze, validate, and prepare llms.txt markdown files for AI consumption'
                }
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

function App() {
  return (
    <FeedModeProvider>
      <AppContent />
    </FeedModeProvider>
  )
}

export default App