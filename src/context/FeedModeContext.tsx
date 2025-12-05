import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type FeedMode = 'llmfeed' | 'llmstxt'
export type ThemeMode = 'winter' | 'summer'

interface FeedModeContextType {
    mode: FeedMode
    theme: ThemeMode
    setMode: (mode: FeedMode) => void
    toggleMode: () => void
}

const FeedModeContext = createContext<FeedModeContextType | undefined>(undefined)

const MODE_STORAGE_KEY = 'webmcp-feed-mode'

export function FeedModeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<FeedMode>(() => {
        // Check localStorage for saved preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(MODE_STORAGE_KEY)
            if (saved === 'llmstxt' || saved === 'llmfeed') {
                return saved
            }
        }
        return 'llmfeed'
    })

    // Theme is derived from mode
    const theme: ThemeMode = mode === 'llmfeed' ? 'winter' : 'summer'

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement
        if (theme === 'summer') {
            root.classList.add('summer')
            root.classList.remove('winter')
        } else {
            root.classList.add('winter')
            root.classList.remove('summer')
        }
    }, [theme])

    const setMode = useCallback((newMode: FeedMode) => {
        setModeState(newMode)
        localStorage.setItem(MODE_STORAGE_KEY, newMode)
    }, [])

    const toggleMode = useCallback(() => {
        setMode(mode === 'llmfeed' ? 'llmstxt' : 'llmfeed')
    }, [mode, setMode])

    return (
        <FeedModeContext.Provider value={{ mode, theme, setMode, toggleMode }}>
            {children}
        </FeedModeContext.Provider>
    )
}

export function useFeedMode() {
    const context = useContext(FeedModeContext)
    if (context === undefined) {
        throw new Error('useFeedMode must be used within a FeedModeProvider')
    }
    return context
}

// Helper hook to get mode-specific values
export function useModeConfig() {
    const { mode, theme } = useFeedMode()

    return {
        mode,
        theme,
        isLLMFeed: mode === 'llmfeed',
        isLLMSTxt: mode === 'llmstxt',

        // Mode-specific labels
        title: mode === 'llmfeed' ? 'LLMFeed Analyzer' : 'LLMS.txt Analyzer',
        tagline: mode === 'llmfeed'
            ? 'Universal Feed Analysis'
            : 'Markdown for LLMs',
        description: mode === 'llmfeed'
            ? 'Comprehensive validation, discovery, and archival tools for any LLMFeed-enabled website or custom feed URL'
            : 'Analyze, validate, and prepare llms.txt files for AI consumption',
        filePattern: mode === 'llmfeed'
            ? '.llmfeed.json'
            : 'llms.txt',
        wellKnownPath: mode === 'llmfeed'
            ? '/.well-known/mcp.llmfeed.json'
            : '/llms.txt',
    }
}
