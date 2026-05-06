import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useEntries } from '@/hooks/useEntries'
import { useAuth } from '@/hooks/useAuth'
import { starsDisplay, initials } from '@/lib/helpers'

export function SessionPage() {
  const { user } = useAuth()
  const { activeSession, participants, createSession, joinSession, endSession, leaveSession } = useSession()
  const { entries } = useEntries()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const sessionEntries = activeSession
    ? entries.filter(e => e.session_id === activeSession.id)
    : []

  async function handleCreate() {
    setLoading(true); setError('')
    const { error } = await createSession()
    if (error) setError(error)
    setLoading(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading(true); setError('')
    const { error } = await joinSession(joinCode)
    if (error) setError(error)
    setLoading(false)
  }

  if (!activeSession) {
    return (
      <div className="screen">
        <p style={{ fontSize: 13, color: 'var(--fg2)', marginBottom: 16 }}>
          Group sessions let your whole table log ratings together. Create a session and share the code, or join one someone else started.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div className="card" style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 12px' }} onClick={handleCreate}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>Create Session</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 4 }}>Host for your table</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔑</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)', marginBottom: 10 }}>Join Session</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              <input className="inp" placeholder="Code…" style={{ width: 100, padding: '6px 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 14 }}
                value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()} />
              <button className="btn btn-primary btn-sm" onClick={handleJoin} disabled={loading}>Join</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="session-banner">
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 3, color: '#fff' }}>Active session</div>
          <div className="session-code">{activeSession.code}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, color: '#fff' }}>
            Share this code with your table
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: 10, border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ width: 60, height: 60, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
              <div style={{ width: 44, height: 44, background: 'repeating-conic-gradient(#071a07 0% 25%, #fff 25% 50%) 0 0/10px 10px', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Scan to join</div>
          </div>
        </div>
      </div>

      <div className="section-label">Participants ({participants.length})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {participants.map(p => (
          <span key={p.id} className="chip on" style={{ cursor: 'default' }}>
            <span className="chip-avatar">{initials(p.user?.display_name ?? '?')}</span>
            {p.user?.display_name ?? 'Unknown'}
            {p.user_id === activeSession.created_by && <span style={{ fontSize: 10, opacity: 0.7 }}> (host)</span>}
          </span>
        ))}
      </div>

      <div className="section-label">Items logged this session ({sessionEntries.length})</div>
      {sessionEntries.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--fg3)', padding: '8px 0' }}>
          No items yet — tap "+ Meal" to start logging.
        </div>
      ) : (
        sessionEntries.map(e => (
          <div className="log-row" key={e.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{e.item_name}</div>
              {e.rating_overall && <div className="star-disp">{starsDisplay(e.rating_overall)}</div>}
            </div>
            {e.notes && <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 3 }}>"{e.notes}"</div>}
          </div>
        ))
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {activeSession.created_by === user?.id ? (
          <button className="btn btn-danger" onClick={endSession}>End Session</button>
        ) : (
          <button className="btn btn-outline" onClick={leaveSession}>Leave Session</button>
        )}
      </div>
    </div>
  )
}
