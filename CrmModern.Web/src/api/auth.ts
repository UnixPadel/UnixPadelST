import api from '@/lib/axios'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types'

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const res = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', data)
  return res.data.data
}

export const me = async (): Promise<LoginResponse> => {
  const res = await api.get<ApiResponse<LoginResponse>>('/api/auth/me')
  return res.data.data
}

export const logout = async (): Promise<void> => {
  try { await api.post('/api/auth/logout') } catch { /* sunucu hatası önemli değil — client tarafı temizlenecek */ }
}
