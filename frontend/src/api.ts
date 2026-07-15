const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api'
const REQUEST_TIMEOUT = parseInt((import.meta as any).env?.VITE_API_TIMEOUT || '30000', 10)

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

export interface CreatePasteBody {
  mode: 'password' | 'symmetric' | 'asymmetric'
  salt?: string
  encrypted_payload: string
  hint?: string
  expires_in?: number
  max_views?: number
  burn_after_read?: number
  custom_id?: string
  pubkey_fingerprint?: string
}

export interface CreatePasteResponse {
  id: string
  delete_token: string
  expires_at: number | null
  storage: string
}

export interface PasteResponse {
  encrypted_payload: string
  expires_at: number | null
  view_count: number
  max_views: number
  burn_after_read: number
  created_at: number
  storage: string
}

export async function createPaste(body: CreatePasteBody): Promise<CreatePasteResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/paste`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to create paste')
  }

  return res.json()
}

export async function getPaste(id: string): Promise<PasteResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/paste/${id}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to get paste')
  }

  return res.json()
}

export async function recordView(id: string): Promise<{
  success: boolean
  view_count: number
  burn_after_read: number
  max_views: number
}> {
  const res = await fetchWithTimeout(`${API_BASE}/paste/${id}/view`, { method: 'POST' })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to record view')
  }

  return res.json()
}

export async function deletePaste(id: string, deleteToken: string): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/paste/${id}`, {
    method: 'DELETE',
    headers: { 'X-Delete-Token': deleteToken },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to delete paste')
  }

  return res.json()
}
