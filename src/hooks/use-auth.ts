import { useState, useEffect } from 'react'

export interface UserInfo {
  login: string
  avatarUrl: string
  email?: string
  id: number
  isOwner: boolean
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    setLoading(true)
    try {
      const userInfo = await window.spark.user()
      setUser(userInfo)
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    refresh: loadUser
  }
}
