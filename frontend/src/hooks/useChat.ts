import { useState, useCallback } from 'react'
import { getThread, streamChat } from '../lib/api'
import type { ChatMessage, Thread } from '../types'

interface ChatState {
  messages: ChatMessage[]
  streaming: boolean
  streamingContent: string
  error: string | null
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    streaming: false,
    streamingContent: '',
    error: null,
  })

  const loadThread = useCallback(async (thread: Thread) => {
    setState(prev => ({ ...prev, streaming: false, streamingContent: '', error: null }))
    try {
      const data = await getThread(thread.id)
      setState(prev => ({ ...prev, messages: data.messages }))
    } catch (err) {
      setState(prev => ({ ...prev, error: (err as Error).message }))
    }
  }, [])

  const clearMessages = useCallback(() => {
    setState({ messages: [], streaming: false, streamingContent: '', error: null })
  }, [])

  const sendMessage = useCallback(async (
    threadId: string,
    content: string,
    onThreadTitleUpdate?: (title: string) => void,
  ) => {
    if (!content.trim()) return

    // Optimistically add the user message
    const optimisticUserMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      thread_id: threadId,
      user_id: '',
      role: 'user',
      content,
      token_count: null,
      created_at: new Date().toISOString(),
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, optimisticUserMsg],
      streaming: true,
      streamingContent: '',
      error: null,
    }))

    let assembled = ''
    const isFirstMessage = state.messages.length === 0

    await streamChat(
      threadId,
      content,
      // onToken
      (token) => {
        assembled += token
        setState(prev => ({ ...prev, streamingContent: assembled }))
      },
      // onDone
      (_usage) => {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          thread_id: threadId,
          user_id: '',
          role: 'assistant',
          content: assembled,
          token_count: _usage.completion_tokens,
          created_at: new Date().toISOString(),
        }
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
          streaming: false,
          streamingContent: '',
        }))

        // Auto-title update: first 60 chars of user message
        if (isFirstMessage && onThreadTitleUpdate) {
          const title = content.length <= 60 ? content : content.slice(0, 57) + '...'
          onThreadTitleUpdate(title)
        }
      },
      // onError
      (message) => {
        setState(prev => ({
          ...prev,
          streaming: false,
          streamingContent: '',
          error: message,
        }))
      },
    )
  }, [state.messages.length])

  return {
    messages: state.messages,
    streaming: state.streaming,
    streamingContent: state.streamingContent,
    error: state.error,
    loadThread,
    clearMessages,
    sendMessage,
  }
}
