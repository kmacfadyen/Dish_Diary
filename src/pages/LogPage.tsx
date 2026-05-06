import { useState, useMemo } from 'react'
import { useEntries } from '@/hooks/useEntries'
import { useAuth } from '@/hooks/useAuth'
import { starsDisplay, avgRating } from '@/lib/helpers'
import { format } from 'date-fns'
import type { DiaryEntry, Restaurant, DishStats } from '@/types'

interface Props {
  onLogAgain: (restaurant: Restaurant) => void
}

export function LogPage({ onLogAgain }: Props) {
  const { entries, restaurants, loading } = useEntries()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [modalRId, setModalRId] = useState<string | null>(null)
  const [dishStats, setDishStats] = useState<DishStats[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const { getDishStats } = useEntries()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      e.restaurant?.name.toLowerCase().includes(q) ||
      e.item_name.toLowerCase().includes(q)
    )
  }, [entries, search])

  // Group by restaurant
  const grouped = useMemo(() => {
    const map = new Map<string, { restaurant: Restaurant; entries: DiaryEntry[] }>()
    filtered.forEach(e => {
      if (!e.restaurant) return
      if (!map.has(e.restaurant_id)) map.set(e.restaurant_id, { restaurant: e.restaurant, entries: [] })
      map.get(e.restaurant_id)!.entries.push(e)
    })
    return Array.from(map.values())
  }, [filtered])

  // Group entries by dish name for display
  function groupByDish(entries: DiaryEntry[]) {
    const map = new Map<string, DiaryEntry[]>()
    entries.forEach(e => {
      const k = e.item_name.toLowerCase().trim()
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    })
    return Array.from(map.entries()).map(([, es]) => ({
      name: es[0].item_name,
      category: es[0].item_category,
      count: es.length,
      avgRat: avgRating(es.map(e => e.rating_overall)),
      entries: es.sort((a, b) => b.visit_date.localeCompare(a.visit_date)),
    })).sort((a, b) => b.avgRat - a.avgRat)
  }

  async function openRestaurantModal(rId: string) {
    setModalRId(rId)
    setStatsLoading(true)
    const stats = await getDishStats(rId)
    setDishStats(stats)
    setStatsLoading(false)
  }

  const modalRestaurant = modalRId ? restaurants.find(r => r.id === modalRId) : null
  const modalEntries = modalRId ? entries.filter(e => e.restaurant_id === modalRId) : []

  if (loading) return <div className="screen"><div className="empty"><div className="empty-icon">⏳</div><div className="empty-sub">Loading your diary…</div></div></div>

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div className="section-label" style={{ margin: 0 }}>Your diary</div>
        <input className="inp" style={{ width: 200, padding: '7px 10px' }} placeholder="Search restaurant or dish…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {grouped.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🍽️</div>
          <div className="empty-title">{search ? 'No results' : 'No entries yet'}</div>
          <div className="empty-sub">{search ? 'Try a different search' : 'Tap "+ Meal" to log your first dish'}</div>
        </div>
      )}

      {grouped.map(({ restaurant, entries: rEntries }) => {
        const dishes = groupByDish(rEntries)
        const ar = avgRating(rEntries.map(e => e.rating_overall))
        return (
          <div className="card" key={restaurant.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <button className="r-link" onClick={() => openRestaurantModal(restaurant.id)}>
                  {restaurant.name}
                </button>
                <div style={{ fontSize: 12, color: 'var(--fg3)', marginTop: 2 }}>
                  {restaurant.address} {restaurant.cuisine && `· ${restaurant.cuisine}`}
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className="avg-badge">★ {ar.toFixed(1)}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg3)', marginLeft: 6 }}>{rEntries.length} log{rEntries.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => onLogAgain(restaurant)}>+ Log visit</button>
            </div>
            <hr className="divider" />
            {dishes.slice(0, 3).map(d => (
              <div className="log-row" key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {d.name}
                    {d.count > 1 && <span className="repeat-badge">↺ {d.count}x</span>}
                  </div>
                  <div className="star-disp">{starsDisplay(d.avgRat)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 3 }}>
                  {d.count > 1
                    ? `avg of ${d.count} visits`
                    : format(new Date(d.entries[0].visit_date), 'MMM d, yyyy')}
                </div>
                {d.entries[0].notes && (
                  <div style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 4 }}>
                    "{d.entries[0].notes}"
                  </div>
                )}
              </div>
            ))}
            {dishes.length > 3 && (
              <div style={{ fontSize: 12, color: 'var(--fg3)', paddingTop: 4, paddingLeft: 12 }}>
                +{dishes.length - 3} more —{' '}
                <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 700 }} onClick={() => openRestaurantModal(restaurant.id)}>
                  view all
                </span>
              </div>
            )}
          </div>
        )
      })}

      {/* Restaurant detail modal */}
      {modalRId && modalRestaurant && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalRId(null) }}>
          <div className="modal">
            <button className="modal-x" onClick={() => setModalRId(null)}>✕</button>
            <div className="modal-title">{modalRestaurant.name}</div>
            <div className="modal-sub">{modalRestaurant.address} · {modalRestaurant.cuisine}</div>
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
            <div className="section-label">Dishes — averaged & combined</div>
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg3)' }}>Loading…</div>
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
                  {stat.all_notes && stat.all_notes.filter(Boolean).map((note, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 4 }}>"{note}"</div>
                  ))}
                  {stat.avg_flavor && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {[['Flavor', stat.avg_flavor], ['Temp', stat.avg_temperature], ['Texture', stat.avg_texture], ['Presentation', stat.avg_presentation], ['Value', stat.avg_value]].filter(([, v]) => v).map(([k, v]) => (
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
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setModalRId(null); onLogAgain(modalRestaurant) }}>
                + Log a new visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
