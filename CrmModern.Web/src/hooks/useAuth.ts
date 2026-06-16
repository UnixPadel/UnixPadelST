import { useCallback } from 'react'
import type { AuthUser } from '@/types'
import { getToken, getStoredUser, saveAuth, refreshAuth, clearAuth } from '@/lib/authStore'

export function useAuth() {
  const getUser = useCallback((): AuthUser | null => getStoredUser(), [])

  // Giriş: remember=true → localStorage (kalıcı), false → sessionStorage (oturumluk).
  const saveUser = useCallback((user: AuthUser, remember: boolean) => saveAuth(user, remember), [])

  // /me tazelemesi: mevcut depolama tercihini korur.
  const refreshUser = useCallback((user: AuthUser) => refreshAuth(user), [])

  const logout = useCallback(() => clearAuth(), [])

  const isLoggedIn = useCallback((): boolean => !!getToken(), [])

  return { getUser, saveUser, refreshUser, logout, isLoggedIn }
}
