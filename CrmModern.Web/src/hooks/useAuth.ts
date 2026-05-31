import { useCallback } from 'react'
import type { AuthUser } from '@/types'

const USER_KEY = 'user'
const TOKEN_KEY = 'token'

export function useAuth() {
  const getUser = useCallback((): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  }, [])

  const saveUser = useCallback((user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, user.token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  const isLoggedIn = useCallback((): boolean => {
    return !!localStorage.getItem(TOKEN_KEY)
  }, [])

  return { getUser, saveUser, logout, isLoggedIn }
}
