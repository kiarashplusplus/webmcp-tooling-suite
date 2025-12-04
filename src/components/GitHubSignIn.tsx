import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { GithubLogo, Info, Lock } from '@phosphor-icons/react'
import { useAuth } from '@/hooks/use-auth'

interface GitHubSignInProps {
  onClose?: () => void
  context?: 'publish' | 'general'
}

export function GitHubSignIn({ onClose, context = 'general' }: GitHubSignInProps) {
  const { signIn } = useAuth()

  const handleSignIn = () => {
    signIn()
  }

  return (
    <Card className="p-8 glass-card border-primary/30 shadow-2xl max-w-md mx-auto">
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <GithubLogo size={32} className="text-primary" weight="fill" />
        </div>

        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            GitHub Sign In Required
          </h3>
          <p className="text-sm text-muted-foreground">
            {context === 'publish' 
              ? 'Publishing to the public directory requires authentication to prevent spam and maintain quality.'
              : 'Sign in with your GitHub account to continue.'}
          </p>
        </div>

        {context === 'publish' && (
          <Alert className="glass border-accent/20 text-left">
            <Info size={18} className="text-accent" />
            <AlertTitle className="text-sm font-semibold">What You Can Do</AlertTitle>
            <AlertDescription className="text-xs space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>Archive any feed for free (no sign-in required)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>Export archived snapshots as JSON files</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock size={14} className="text-destructive mt-0.5" />
                <span>Publish to public directory (requires GitHub sign-in)</span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleSignIn}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <GithubLogo size={20} className="mr-2" weight="fill" />
            Sign in with GitHub
          </Button>

          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          We only access your public profile information. No private data is collected.
        </p>
      </div>
    </Card>
  )
}
