import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useThreads } from './hooks/useThreads'
import { useChat } from './hooks/useChat'
import { AuthPage } from './components/AuthPage'
import { ThreadSidebar } from './components/ThreadSidebar'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'
import type { Thread } from './types'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { threads, loading: threadsLoading, load: loadThreads, create: createThread, remove: removeThread, updateTitle } = useThreads()
  const { messages, streaming, streamingContent, error: chatError, loadThread, clearMessages, sendMessage } = useChat()
  const [activeThread, setActiveThread] = useState<Thread | null>(null)

  // Load threads when user signs in
  useEffect(() => {
    if (user) loadThreads()
    else {
      setActiveThread(null)
      clearMessages()
    }
  }, [user])

  const handleSelectThread = async (thread: Thread) => {
    setActiveThread(thread)
    await loadThread(thread)
  }

  const handleNewChat = async () => {
    const thread = await createThread()
    if (thread) {
      setActiveThread(thread)
      clearMessages()
    }
  }

  const handleDeleteThread = async (threadId: string) => {
    await removeThread(threadId)
    if (activeThread?.id === threadId) {
      setActiveThread(null)
      clearMessages()
    }
  }

  const handleSend = async (content: string) => {
    if (!activeThread) {
      // Auto-create a thread if none selected
      const thread = await createThread()
      if (!thread) return
      setActiveThread(thread)
      await sendMessage(thread.id, content, (title) => {
        updateTitle(thread.id, title)
        setActiveThread(prev => prev ? { ...prev, title } : prev)
      })
    } else {
      await sendMessage(activeThread.id, content, (title) => {
        updateTitle(activeThread.id, title)
        setActiveThread(prev => prev ? { ...prev, title } : prev)
      })
    }
  }

  // ── Loading splash ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex gap-1.5">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    )
  }

  // ── Unauthenticated ─────────────────────────────────────────────────────────
  if (!user) {
    return <AuthPage />
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      {/* Sidebar */}
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThread?.id ?? null}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        onSignOut={signOut}
        userEmail={user.email ?? ''}
        loading={threadsLoading}
      />

      {/* Main chat panel */}
      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Chat header */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h1 className="text-sm font-medium truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {activeThread ? activeThread.title : 'New conversation'}
          </h1>
        </div>

        {/* Messages */}
        {!activeThread ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'hsl(263 70% 62% / 0.1)', border: '1px solid hsl(263 70% 62% / 0.2)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(263 70% 72%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
            <p className="text-sm max-w-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Select a thread from the sidebar or type below to begin a new conversation.
            </p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            streaming={streaming}
            streamingContent={streamingContent}
          />
        )}

        {/* Error banner */}
        {chatError && (
          <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'hsl(0 72% 51% / 0.1)', border: '1px solid hsl(0 72% 51% / 0.3)', color: 'hsl(0 72% 75%)' }}>
            Error: {chatError}
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={streaming} />
      </main>
    </div>
  )
}
