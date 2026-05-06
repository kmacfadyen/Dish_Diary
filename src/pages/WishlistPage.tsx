import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import type { WishlistItem } from '@/types'

const PRIORITY_COLORS = { high: '#8a1e1e', med: '#6b4e08', low: 'var(--fg3)' }
const PRIORITY_LABELS = { high: 'Must-try', med: 'Curious', low: 'Someday' }

export function WishlistPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [filter, setFilter] = useState<'all' | 'high' | 'med' | 'low'>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<WishlistItem | null>(null)
  const [form, setForm] = useState({ item_name: '', restaurant_name: '', priority: 'med' as 'high' | 'med' | 'low', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) fetchItems() }, [user])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase.from('wishlist').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  function openAdd() {
    setEditItem(null)
    setForm({ item_name: '', restaurant_name: '', priority: 'med', notes: '' })
    setShowModal(true)
  }

  async function saveItem() {
    if (!form.item_name.trim() || !user) return
    setSaving(true)
    if (editItem) {
      await supabase.from('wishlist').update({ ...form }).eq('id', editItem.id)
    } else {
      await supabase.from('wishlist').insert({ ...form, user_id: user.id })
    }
    setSaving(false)
    setShowModal(false)
    fetchItems()
  }

  async function deleteItem(id: string) {
    await supabase.from('wishlist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.priority === filter)

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-label" style={{ margin: 0 }}>Want to try</div>
        <button className="btn btn-gold btn-sm" onClick={openAdd}>+ Add item</button>
      </div>

      <div className="cat-tabs" style={{ marginBottom: 16 }}>
        {(['all', 'high', 'med', 'low'] as const).map(f => (
          <button key={f} className={`ctab${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'high' ? '🔴 Must-try' : f === 'med' ? '🟠 Curious' : '⚪ Someday'}
          </button>
        ))}
      </div>

      {loading && <div className="empty"><div className="empty-sub">Loading…</div></div>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">✨</div>
          <div className="empty-title">Nothing on the list yet</div>
          <div className="empty-sub">Tap "+ Add item" to start your wishlist</div>
        </div>
      )}

      {filtered.map(item => (
        <div className="wl-card" key={item.id}>
          <div className="priority-dot" style={{ background: PRIORITY_COLORS[item.priority] }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wl-name">{item.item_name}</div>
            {item.restaurant_name && <div className="wl-rest">🍽️ {item.restaurant_name}</div>}
            {item.notes && <div className="wl-note">"{item.notes}"</div>}
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 4, fontWeight: 600 }}>
              Added {format(new Date(item.created_at), 'MMM d, yyyy')} ·{' '}
              <span style={{ color: PRIORITY_COLORS[item.priority] }}>{PRIORITY_LABELS[item.priority]}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setEditItem(item); setForm({ item_name: item.item_name, restaurant_name: item.restaurant_name ?? '', priority: item.priority, notes: item.notes ?? '' }); setShowModal(true) }}>
              Edit
            </button>
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)' }} onClick={() => deleteItem(item.id)}>✕</button>
          </div>
        </div>
      ))}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <button className="modal-x" onClick={() => setShowModal(false)}>✕</button>
            <div className="modal-title">{editItem ? 'Edit item' : 'Add to Try List'}</div>
            <div className="modal-sub">Save a dish you want to try.</div>
            <div className="form-group">
              <label className="form-label">Dish / item name</label>
              <input className="inp" placeholder="e.g. Truffle Pasta" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Restaurant (optional)</label>
              <input className="inp" placeholder="Where is it?" value={form.restaurant_name} onChange={e => setForm(f => ({ ...f, restaurant_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="inp" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}>
                <option value="high">🔴 Must-try</option>
                <option value="med">🟠 Curious</option>
                <option value="low">⚪ Someday</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="inp" placeholder="Why do you want to try it?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 15 }} onClick={saveItem} disabled={saving}>
              {saving ? 'Saving…' : 'Save to Try List'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
