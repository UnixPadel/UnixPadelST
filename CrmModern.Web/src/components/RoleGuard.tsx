import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  roles: string[]
  // Faz 6 / Paket 3: rol VEYA kullanıcı adı. Listede biri eşleşirse geçer.
  usernames?: string[]
  children: React.ReactNode
}

export function RoleGuard({ roles, usernames, children }: Props) {
  const { getUser } = useAuth()
  const user = getUser()

  if (!user) return <Navigate to="/login" replace />
  const roleOk = roles.includes(user.yetkiTuru)
  const userOk = usernames?.includes(user.kullaniciAdi) ?? false
  if (!roleOk && !userOk) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
