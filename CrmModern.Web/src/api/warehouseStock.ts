import api from '@/lib/axios'
import type {
  ApiResponse,
  StockListDto,
  StockItemDetailDto,
  CreateStockRequest,
  CreateStockResultDto,
  UpdateStockItemRequest,
  AddStockExitRequest,
  AnalyzeResultDto,
} from '@/types'

export const getStockItems = async (params?: {
  konum?: string
  tamamlananlar?: boolean
  q?: string
  includeDeleted?: boolean
}): Promise<StockListDto> => {
  const res = await api.get<ApiResponse<StockListDto>>('/api/warehouse-stock/items', {
    params: {
      konum: params?.konum && params.konum !== 'Tumu' ? params.konum : undefined,
      tamamlananlar: params?.tamamlananlar ? true : undefined,
      q: params?.q || undefined,
      includeDeleted: params?.includeDeleted ? true : undefined,
    },
  })
  return res.data.data
}

export const getStockItemDetail = async (id: number): Promise<StockItemDetailDto> => {
  const res = await api.get<ApiResponse<StockItemDetailDto>>(`/api/warehouse-stock/items/${id}`)
  return res.data.data
}

export const analyzeDeclaration = async (file: File): Promise<AnalyzeResultDto> => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post<ApiResponse<AnalyzeResultDto>>('/api/warehouse-stock/declarations/analyze', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.data
}

export const createStock = async (
  data: CreateStockRequest,
  file?: File | null,
): Promise<CreateStockResultDto> => {
  if (file) {
    const fd = new FormData()
    fd.append('data', JSON.stringify(data))
    fd.append('file', file)
    const res = await api.post<ApiResponse<CreateStockResultDto>>('/api/warehouse-stock/items', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  }

  const res = await api.post<ApiResponse<CreateStockResultDto>>('/api/warehouse-stock/items', data)
  return res.data.data
}

export const updateStockItem = async (
  id: number,
  data: UpdateStockItemRequest,
): Promise<void> => {
  await api.put(`/api/warehouse-stock/items/${id}`, data)
}

export const deleteStockItem = async (id: number): Promise<void> => {
  await api.delete(`/api/warehouse-stock/items/${id}`)
}

/** K5 — silinen stok kalemini geri yükler. */
export const restoreStockItem = async (id: number): Promise<void> => {
  await api.post(`/api/warehouse-stock/items/${id}/restore`)
}

export const addStockExit = async (
  id: number,
  data: AddStockExitRequest,
): Promise<number> => {
  const res = await api.post<ApiResponse<number>>(`/api/warehouse-stock/items/${id}/exits`, data)
  return res.data.data
}

export const undoStockExit = async (exitId: number): Promise<void> => {
  await api.post(`/api/warehouse-stock/exits/${exitId}/undo`)
}

export const downloadDeclarationDocument = async (
  beyannameId: number,
  fileName?: string,
): Promise<void> => {
  const res = await api.get(`/api/warehouse-stock/declarations/${beyannameId}/document`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || `beyanname_${beyannameId}.pdf`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}
