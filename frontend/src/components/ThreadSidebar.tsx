import { Plus, Trash2, MessageSquare, LogOut, Bot } from 'lucide-react'
import type { Thread } from '../types'

interface Props {
  threads: Thread[]
  activeThreadId: string | null
  onSelectThread: (thread: Thread) => void
  onNewChat: () => void
  onDeleteThread: (threadId: string) => void
  onSignOut: () => void
  userEmail: string
  loading: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ThreadSidebar({
  threads, activeThreadId, onSelectThread, onNewChat,
  onDeleteThread, onSignOut, userEmail, loading
}: Props) {
  return (
    <aside className="flex flex-col h-full" style={{ width: 'var(--sidebar-width)', borderRight: '1px solid hsl(var(--border))' }}>
      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'linear-gradient(135deg, hsl(263 70% 62%), hsl(263 60% 48%))' }}>
            <Bot size={16} color="white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">RAG Assistant</span>
        </div>
        <button
          id="new-chat-btn"
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-white"
          style={{ background: 'linear-gradient(135deg, hsl(263 70% 62%), hsl(263 60% 52%))', boxShadow: '0 2px 12px hsl(263 70% 62% / 0.25)' }}>
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="text-center py-8 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Loading…
          </div>
        )}
        {!loading && threads.length === 0 && (
          <div className="text-center py-8 px-4">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>No conversations yet</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Click "New Chat" to start</p>
          </div>
        )}
        {threads.map(thread => (
          <div
            key={thread.id}
            id={`thread-${thread.id}`}
            className={`thread-item group flex items-start gap-2 px-3 py-2.5 rounded-xl mb-1 ${activeThreadId === thread.id ? 'active' : ''}`}
            onClick={() => onSelectThread(thread)}
          >
            <MessageSquare size={14} className="mt-0.5 shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-snug"
                style={{ color: 'hsl(var(--foreground))' }}>
                {thread.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {timeAgo(thread.updated_at)}
              </p>
            </div>
            <button
              id={`delete-thread-${thread.id}`}
              onClick={e => { e.stopPropagation(); onDeleteThread(thread.id) }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20 text-red-400 shrink-0"
              title="Delete thread"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Footer / user */}
      <div className="p-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(263 70% 62%), hsl(263 60% 52%))' }}>
            {userEmail[0]?.toUpperCase()}
          </div>
          <p className="text-xs truncate flex-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {userEmail}
          </p>
          <button
            id="sign-out-btn"
            onClick={onSignOut}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
