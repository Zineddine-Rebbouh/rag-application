// Shared TypeScript types matching backend Pydantic models

export interface User {
  id: string
  email: string
}

export interface Thread {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  token_count: number | null
  created_at: string
}

export interface ThreadWithMessages {
  thread: Thread
  messages: ChatMessage[]
}
