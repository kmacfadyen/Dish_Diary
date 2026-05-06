import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/Logo'

export function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      if (!displayName.trim()) { setError('Please enter your name.'); setLoading(false); return }
      const { error } = await signUp(email, password, displayName)
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account, then log in!')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo size={52} color="#0e3d0e" />
          <h1>Dish Diary</h1>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--fg3)', fontSize: 13, marginBottom: 24 }}>
          {mode === 'login' ? 'Welcome back — sign in to your diary' : 'Create your account to start tracking meals'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && (
          <div style={{ background: '#e8f5e8', color: '#0e3d0e', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Your name</label>
              <input className="inp" type="text" placeholder="e.g. Jamie" value={displayName}
                onChange={e => setDisplayName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="inp" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="inp" type="password" placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: 8, padding: 13, fontSize: 15, width: '100%' }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  )
}
