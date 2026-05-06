import { useState } from 'react'
import { useFriends } from '@/hooks/useFriends'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { avgRating, initials } from '@/lib/helpers'
import { StarDisplay } from '@/components/StarRating'
import { format } from 'date-fns'
import type { Profile, DiaryEntry, Restaurant } from '@/types'

export function FriendsPage() {
  const { user, profile } = useAuth()
  const { friends, pendingReceived, sendRequest, acceptRequest, declineRequest } = useFriends()
  const [addEmail, setAddEmail] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addError, setAddError] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null)
  const [friendData, setFriendData] = useState<{
    entries: DiaryEntry[]
    restaurants: Restaurant[]
  } | null>(null)
  const [loadingFriend, setLoadingFriend] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')

  async function openFriendProfile(friend: Profile) {
    setSelectedFriend(friend)
    setLoadingFriend(true)
    setFriendData(null)

    const { data: entries } = await supabase
      .from('diary_entries')
      .select('*, restaurant:restaurants(*)')
      .eq('user_id', friend.id)
      .order('created_at', { ascending: false })

    if (entries) {
      const restMap = new Map<string, Restaurant>()
      entries.forEach((e: DiaryEntry) => {
        if (e.restaurant) restMap.set(e.restaurant_id, e.restaurant as Restaurant)
      })
      setFriendData({
        entries: entries as DiaryEntry[],
        restaurants: Array.from(restMap.values()),
      })
    }
    setLoadingFriend(false)
  }

  async function handleAdd() {
    setAddMsg(''); setAddError('')
    const result = await sendRequest(addEmail)
    if (result.error) setAddError(result.error)
    else { setAddMsg(`Request sent to ${result.name}!`); setAddEmail('') }
  }

  // Build friend profile stats
  function getFriendStats() {
    if (!friendData) return null
    const { entries, restaurants } = friendData

    // Top 4 restaurants
    const topRestaurants = restaurants
      .map(r => {
        const es = entries.filter(e => e.restaurant_id === r.id)
        const ar = avgRating(es.map(e => e.rating_overall))
        const visits = new Set(es.map(e => e.visit_date)).size
        const byDish = new Map<string, number[]>()
        es.forEach(e => {
          if (!byDish.has(e.item_name)) byDish.set(e.item_name, [])
          if (e.rating_overall) byDish.get(e.item_name)!.push(e.rating_overall)
        })
        let topDish = ''; let topAvg = 0
        byDish.forEach((ratings, name) => {
          const a = avgRating(ratings)
          if (a > topAvg) { topDish = name; topAvg = a }
        })
        return { restaurant: r, avgRating: ar, visits, topDish, entryCount: es.length }
      })
      .filter(r => r.entryCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 4)

    // Recent entries
    const recent = entries.slice(0, 20)

    // Group by restaurant for search
    const grouped = new Map<string, { restaurant: Restaurant; entries: DiaryEntry[] }>()
    entries.forEach(e => {
      if (!e.restaurant) return
      if (!grouped.has(e.restaurant_id)) grouped.set(e.restaurant_id, { restaurant: e.restaurant as Restaurant, entries: [] })
      grouped.get(e.restaurant_id)!.entries.push(e)
    })

    return { topRestaurants, recent, grouped: Array.from(grouped.values()), totalLogs: entries.length }
  }

  const stats = getFriendStats()

  const filteredGrouped = stats?.grouped.filter(({ restaurant, entries: es }) => {
    if (!friendSearch) return true
    const q = friendSearch.toLowerCase()
    return restaurant.name.toLowerCase().includes(q) ||
      es.some(e => e.item_name.toLowerCase().includes(q))
  })

  return (
    <div className="screen">
      {/* Friend profile modal */}
      {selectedFriend && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedFriend(null) }}>
          <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-x" onClick={() => setSelectedFriend(null)}>✕</button>

            {/* Friend header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                {initials(selectedFriend.display_name)}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedFriend.display_name}</div>
                {stats && <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>{stats.totalLogs} dishes logged</div>}
              </div>
            </div>

            {loadingFriend && <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg3)' }}>Loading…</div>}

            {stats && (
              <>
                {/* Top rated */}
                {stats.topRestaurants.length > 0 && (
                  <>
                    <div className="section-label">⭐ Top rated restaurants</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      {stats.topRestaurants.map(({ restaurant, avgRating: ar, visits, topDish }) => (
                        <div key={restaurant.id} style={{ background: 'var(--bg)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `hsl(${Math.round(ar * 24)}, 60%, 35%)` }} />
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg)', marginBottom: 3, lineHeight: 1.2 }}>{restaurant.name}</div>
                          <StarDisplay value={ar} size={12} />
                          <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 3, fontWeight: 600 }}>{ar.toFixed(1)} · {visits} visit{visits !== 1 ? 's' : ''}</div>
                          {topDish && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>✦ {topDish}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Search their log */}
                <div className="section-label">Their diary</div>
                <input className="inp" style={{ marginBottom: 12, padding: '8px 12px' }}
                  placeholder={`Search ${selectedFriend.display_name}'s dishes or restaurants…`}
                  value={friendSearch} onChange={e => setFriendSearch(e.target.value)} />

                {filteredGrouped?.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--fg3)', padding: '8px 0' }}>No results</div>
                )}

                {filteredGrouped?.map(({ restaurant, entries: rEntries }) => {
                  // Group by dish
                  const byDish = new Map<string, DiaryEntry[]>()
                  rEntries.forEach(e => {
                    const k = e.item_name.toLowerCase()
                    if (!byDish.has(k)) byDish.set(k, [])
                    byDish.get(k)!.push(e)
                  })
                  const dishes = Array.from(byDish.values())
                    .map(es => ({ name: es[0].item_name, avgRat: avgRating(es.map(e => e.rating_overall)), count: es.length, latest: es[0] }))
                    .sort((a, b) => b.avgRat - a.avgRat)
                    .filter(d => !friendSearch || d.name.toLowerCase().includes(friendSearch.toLowerCase()) || restaurant.name.toLowerCase().includes(friendSearch.toLowerCase()))

                  if (dishes.length === 0) return null

                  return (
                    <div className="card" key={restaurant.id} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{restaurant.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 8 }}>{restaurant.address} {restaurant.cuisine && `· ${restaurant.cuisine}`}</div>
                      {dishes.map(d => (
                        <div className="log-row" key={d.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                              {d.name}
                              {d.count > 1 && <span className="repeat-badge">↺ {d.count}x</span>}
                            </div>
                            <StarDisplay value={d.avgRat} size={13} />
                          </div>
                          {d.latest.notes && (
                            <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 3 }}>"{d.latest.notes}"</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 3 }}>
                            {d.count > 1 ? `avg of ${d.count} visits` : format(new Date(d.latest.visit_date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Pending requests */}
      {pendingReceived.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-label">Pending requests ({pendingReceived.length})</div>
          {pendingReceived.map(req => (
            <div className="card" key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>
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
      <div className="section-label">Friends ({friends.length})</div>
      {friends.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--fg3)', padding: '8px 0 16px' }}>
          No friends added yet. Add someone below!
        </div>
      ) : (
        friends.map(f => (
          <div className="card" key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => openFriendProfile(f)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
                {initials(f.display_name)}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{f.display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg3)' }}>Tap to view their diary</div>
              </div>
            </div>
            <div style={{ color: 'var(--fg3)', fontSize: 18 }}>›</div>
          </div>
        ))
      )}

      {/* Add friend */}
      <div className="card" style={{ marginTop: 8 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Add a friend</div>
        <p style={{ fontSize: 13, color: 'var(--fg3)', marginBottom: 12 }}>
          They'll receive a request and must accept before their diary is visible to you.
        </p>
        {addError && <div className="auth-error">{addError}</div>}
        {addMsg && <div style={{ background: '#e8f5e8', color: '#0e3d0e', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{addMsg}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="inp" style={{ flex: 1 }} type="email" placeholder="friend@example.com"
            value={addEmail} onChange={e => setAddEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <button className="btn btn-primary" onClick={handleAdd}>Send</button>
        </div>
      </div>
    </div>
  )
}
