import { useState } from 'react'
import { useEntries } from '@/hooks/useEntries'
import { avgRating, starsDisplay } from '@/lib/helpers'
import { format } from 'date-fns'
import type { Restaurant, DishStats } from '@/types'

interface Props {
  onLogAgain: (restaurant: Restaurant) => void
}

export function PlacesPage({ onLogAgain }: Props) {
  const { restaurants, entries, getDishStats } = useEntries()
  const [modalR, setModalR] = useState<Restaurant | null>(null)
  const [dishStats, setDishStats] = useState<DishStats[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  async function openModal(r: Restaurant) {
    setModalR(r)
    setStatsLoading(true)
    const stats = await getDishStats(r.id)
    setDishStats(stats)
    setStatsLoading(false)
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
          <div className="card" key={r.id} style={{ cursor: 'pointer' }} onClick={() => openModal(r)}>
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

      {modalR && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalR(null) }}>
          <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <button className="modal-x" onClick={() => setModalR(null)}>✕</button>
            <div className="modal-title">{modalR.name}</div>
            <div className="modal-sub">{modalR.address} {modalR.cuisine && `· ${modalR.cuisine}`}</div>

            {(() => {
              const rEntries = entries.filter(e => e.restaurant_id === modalR.id)
              const ar = avgRating(rEntries.map(e => e.rating_overall))
              const visits = new Set(rEntries.map(e => e.visit_date)).size
              return (
                <div className="stat-grid">
                  <div className="stat-box"><div className="stat-num">★ {ar.toFixed(1)}</div><div className="stat-lbl">avg rating</div></div>
                  <div className="stat-box"><div className="stat-num">{rEntries.length}</div><div className="stat-lbl">total logs</div></div>
                  <div className="stat-box"><div className="stat-num">{visits}</div><div className="stat-lbl">visits</div></div>
                </div>
              )
            })()}

            <div className="section-label">Dishes — averaged & combined</div>
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg3)' }}>Loading…</div>
            ) : dishStats.length === 0 ? (
              <div style={{ color: 'var(--fg3)', fontSize: 13 }}>No dishes logged yet.</div>
            ) : (
              dishStats.map(stat => (
                <div className="dish-history" key={stat.item_name}>
                  <div className="dish-history-header">
                    <div>
                      <span className="dish-history-name">{stat.item_name}</span>
                      {stat.visit_count > 1 && <span className="repeat-badge">↺ {stat.visit_count}x</span>}
                    </div>
                    <div className="star-disp">{starsDisplay(stat.avg_rating)}</div>
                  </div>
                  {stat.visit_count > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 6, fontWeight: 600 }}>
                      avg {stat.avg_rating} across {stat.visit_count} visits
                    </div>
                  )}
                  {stat.all_notes?.filter(Boolean).map((note, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 4 }}>"{note}"</div>
                  ))}
                  {(stat.avg_flavor || stat.avg_temperature || stat.avg_texture) && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {[['Flavor', stat.avg_flavor], ['Temp', stat.avg_temperature], ['Texture', stat.avg_texture], ['Pres.', stat.avg_presentation], ['Value', stat.avg_value]]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <span key={k as string} style={{ fontSize: 11, background: 'var(--bg2)', color: 'var(--fg2)', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>
                            {k}: {(v as number).toFixed(1)}/5
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setModalR(null); onLogAgain(modalR) }}>
                + Log a new visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
