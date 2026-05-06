import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthPage } from '@/pages/AuthPage'
import { LogPage } from '@/pages/LogPage'
import { AddMealPage } from '@/pages/AddMealPage'
import { WishlistPage } from '@/pages/WishlistPage'
import { SessionPage } from '@/pages/SessionPage'
import { PlacesPage } from '@/pages/PlacesPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { Logo } from '@/components/Logo'
import { SharePage } from '@/pages/SharePage'
import { useFriends } from '@/hooks/useFriends'
import type { Restaurant } from '@/types'

type Tab = 'log' | 'add' | 'wishlist' | 'session' | 'places' | 'profile'

export function App() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<Tab>('log')
  const [prefillRestaurant, setPrefillRestaurant] = useState<Restaurant | null>(null)
  const { pendingReceived } = useFriends()

  // Handle share links — /share/TOKEN — no auth required
  const shareMatch = window.location.pathname.match(/^\/share\/([a-f0-9]+)$/)
  if (shareMatch) return <SharePage token={shareMatch[1]} />

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a3010' }}>
        <Logo size={72} color="#fff" />
      </div>
    )
  }

  if (!user) return <AuthPage />

  function logAgain(restaurant: Restaurant) {
    setPrefillRestaurant(restaurant)
    setTab('add')
  }

  function handleSaved() {
    setPrefillRestaurant(null)
    setTab('log')
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-logo">
          <Logo size={56} color="#ffffff" />
          <div>
            <h1>Dish Diary</h1>
            <div className="header-sub">Track every great (and not-so-great) meal</div>
          </div>
        </div>
        <button
          className="btn btn-outline btn-sm"
          style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.12)', position: 'relative' }}
          onClick={() => setTab('profile')}
        >
          👤 Profile
          {pendingReceived.length > 0 && (
            <span className="pending-badge">{pendingReceived.length}</span>
          )}
        </button>
      </header>

      <nav className="nav">
        {([
          { id: 'log', label: '📖 Log' },
          { id: 'add', label: '+ Meal' },
          { id: 'wishlist', label: '✨ Try List' },
          { id: 'session', label: '👥 Group' },
          { id: 'places', label: '🍽️ Places' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} className={`nav-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'log' && <LogPage onLogAgain={logAgain} />}
        {tab === 'add' && <AddMealPage prefillRestaurant={prefillRestaurant} onSaved={handleSaved} />}
        {tab === 'wishlist' && <WishlistPage />}
        {tab === 'session' && <SessionPage />}
        {tab === 'places' && <PlacesPage onLogAgain={logAgain} />}
        {tab === 'profile' && <ProfilePage />}
      </main>
    </div>
  )
}
