import { useState, useMemo } from 'react'
import { useEntries } from '@/hooks/useEntries'
import { useAuth } from '@/hooks/useAuth'
import { avgRating } from '@/lib/helpers'
import { StarDisplay, StarRating } from '@/components/StarRating'
import { format } from 'date-fns'
import type { DiaryEntry, Restaurant, DishStats } from '@/types'

interface Props {
  onLogAgain: (restaurant: Restaurant) => void
}

export function LogPage({ onLogAgain }: Props) {
  const { entries, restaurants, loading, deleteEntry, getDishStats } = useEntries()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [modalRId, setModalRId] = useState<string | null>(null)
  const [dishStats, setDishStats] = useState<DishStats[]>([])
  const [statsLoading, setStatsLoading] = useState(false)


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

  async function handleDeleteEntry(entryId: string) {
    if (!confirm('Delete this log entry?')) return
    await deleteEntry(entryId)
    if (modalRId) {
      const updated = await getDishStats(modalRId)
      setDishStats(updated)
    }
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

  // Top 4 restaurants by average rating
  const topRestaurants = useMemo(() => {
    return restaurants
      .map(r => {
        const es = entries.filter(e => e.restaurant_id === r.id)
        const ar = avgRating(es.map(e => e.rating_overall))
        const visits = new Set(es.map(e => e.visit_date)).size
        const topDish = (() => {
          const byDish = new Map<string, number[]>()
          es.forEach(e => {
            if (!byDish.has(e.item_name)) byDish.set(e.item_name, [])
            if (e.rating_overall) byDish.get(e.item_name)!.push(e.rating_overall)
          })
          let best = { name: '', avg: 0 }
          byDish.forEach((ratings, name) => {
            const a = avgRating(ratings)
            if (a > best.avg) best = { name, avg: a }
          })
          return best.name || null
        })()
        return { restaurant: r, avgRating: ar, visits, topDish, entryCount: es.length }
      })
      .filter(r => r.entryCount > 0)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 4)
  }, [restaurants, entries])

  if (loading) return <div className="screen"><div className="empty"><div className="empty-icon">⏳</div><div className="empty-sub">Loading your diary…</div></div></div>

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div className="section-label" style={{ margin: 0 }}>Your diary</div>
        <input className="inp" style={{ width: 200, padding: '7px 10px' }} placeholder="Search restaurant or dish…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Top rated showcase */}
      {topRestaurants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div className="section-label" style={{ margin: 0 }}>⭐ Your top rated</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', fontWeight: 600 }}>all-time averages</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {topRestaurants.map(({ restaurant, avgRating: ar, visits, topDish }) => (
              <div key={restaurant.id}
                style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '12px 14px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onClick={() => openRestaurantModal(restaurant.id)}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `hsl(${Math.round(ar * 24)}, 60%, 35%)` }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', marginBottom: 4, lineHeight: 1.2 }}>{restaurant.name}</div>
                <StarDisplay value={ar} size={14} />
                <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 4, fontWeight: 600 }}>{ar.toFixed(1)} avg · {visits} visit{visits !== 1 ? 's' : ''}</div>
                {topDish && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>✦ {topDish}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <div className="star-disp"><StarDisplay value={d.avgRat} /></div>
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
            <div className="section-label">Dishes</div>
            {(() => {
              // Group modalEntries by dish name
              const byDish = new Map<string, typeof modalEntries>()
              modalEntries.forEach(e => {
                const k = e.item_name.toLowerCase()
                if (!byDish.has(k)) byDish.set(k, [])
                byDish.get(k)!.push(e)
              })
              return Array.from(byDish.values())
                .sort((a, b) => avgRating(b.map(e => e.rating_overall)) - avgRating(a.map(e => e.rating_overall)))
                .map(dishEntries => {
                  const name = dishEntries[0].item_name
                  const ar = avgRating(dishEntries.map(e => e.rating_overall))
                  return (
                    <div className="dish-history" key={name}>
                      <div className="dish-history-header">
                        <div>
                          <span className="dish-history-name">{name}</span>
                          {dishEntries.length > 1 && <span className="repeat-badge">↺ {dishEntries.length}x</span>}
                        </div>
                        <div><StarDisplay value={ar} size={14} /></div>
                      </div>
                      {dishEntries.length > 1 && (
                        <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 6, fontWeight: 600 }}>
                          avg {ar.toFixed(1)} across {dishEntries.length} visits
                        </div>
                      )}
                      {dishEntries.map(e => (
                        <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--fg3)', fontWeight: 600 }}>
                              {format(new Date(e.visit_date), 'MMM d, yyyy')}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {e.rating_overall && <StarDisplay value={e.rating_overall} size={12} />}
                              <button
                                onClick={() => handleDeleteEntry(e.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg3)', fontSize: 15, padding: 0, lineHeight: 1, opacity: 0.7 }}
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
                  )
                })
            })()}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setModalRId(null); onLogAgain(modalRestaurant) }}>
                + Log a new visit
              </button>
              <button className="btn btn-outline" onClick={async () => {
                const { supabase } = await import('@/lib/supabase')
                const { data } = await supabase.from('restaurants').select('share_token').eq('id', modalRId).single()
                if (data?.share_token) {
                  const url = `${window.location.origin}/share/${data.share_token}`
                  if (navigator.share) {
                    navigator.share({ title: modalRestaurant.name + ' on Dish Diary', url })
                  } else {
                    navigator.clipboard.writeText(url)
                    alert('Share link copied to clipboard!')
                  }
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

