import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(263 70% 10%) 0%, hsl(222 47% 6%) 70%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, hsl(263 70% 62%), hsl(263 60% 48%))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">RAG Assistant</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 55%)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium mb-1.5"
                style={{ color: 'hsl(215 20% 70%)' }}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="auth-input text-sm"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium mb-1.5"
                style={{ color: 'hsl(215 20% 70%)' }}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                className="auth-input text-sm"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="rounded-lg p-3 text-sm"
                style={{ background: 'hsl(0 72% 51% / 0.1)', border: '1px solid hsl(0 72% 51% / 0.3)', color: 'hsl(0 72% 75%)' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg p-3 text-sm"
                style={{ background: 'hsl(142 70% 45% / 0.1)', border: '1px solid hsl(142 70% 45% / 0.3)', color: 'hsl(142 70% 65%)' }}>
                {success}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 mt-2"
              style={{
                background: loading
                  ? 'hsl(263 40% 40%)'
                  : 'linear-gradient(135deg, hsl(263 70% 62%), hsl(263 60% 52%))',
                boxShadow: loading ? 'none' : '0 4px 20px hsl(263 70% 62% / 0.3)',
              }}>
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm" style={{ color: 'hsl(215 20% 55%)' }}>
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <button id="switch-to-signup" onClick={() => { setMode('signup'); setError(null) }}
                  className="font-medium transition-colors" style={{ color: 'hsl(263 70% 72%)' }}>
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button id="switch-to-signin" onClick={() => { setMode('signin'); setError(null) }}
                  className="font-medium transition-colors" style={{ color: 'hsl(263 70% 72%)' }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
