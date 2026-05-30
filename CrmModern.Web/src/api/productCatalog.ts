import api from '@/lib/axios'
import type { ApiResponse, ProductCatalogCategoryDto, ProductCatalogComponentDto } from '@/types'

// ── Categories ───────────────────────────────────────────────────────────────

export const getCategories = async (): Promise<ProductCatalogCategoryDto[]> => {
  const res = await api.get<ApiResponse<ProductCatalogCategoryDto[]>>('/api/product-catalog/categories')
  return res.data.data
}

export const createCategory = async (kategoriAdi: string): Promise<void> => {
  await api.post('/api/product-catalog/categories', { kategoriAdi })
}

export const updateCategory = async (kategoriId: number, kategoriAdi: string): Promise<void> => {
  await api.put(`/api/product-catalog/categories/${kategoriId}`, { kategoriAdi })
}

export const deleteCategory = async (kategoriId: number): Promise<void> => {
  await api.delete(`/api/product-catalog/categories/${kategoriId}`)
}

// ── Components ───────────────────────────────────────────────────────────────

export const getComponents = async (): Promise<ProductCatalogComponentDto[]> => {
  const res = await api.get<ApiResponse<ProductCatalogComponentDto[]>>('/api/product-catalog/components')
  return res.data.data
}

export const createComponent = async (bilesenAdi: string, birim?: string): Promise<void> => {
  await api.post('/api/product-catalog/components', { bilesenAdi, birim })
}

export const updateComponent = async (bilesenId: number, data: { bilesenAdi: string; birim?: string; fiyat: number }): Promise<void> => {
  await api.put(`/api/product-catalog/components/${bilesenId}`, data)
}

export const deleteComponent = async (bilesenId: number): Promise<void> => {
  await api.delete(`/api/product-catalog/components/${bilesenId}`)
}

// ── Attributes (OznitelikTablo) ──────────────────────────────────────────────

export interface AttributeDto {
  oznitelikID: number
  bilesenID: number
  oznitelikAdı: string
}

export const getAttributes = async (bilesenId?: number): Promise<AttributeDto[]> => {
  const url = bilesenId ? `/api/product-catalog/attributes?bilesenId=${bilesenId}` : '/api/product-catalog/attributes'
  const res = await api.get<ApiResponse<AttributeDto[]>>(url)
  return res.data.data
}

export const createAttribute = async (bilesenID: number, oznitelikAdı: string): Promise<AttributeDto> => {
  const res = await api.post<ApiResponse<AttributeDto>>('/api/product-catalog/attributes', { bilesenID, oznitelikAdı })
  return res.data.data
}

export const updateAttribute = async (oznitelikId: number, oznitelikAdı: string): Promise<void> => {
  await api.put(`/api/product-catalog/attributes/${oznitelikId}`, { oznitelikAdı })
}

export const deleteAttribute = async (oznitelikId: number): Promise<void> => {
  await api.delete(`/api/product-catalog/attributes/${oznitelikId}`)
}

// ── Recipe (Recete) ──────────────────────────────────────────────────────────

export const getRecipe = async (kategoriId: number): Promise<ProductCatalogCategoryDto> => {
  const res = await api.get<ApiResponse<ProductCatalogCategoryDto>>(`/api/product-catalog/categories/${kategoriId}/recipe`)
  return res.data.data
}

export const updateRecipe = async (
  kategoriId: number,
  fiyat: number,
  components: { bilesenID: number; adet: number }[]
): Promise<void> => {
  await api.put(`/api/product-catalog/categories/${kategoriId}/recipe`, { fiyat, components })
}
