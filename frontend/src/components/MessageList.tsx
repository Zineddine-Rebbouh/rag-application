import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types'
import { StreamingIndicator } from './StreamingIndicator'
import { MessageSquare } from 'lucide-react'

interface Props {
  messages: ChatMessage[]
  streaming: boolean
  streamingContent: string
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-3 px-4 py-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, hsl(263 70% 40%), hsl(263 50% 30%))' }}>
          AI
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, hsl(215 50% 50%), hsl(215 40% 40%))' }}>
          U
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'bubble-user' : 'bubble-assistant'
        }`}
        style={{ wordBreak: 'break-word' }}
      >
        {message.content}
      </div>
    </div>
  )
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex items-end gap-3 px-4 py-1">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, hsl(263 70% 40%), hsl(263 50% 30%))' }}>
        AI
      </div>
      <div className="bubble-assistant max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ wordBreak: 'break-word' }}>
        <span className={content ? 'streaming-cursor' : ''}>{content}</span>
      </div>
    </div>
  )
}

export function MessageList({ messages, streaming, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  if (messages.length === 0 && !streaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'hsl(263 70% 62% / 0.1)', border: '1px solid hsl(263 70% 62% / 0.2)' }}>
          <MessageSquare size={28} style={{ color: 'hsl(263 70% 62%)' }} />
        </div>
        <h2 className="text-xl font-semibold mb-2">Ask anything</h2>
        <p className="text-sm max-w-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Ask about code, docs, architecture, or anything in the repository.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-1" id="message-list">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming state: show typing dots until first token, then stream bubble */}
      {streaming && streamingContent === '' && <StreamingIndicator />}
      {streaming && streamingContent !== '' && <StreamingBubble content={streamingContent} />}

      <div ref={bottomRef} />
    </div>
  )
}
