import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { initials } from '@/lib/helpers'

export function ProfilePage() {
  const { profile, updateProfile, signOut } = useAuth()
  const { friends, pendingReceived, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriends()
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(profile?.display_name ?? '')
  const [addEmail, setAddEmail] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveName() {
    if (!newName.trim()) return
    setSaving(true)
    await updateProfile({ display_name: newName.trim() })
    setSaving(false)
    setEditName(false)
  }

  async function handleAdd() {
    setAddMsg(''); setAddError('')
    const result = await sendRequest(addEmail)
    if (result.error) setAddError(result.error)
    else { setAddMsg(`Request sent to ${result.name}!`); setAddEmail('') }
  }

  return (
    <div className="screen">
      {/* Profile */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
            {initials(profile?.display_name ?? '?')}
          </div>
          <div>
            {editName ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="inp" style={{ padding: '6px 10px', width: 160 }} value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()} autoFocus />
                <button className="btn btn-primary btn-sm" onClick={saveName} disabled={saving}>Save</button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditName(false)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{profile?.display_name}</div>
                <button className="btn btn-outline btn-sm" onClick={() => { setNewName(profile?.display_name ?? ''); setEditName(true) }}>Edit</button>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>{profile?.email}</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)' }} onClick={signOut}>Sign out</button>
      </div>

      {/* Pending requests */}
      {pendingReceived.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-label">Pending requests ({pendingReceived.length})</div>
          {pendingReceived.map(req => (
            <div className="card" key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
                  {initials(req.from_user?.display_name ?? '?')}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{req.from_user?.display_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{req.from_user?.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => acceptRequest(req.id)}>Accept</button>
                <button className="btn btn-outline btn-sm" onClick={() => declineRequest(req.id)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-label">Friends ({friends.length})</div>
        {friends.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg3)', padding: '8px 0' }}>
            No friends added yet. Add someone below to track meals together.
          </div>
        ) : (
          friends.map(f => (
            <div className="card" key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
                  {initials(f.display_name)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{f.display_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{f.email}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add friend */}
      <div className="card">
        <div className="section-label" style={{ marginBottom: 10 }}>Add a friend</div>
        <p style={{ fontSize: 13, color: 'var(--fg3)', marginBottom: 12 }}>
          They'll receive a request and must accept before their data is shared.
        </p>
        {addError && <div className="auth-error">{addError}</div>}
        {addMsg && <div style={{ background: '#e8f5e8', color: '#0e3d0e', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{addMsg}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" style={{ flex: 1 }} type="email" placeholder="friend@example.com"
            value={addEmail} onChange={e => setAddEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button className="btn btn-primary" onClick={handleAdd}>Send request</button>
        </div>
      </div>
    </div>
  )
}
