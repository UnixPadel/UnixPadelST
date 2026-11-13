import api from '@/lib/axios'
import type {
  ApiResponse,
  GeminiKeyStatusDto,
  GeminiTestResultDto,
  SaveGeminiKeyRequest,
  TestGeminiKeyRequest,
  ClaudeKeyStatusDto,
  ClaudeTestResultDto,
  SaveClaudeKeyRequest,
  TestClaudeKeyRequest,
  AiSettingsOverviewDto,
} from '@/types'

// ── Ortak AI Ayarları ────────────────────────────────────────────────────────

export const getAiOverview = async (): Promise<AiSettingsOverviewDto> => {
  const res = await api.get<ApiResponse<AiSettingsOverviewDto>>('/api/settings/ai')
  return res.data.data
}

export const setActiveAiProvider = async (saglayici: 'Claude' | 'Gemini'): Promise<void> => {
  await api.put<ApiResponse<object>>('/api/settings/ai/active-provider', { saglayici })
}

// ── Claude (Anthropic) ───────────────────────────────────────────────────────

export const getClaudeStatus = async (): Promise<ClaudeKeyStatusDto> => {
  const res = await api.get<ApiResponse<ClaudeKeyStatusDto>>('/api/settings/claude')
  return res.data.data
}

export const saveClaudeKey = async (apiKey: string, model?: string | null): Promise<void> => {
  const req: SaveClaudeKeyRequest = { apiKey, model: model || null }
  await api.put<ApiResponse<object>>('/api/settings/claude', req)
}

export const testClaudeKey = async (apiKey?: string, model?: string): Promise<ClaudeTestResultDto> => {
  const req: TestClaudeKeyRequest = { apiKey: apiKey || undefined, model: model || undefined }
  const res = await api.post<ApiResponse<ClaudeTestResultDto>>('/api/settings/claude/test', req)
  return res.data.data
}

// ── Gemini (Google) ──────────────────────────────────────────────────────────

export const getGeminiStatus = async (): Promise<GeminiKeyStatusDto> => {
  const res = await api.get<ApiResponse<GeminiKeyStatusDto>>('/api/settings/gemini')
  return res.data.data
}

export const saveGeminiKey = async (apiKey: string): Promise<void> => {
  const req: SaveGeminiKeyRequest = { apiKey }
  await api.put<ApiResponse<object>>('/api/settings/gemini', req)
}

export const testGeminiKey = async (apiKey?: string): Promise<GeminiTestResultDto> => {
  const req: TestGeminiKeyRequest = { apiKey: apiKey || undefined }
  const res = await api.post<ApiResponse<GeminiTestResultDto>>('/api/settings/gemini/test', req)
  return res.data.data
}
