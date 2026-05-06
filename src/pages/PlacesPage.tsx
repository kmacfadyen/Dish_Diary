import { useState } from 'react'
import { useEntries } from '@/hooks/useEntries'
import { avgRating } from '@/lib/helpers'
import { StarDisplay } from '@/components/StarRating'
import { format } from 'date-fns'
import type { Restaurant } from '@/types'
import { supabase } from '@/lib/supabase'

interface Props {
  onLogAgain: (restaurant: Restaurant) => void
}

export function PlacesPage({ onLogAgain }: Props) {
  const { restaurants, entries, deleteEntry } = useEntries()
  const [modalR, setModalR] = useState<Restaurant | null>(null)

  const modalEntries = modalR ? entries.filter(e => e.restaurant_id === modalR.id) : []

  function groupByDish(es: typeof entries) {
    const map = new Map<string, typeof entries>()
    es.forEach(e => {
      const k = e.item_name.toLowerCase().trim()
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    })
    return Array.from(map.values())
      .map(group => ({
        name: group[0].item_name,
        count: group.length,
        avgRat: avgRating(group.map(e => e.rating_overall)),
        entries: group.sort((a, b) => b.visit_date.localeCompare(a.visit_date)),
      }))
      .sort((a, b) => b.avgRat - a.avgRat)
  }

  async function handleDelete(entryId: string) {
    if (!window.confirm('Delete this log entry?')) return
    await deleteEntry(entryId)
    const remaining = entries.filter(e => e.id !== entryId && e.restaurant_id === modalR?.id)
    if (remaining.length === 0) setModalR(null)
  }

  if (restaurants.length === 0) {
    return (
      <div className="screen">
        <div className="empty">
          <div className="empty-icon">🍽️</div>
          <div className="empty-title">No restaurants yet</div>
          <div className="empty-sub">Log a meal to see your visited places here</div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="section-label">All visited restaurants ({restaurants.length})</div>
      {restaurants.map(r => {
        const rEntries = entries.filter(e => e.restaurant_id === r.id)
        const ar = avgRating(rEntries.map(e => e.rating_overall))
        const visits = new Set(rEntries.map(e => e.visit_date)).size
        return (
          <div className="card" key={r.id} style={{ cursor: 'pointer' }} onClick={() => setModalR(r)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{r.address} {r.cuisine && `· ${r.cuisine}`}</div>
              </div>
              {ar > 0 && <span className="avg-badge">★ {ar.toFixed(1)}</span>}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>
              {rEntries.length} log{rEntries.length !== 1 ? 's' : ''} · {visits} visit{visits !== 1 ? 's' : ''}
            </div>
          </div>
        )
      })}

      {/* Modal */}
      {modalR && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalR(null) }}>
          <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <button className="modal-x" onClick={() => setModalR(null)}>✕</button>
            <div className="modal-title">{modalR.name}</div>
            <div className="modal-sub">{modalR.address} {modalR.cuisine && `· ${modalR.cuisine}`}</div>

            {/* Stats */}
            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-num">★ {avgRating(modalEntries.map(e => e.rating_overall)).toFixed(1)}</div>
                <div className="stat-lbl">avg rating</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">{modalEntries.length}</div>
                <div className="stat-lbl">total logs</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">{new Set(modalEntries.map(e => e.visit_date)).size}</div>
                <div className="stat-lbl">visits</div>
              </div>
            </div>

            {/* Dishes with delete buttons */}
            <div className="section-label">Dishes</div>
            {groupByDish(modalEntries).map(d => (
              <div className="dish-history" key={d.name}>
                <div className="dish-history-header">
                  <div>
                    <span className="dish-history-name">{d.name}</span>
                    {d.count > 1 && <span className="repeat-badge">↺ {d.count}x</span>}
                  </div>
                  <StarDisplay value={d.avgRat} size={14} />
                </div>
                {d.count > 1 && (
                  <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 6, fontWeight: 600 }}>
                    avg {d.avgRat.toFixed(1)} across {d.count} visits
                  </div>
                )}
                {d.entries.map(e => (
                  <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--fg3)', fontWeight: 600 }}>
                        {format(new Date(e.visit_date), 'MMM d, yyyy')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {e.rating_overall && <StarDisplay value={e.rating_overall} size={12} />}
                        <button
                          onClick={() => handleDelete(e.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1, opacity: 0.6 }}
                          title="Delete this entry">
                          🗑
                        </button>
                      </div>
                    </div>
                    {e.notes && (
                      <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 3 }}>"{e.notes}"</div>
                    )}
                    {e.rating_flavor && (
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {[['Flavor', e.rating_flavor], ['Temp', e.rating_temperature], ['Texture', e.rating_texture], ['Pres.', e.rating_presentation], ['Value', e.rating_value]]
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <span key={k as string} style={{ fontSize: 11, background: 'var(--bg2)', color: 'var(--fg2)', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>
                              {k}: {v}/5
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setModalR(null); onLogAgain(modalR) }}>
                + Log a new visit
              </button>
              <button className="btn btn-outline" onClick={async () => {
                const { data } = await supabase.from('restaurants').select('share_token').eq('id', modalR.id).single()
                if (data?.share_token) {
                  const url = `${window.location.origin}/share/${data.share_token}`
                  if (navigator.share) navigator.share({ title: modalR.name + ' on Dish Diary', url })
                  else { navigator.clipboard.writeText(url); alert('Share link copied!') }
                }
              }}>
                🔗 Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
