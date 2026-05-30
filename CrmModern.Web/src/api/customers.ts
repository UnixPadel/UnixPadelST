import api from '@/lib/axios'
import type { ApiResponse, Musteri, Ulke } from '@/types'

export const getCustomers = async (): Promise<Musteri[]> => {
  const res = await api.get<ApiResponse<Musteri[]>>('/api/musteri')
  return res.data.data
}

export const getCustomer = async (id: number): Promise<Musteri> => {
  const res = await api.get<ApiResponse<Musteri>>(`/api/musteri/${id}`)
  return res.data.data
}

export interface CustomerWriteDto {
  musteriAd: string
  telefon: string
  zipKod: string
  e_Mail: string
  adres: string
  vatNumarasi: string
  ulkelerID: number
}

export const createCustomer = async (dto: CustomerWriteDto): Promise<Musteri> => {
  const res = await api.post<ApiResponse<Musteri>>('/api/musteri', dto)
  return res.data.data
}

export const updateCustomer = async (id: number, dto: CustomerWriteDto): Promise<Musteri> => {
  const res = await api.put<ApiResponse<Musteri>>(`/api/musteri/${id}`, dto)
  return res.data.data
}

export const deleteCustomer = async (id: number): Promise<void> => {
  await api.delete(`/api/musteri/${id}`)
}

export const getUlkeler = async (): Promise<Ulke[]> => {
  const res = await api.get<ApiResponse<Ulke[]>>('/api/musteri/ulkeler')
  return res.data.data
}

export const createUlke = async (ulkeAdi: string, numaraBirimi: string): Promise<Ulke> => {
  const res = await api.post<ApiResponse<Ulke>>('/api/musteri/ulkeler', { ulkeAdi, numaraBirimi })
  return res.data.data
}
