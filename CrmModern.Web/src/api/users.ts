import api from '@/lib/axios'
import type { ApiResponse, CreateUserDto, UpdateUserDto, UserListDto, UserLookupDto } from '@/types'

export const getUsers = async (): Promise<UserListDto[]> => {
  const res = await api.get<ApiResponse<UserListDto[]>>('/api/users')
  return res.data.data
}

// Slim list — Fabrika "Temsilci" filtresi gibi dropdown'lar için.
// /api/users 'Yonetici-only' iken /api/users/lookup tüm authenticated kullanıcılara açık.
export const getUsersLookup = async (): Promise<UserLookupDto[]> => {
  const res = await api.get<ApiResponse<UserLookupDto[]>>('/api/users/lookup')
  return res.data.data
}

export const createUser = async (dto: CreateUserDto): Promise<void> => {
  await api.post('/api/users', dto)
}

export const updateUser = async (kullaniciId: number, dto: UpdateUserDto): Promise<void> => {
  await api.put(`/api/users/${kullaniciId}`, dto)
}

export const deleteUser = async (kullaniciId: number): Promise<void> => {
  await api.delete(`/api/users/${kullaniciId}`)
}

export const changeUserPassword = async (kullaniciId: number, newPassword: string): Promise<void> => {
  await api.post(`/api/users/${kullaniciId}/password`, { newPassword })
}
