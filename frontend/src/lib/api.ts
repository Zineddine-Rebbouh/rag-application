import { supabase } from './supabase'
import type { Thread, ThreadWithMessages } from '../types'

const API_BASE = '/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ── Threads ───────────────────────────────────────────────────────────────────

export async function listThreads(): Promise<Thread[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/threads`, { headers })
  if (!res.ok) throw new Error(`Failed to list threads: ${res.statusText}`)
  return res.json()
}

export async function createThread(title?: string): Promise<Thread> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/threads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`Failed to create thread: ${res.statusText}`)
  return res.json()
}

export async function getThread(threadId: string): Promise<ThreadWithMessages> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/threads/${threadId}`, { headers })
  if (!res.ok) throw new Error(`Failed to get thread: ${res.statusText}`)
  return res.json()
}

export async function deleteThread(threadId: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/threads/${threadId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`Failed to delete thread: ${res.statusText}`)
}

// ── Chat streaming ────────────────────────────────────────────────────────────

export type StreamEvent =
  | { type: 'token'; content: string }
  | { type: 'done'; usage: { prompt_tokens: number; completion_tokens: number } }
  | { type: 'error'; message: string }

/**
 * Opens an SSE connection to POST /chat/stream and calls the callbacks
 * as events arrive. Returns a cleanup function to abort the stream.
 *
 * Note: EventSource only supports GET; we use fetch + ReadableStream instead
 * to support POST with a body.
 */
export async function streamChat(
  threadId: string,
  content: string,
  onToken: (token: string) => void,
  onDone: (usage: { prompt_tokens: number; completion_tokens: number }) => void,
  onError: (message: string) => void,
): Promise<void> {
  const headers = await getAuthHeaders()
  const controller = new AbortController()

  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ thread_id: threadId, content }),
      signal: controller.signal,
    })

    if (!res.ok) {
      onError(`Server error: ${res.statusText}`)
      return
    }

    if (!res.body) {
      onError('No response body from server')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const event = JSON.parse(raw) as StreamEvent
            if (event.type === 'token') onToken(event.content)
            else if (event.type === 'done') onDone(event.usage)
            else if (event.type === 'error') onError(event.message)
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      onError((err as Error).message)
    }
  }
}
