import { useFeedMode, useModeConfig } from '@/context/FeedModeContext'
import { cn } from '@/lib/utils'

export function FeedModeSwitch() {
    const { mode, toggleMode } = useFeedMode()
    const { title } = useModeConfig()

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={toggleMode}
                className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
                    "bg-gradient-to-r border shadow-lg",
                    mode === 'llmfeed'
                        ? "from-primary/20 to-accent/20 border-primary/30 hover:border-primary/50"
                        : "from-primary/20 to-accent/20 border-primary/30 hover:border-primary/50"
                )}
                aria-label={`Switch to ${mode === 'llmfeed' ? 'LLMS.txt' : 'LLMFeed'} mode`}
            >
                {/* LLMFeed JSON indicator */}
                <div className={cn(
                    "flex items-center gap-1.5 transition-all duration-300",
                    mode === 'llmfeed' ? "opacity-100" : "opacity-40"
                )}>
                    <span className="text-lg font-mono font-bold text-primary">{'{}'}</span>
                    <span className={cn(
                        "text-sm font-semibold transition-colors",
                        mode === 'llmfeed' ? "text-foreground" : "text-muted-foreground"
                    )}>
                        JSON
                    </span>
                </div>

                {/* Toggle track */}
                <div className="relative w-12 h-6 bg-muted/50 rounded-full border border-border/50">
                    <div
                        className={cn(
                            "absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300",
                            "bg-gradient-to-br shadow-md",
                            mode === 'llmfeed'
                                ? "left-0.5 from-primary to-accent"
                                : "left-[calc(100%-22px)] from-primary to-accent"
                        )}
                    />
                </div>

                {/* LLMS.txt indicator */}
                <div className={cn(
                    "flex items-center gap-1.5 transition-all duration-300",
                    mode === 'llmstxt' ? "opacity-100" : "opacity-40"
                )}>
                    <span className="text-lg font-mono font-bold text-primary">#</span>
                    <span className={cn(
                        "text-sm font-semibold transition-colors",
                        mode === 'llmstxt' ? "text-foreground" : "text-muted-foreground"
                    )}>
                        TXT
                    </span>
                </div>
            </button>

            {/* Current mode label */}
            <span className="text-xs text-muted-foreground hidden sm:block">
                {mode === 'llmfeed' ? 'LLMFeed JSON Mode' : 'LLMS.txt Mode'}
            </span>
        </div>
    )
}

// Compact version for mobile/smaller spaces
export function FeedModeSwitchCompact() {
    const { mode, toggleMode } = useFeedMode()

    return (
        <button
            onClick={toggleMode}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300",
                "bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30"
            )}
            aria-label={`Switch to ${mode === 'llmfeed' ? 'LLMS.txt' : 'LLMFeed'} mode`}
        >
            <span className={cn(
                "text-sm font-mono font-bold",
                mode === 'llmfeed' ? "text-primary" : "text-muted-foreground"
            )}>
                {'{}'}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className={cn(
                "text-sm font-mono font-bold",
                mode === 'llmstxt' ? "text-primary" : "text-muted-foreground"
            )}>
                #
            </span>
        </button>
    )
}
