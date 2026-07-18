import { useState, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSend: (content: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  return (
    <div className="p-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
      <div className="max-w-3xl mx-auto">
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{
            background: 'hsl(var(--secondary))',
            border: '1px solid hsl(var(--border))',
            boxShadow: disabled ? 'none' : '0 0 0 1px transparent',
            transition: 'box-shadow 0.2s ease',
          }}
          onFocusCapture={e =>
            (e.currentTarget.style.boxShadow = '0 0 0 2px hsl(263 70% 62% / 0.3)')
          }
          onBlurCapture={e =>
            (e.currentTarget.style.boxShadow = 'none')
          }
        >
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Generating response…' : 'Ask anything… (Enter to send, Shift+Enter for newline)'}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none"
            style={{
              color: 'hsl(var(--foreground))',
              maxHeight: '160px',
              minHeight: '24px',
            }}
          />

          <button
            id="send-btn"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200 text-white"
            style={{
              background:
                disabled || !value.trim()
                  ? 'hsl(var(--muted))'
                  : 'linear-gradient(135deg, hsl(263 70% 62%), hsl(263 60% 52%))',
              boxShadow:
                disabled || !value.trim()
                  ? 'none'
                  : '0 2px 12px hsl(263 70% 62% / 0.3)',
              cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            }}
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>

        <p className="text-center text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          RAG Assistant can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
