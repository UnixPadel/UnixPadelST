import api from '@/lib/axios'
import type { ApiResponse, CreateUserDto, UpdateUserDto, UserListDto } from '@/types'

export const getUsers = async (): Promise<UserListDto[]> => {
  const res = await api.get<ApiResponse<UserListDto[]>>('/api/users')
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
