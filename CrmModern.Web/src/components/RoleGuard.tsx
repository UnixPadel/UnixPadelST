import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'

interface Props {
  // Faz 6 / Paket 3: rol VEYA kullanıcı adı. Listede biri eşleşirse geçer.
  // PROMPT-v4 §1: roles verilmezse YALNIZ usernames geçer (rol fallback'i yok).
  roles?: string[]
  usernames?: string[]
  children: React.ReactNode
}

// PROMPT-v7 §1 — merkezi bypass: elshan.rasulov her sayfayı görür.
// Yeni sayfa eklenince tek tek listeye yazmaya gerek kalmasın diye burada.
const SUPERUSER = 'elshan.rasulov'

export function RoleGuard({ roles, usernames, children }: Props) {
  const { getUser } = useAuth()
  const user = getUser()

  if (!user) return <Navigate to="/login" replace />
  // PROMPT-v7 §1 — elshan tüm rol/kullanıcı kontrollerinden muaf.
  // §24 — Admin (süper-admin) de tüm sayfa/rol kontrollerinden muaf.
  if (user.kullaniciAdi === SUPERUSER || isSuperAdmin(user)) return <>{children}</>
  const roleOk = roles?.includes(user.yetkiTuru) ?? false
  const userOk = usernames?.includes(user.kullaniciAdi) ?? false
  if (!roleOk && !userOk) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
