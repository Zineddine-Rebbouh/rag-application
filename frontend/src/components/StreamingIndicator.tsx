export function StreamingIndicator() {
  return (
    <div className="flex items-end gap-3 px-4 py-2">
      {/* Assistant avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, hsl(263 70% 40%), hsl(263 50% 30%))' }}>
        AI
      </div>
      <div className="bubble-assistant px-4 py-3 flex items-center gap-1.5" style={{ minHeight: '42px' }}>
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}
