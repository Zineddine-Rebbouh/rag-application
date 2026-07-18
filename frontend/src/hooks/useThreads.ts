import { useState, useCallback } from 'react'
import { listThreads, createThread, deleteThread } from '../lib/api'
import type { Thread } from '../types'

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listThreads()
      setThreads(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(async (): Promise<Thread | null> => {
    try {
      const thread = await createThread()
      setThreads(prev => [thread, ...prev])
      return thread
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const remove = useCallback(async (threadId: string) => {
    try {
      await deleteThread(threadId)
      setThreads(prev => prev.filter(t => t.id !== threadId))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  // Update a thread's title in the local list (called after first message)
  const updateTitle = useCallback((threadId: string, title: string) => {
    setThreads(prev =>
      prev.map(t => t.id === threadId ? { ...t, title } : t)
    )
  }, [])

  return { threads, loading, error, load, create, remove, updateTitle }
}
