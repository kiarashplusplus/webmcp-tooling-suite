import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SignOut, Crown } from '@phosphor-icons/react'
import type { UserInfo } from '@/hooks/use-auth'

interface UserProfileProps {
  user: UserInfo
  onSignOut?: () => void
  compact?: boolean
}

export function UserProfile({ user, onSignOut, compact = false }: UserProfileProps) {
  const handleSignOut = () => {
    window.location.href = '/api/auth/signout'
    onSignOut?.()
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 glass-card rounded-xl border-primary/20">
        <Avatar className="h-8 w-8 border-2 border-primary/30">
          <AvatarImage src={user.avatarUrl} alt={user.login} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {user.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {user.login}
            </span>
            {user.isOwner && (
              <Crown size={14} className="text-accent" weight="fill" />
            )}
          </div>
          {user.email && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive"
          title="Sign out"
        >
          <SignOut size={16} />
        </Button>
      </div>
    )
  }

  return (
    <Card className="p-6 glass-card border-primary/20 shadow-xl">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/30">
          <AvatarImage src={user.avatarUrl} alt={user.login} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
            {user.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">
              {user.login}
            </h3>
            {user.isOwner && (
              <Badge variant="default" className="bg-accent/20 text-accent border-accent/30 px-2 py-0.5">
                <Crown size={12} className="mr-1" weight="fill" />
                Owner
              </Badge>
            )}
          </div>
          
          {user.email && (
            <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
          )}
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <SignOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </Card>
  )
}
