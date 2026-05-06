import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StarDisplay } from '@/components/StarRating'
import { Logo } from '@/components/Logo'

export function SharePage({ token }: { token: string }) {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [dishes, setDishes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('share_token', token)
        .single()

      if (!rest) { setNotFound(true); setLoading(false); return }
      setRestaurant(rest)

      const { data: stats } = await supabase
        .from('public_restaurant_view')
        .select('*')
        .eq('share_token', token)
        .order('avg_rating', { ascending: false })

      setDishes(stats ?? [])
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a3010' }}>
      <Logo size={60} color="#fff" />
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 36 }}>🍽️</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>Restaurant not found</div>
      <div style={{ fontSize: 14, color: 'var(--fg3)' }}>This share link may be invalid or expired.</div>
    </div>
  )

  const avgOverall = dishes.length
    ? (dishes.reduce((a, b) => a + Number(b.avg_rating), 0) / dishes.length).toFixed(1)
    : '—'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 40px', fontFamily: 'var(--font)' }}>
      {/* Header */}
      <div style={{ background: '#0a3010', padding: '20px 20px 24px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, opacity: 0.8 }}>
          <Logo size={28} color="#fff" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Dish Diary</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{restaurant.name}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 12 }}>{restaurant.address} {restaurant.cuisine && `· ${restaurant.cuisine}`}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{avgOverall}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>avg rating</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{dishes.length}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>dishes rated</div>
          </div>
        </div>
      </div>

      {/* Dishes */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--fg3)', marginBottom: 12 }}>
          Rated dishes
        </div>
        {dishes.map((dish, i) => (
          <div key={dish.item_name} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>{dish.item_name}</div>
                <div style={{ marginTop: 4 }}>
                  <StarDisplay value={Number(dish.avg_rating)} size={14} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 3, fontWeight: 600 }}>
                  {dish.avg_rating} avg · {dish.visit_count} log{dish.visit_count !== 1 ? 's' : ''}
                </div>
              </div>
              {i === 0 && <span style={{ background: 'var(--gold2)', color: 'var(--gold)', padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>⭐ Top dish</span>}
            </div>
            {dish.all_notes?.filter(Boolean).slice(0, 1).map((note: string, j: number) => (
              <div key={j} style={{ fontSize: 12, color: 'var(--fg2)', fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                "{note}"
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--fg3)', fontSize: 12 }}>
        Shared via <strong style={{ color: 'var(--accent)' }}>Dish Diary</strong>
      </div>
    </div>
  )
}
