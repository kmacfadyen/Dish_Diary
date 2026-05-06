import { useState, useEffect } from 'react'
import { useEntries } from '@/hooks/useEntries'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { useSession } from '@/hooks/useSession'
import { CUISINES, initials } from '@/lib/helpers'
import { StarRating } from '@/components/StarRating'
import { PhotoUpload } from '@/components/PhotoUpload'
import { searchGooglePlaces } from '@/lib/places'
import type { Restaurant, NewEntryDraft } from '@/types'

interface Props {
  prefillRestaurant?: Restaurant | null
  onSaved: () => void
}

const ATTRS = ['Flavor', 'Temperature', 'Texture', 'Presentation', 'Value'] as const

export function AddMealPage({ prefillRestaurant, onSaved }: Props) {
  const { user, profile } = useAuth()
  const { friends } = useFriends()
  const { activeSession } = useSession()
  const { addEntries, getOrCreateRestaurant, entries } = useEntries()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<{
    name: string; address: string; cuisine: string; google_place_id?: string
  } | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualAddress, setManualAddress] = useState('')
  const [manualCuisine, setManualCuisine] = useState('Restaurant')
  const [previousItems, setPreviousItems] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<Array<{ name: string }>>([])
  const [customItem, setCustomItem] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [drafts, setDrafts] = useState<NewEntryDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Pre-fill from "Log again"
  useEffect(() => {
    if (prefillRestaurant) {
      setSelectedRestaurant({
        name: prefillRestaurant.name,
        address: prefillRestaurant.address ?? '',
        cuisine: prefillRestaurant.cuisine ?? 'Restaurant',
        google_place_id: prefillRestaurant.google_place_id ?? undefined,
      })
      loadPreviousItems(prefillRestaurant.id)
      setSelectedItems([])
      setStep(2)
    }
  }, [prefillRestaurant])

  // Load items previously logged at this restaurant
  function loadPreviousItems(restaurantId: string) {
    const items = entries
      .filter(e => e.restaurant_id === restaurantId)
      .map(e => e.item_name)
    const unique = [...new Set(items)]
    setPreviousItems(unique)
  }

  // Also load previous items when we pick a restaurant from search
  async function loadPreviousItemsByName(name: string, address: string) {
    const items = entries
      .filter(e =>
        e.restaurant?.name.toLowerCase() === name.toLowerCase() &&
        (e.restaurant?.address ?? '').toLowerCase() === address.toLowerCase()
      )
      .map(e => e.item_name)
    const unique = [...new Set(items)]
    setPreviousItems(unique)
  }

  async function doSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const results = await searchGooglePlaces(searchQuery)
    setSearchResults(results)
    setSearching(false)
  }

  function pickRestaurant(r: any) {
    setSelectedRestaurant({ name: r.name, address: r.address, cuisine: r.cuisine, google_place_id: r.google_place_id })
    setSelectedItems([])
    loadPreviousItemsByName(r.name, r.address)
    setStep(2)
  }

  function pickManual() {
    if (!manualName.trim()) return
    const r = { name: manualName, address: manualAddress, cuisine: manualCuisine }
    setSelectedRestaurant(r)
    setSelectedItems([])
    loadPreviousItemsByName(manualName, manualAddress)
    setManualMode(false)
    setStep(2)
  }

  async function deleteItemPermanently(name: string) {
    // Remove from UI
    setPreviousItems(prev => prev.filter(n => n !== name))
    setSelectedItems(prev => prev.filter(i => i.name !== name))
    // Also delete from database so it won't show up next time
    if (user && selectedRestaurant) {
      const { supabase } = await import('@/lib/supabase')
      // Find the restaurant id
      const { data: rests } = await supabase
        .from('restaurants')
        .select('id')
        .ilike('name', selectedRestaurant.name)
        .limit(1)
      if (rests && rests[0]) {
        await supabase
          .from('diary_entries')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', rests[0].id)
          .ilike('item_name', name)
      }
    }
  }

  function toggleItem(name: string) {
    const idx = selectedItems.findIndex(i => i.name === name)
    if (idx >= 0) setSelectedItems(prev => prev.filter((_, i) => i !== idx))
    else setSelectedItems(prev => [...prev, { name }])
  }

  function addCustom() {
    const v = customItem.trim()
    if (!v) return
    if (!selectedItems.some(i => i.name === v)) {
      setSelectedItems(prev => [...prev, { name: v }])
      // Also add to previousItems so it shows in the list
      if (!previousItems.includes(v)) {
        setPreviousItems(prev => [...prev, v])
      }
    }
    setCustomItem('')
  }

  function goToStep3() {
    const newDrafts: any[] = selectedItems.map(item => ({
      item_name: item.name,
      item_category: '',
      who: [user?.id ?? ''],
      rating_overall: 3,
      rating_flavor: 3,
      rating_temperature: 3,
      rating_texture: 3,
      rating_presentation: 3,
      rating_value: 3,
      notes: '',
      mode: 'stars',
      photo_url: null,
      saved_id: null,
    }))
    setDrafts(newDrafts)
    setStep(3)
  }

  function updateDraft(i: number, updates: Partial<NewEntryDraft>) {
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, ...updates } : d))
  }

  function toggleWho(draftIdx: number, personId: string) {
    const draft = drafts[draftIdx]
    const who = draft.who.includes(personId)
      ? draft.who.filter(id => id !== personId)
      : [...draft.who, personId]
    updateDraft(draftIdx, { who })
  }

  async function save() {
    if (!selectedRestaurant || !user) return
    setSaving(true)
    setSaveError('')

    const restaurant = await getOrCreateRestaurant(
      selectedRestaurant.name,
      selectedRestaurant.address,
      selectedRestaurant.cuisine,
      selectedRestaurant.google_place_id
    )
    if (!restaurant) { setSaveError('Failed to save restaurant.'); setSaving(false); return }

    const rows: any[] = []
    drafts.forEach(draft => {
      const isDetailed = draft.mode === 'detailed'
      draft.who.forEach(userId => {
        rows.push({
          user_id: userId,
          restaurant_id: restaurant.id,
          item_name: draft.item_name,
          item_category: draft.item_category || null,
          visit_date: visitDate,
          rating_overall: draft.rating_overall,
          rating_flavor: isDetailed ? draft.rating_flavor : null,
          rating_temperature: isDetailed ? draft.rating_temperature : null,
          rating_texture: isDetailed ? draft.rating_texture : null,
          rating_presentation: isDetailed ? draft.rating_presentation : null,
          rating_value: isDetailed ? draft.rating_value : null,
          notes: draft.notes || null,
          session_id: activeSession?.id ?? null,
        })
      })
    })

    // Only save entries for current user
    const myRows = rows.filter(r => r.user_id === user.id)

    // Insert and get back IDs so we can attach photos
    const { supabase } = await import('@/lib/supabase')
    const { data: savedEntries, error } = await supabase
      .from('diary_entries')
      .insert(myRows)
      .select('id, item_name')

    if (error) { setSaveError(error.message); setSaving(false); return }

    // Map saved IDs back to drafts so photo upload can work
    if (savedEntries) {
      setDrafts(prev => prev.map(d => {
        const match = savedEntries.find(e => e.item_name === d.item_name)
        return match ? { ...d, saved_id: match.id } : d
      }))
    }

    setSaving(false)
    setSaved(true)
  }

  const allPeople = [
    { id: user?.id ?? '', name: profile?.display_name ?? 'You' },
    ...friends.map(f => ({ id: f.id, name: f.display_name })),
  ]

  return (
    <div className="screen">

      {/* ── STEP 1: Find restaurant ── */}
      {step === 1 && (
        <>
          <div className="section-label">Find a restaurant</div>
          {!manualMode ? (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <input className="inp" style={{ flex: 1 }} placeholder="Search restaurant name or area…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()} />
                <button className="btn btn-primary" onClick={doSearch} disabled={searching}>
                  {searching ? '…' : 'Search'}
                </button>
                <button className="btn btn-outline" onClick={() => setManualMode(true)}>+ Manual</button>
              </div>

              {searchResults.length > 0 && (
                <div>
                  {searchResults.map((r, i) => (
                    <div className="card" key={i} style={{ cursor: 'pointer' }} onClick={() => pickRestaurant(r)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{r.address}</div>
                          {r.cuisine && r.cuisine !== 'Restaurant' && (
                            <span className="tag tag-green" style={{ marginTop: 4, display: 'inline-block' }}>{r.cuisine}</span>
                          )}
                        </div>
                        {r.rating && <span className="avg-badge">★ {r.rating}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !searching && (
                <div style={{ fontSize: 13, color: 'var(--fg3)', padding: '8px 0' }}>
                  No results — try a different name or use Manual entry.
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="form-group">
                <label className="form-label">Restaurant name</label>
                <input className="inp" placeholder="e.g. Joe's Diner" value={manualName}
                  onChange={e => setManualName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Address / area</label>
                <input className="inp" placeholder="e.g. 123 Main St, Chicago" value={manualAddress}
                  onChange={e => setManualAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Cuisine type</label>
                <select className="inp" value={manualCuisine} onChange={e => setManualCuisine(e.target.value)}>
                  {CUISINES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={pickManual}>Continue</button>
                <button className="btn btn-outline" onClick={() => setManualMode(false)}>Back</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: Pick items ── */}
      {step === 2 && selectedRestaurant && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setStep(1); setPreviousItems([]) }}>← Back</button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRestaurant.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg3)' }}>{selectedRestaurant.address}</div>
            </div>
          </div>

          {/* Previously logged items */}
          {previousItems.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="section-label" style={{ margin: 0 }}>Previously logged here</div>
                <span style={{ fontSize: 11, color: 'var(--fg3)', fontWeight: 600 }}>tap ✕ to delete an item</span>
              </div>
              <div className="menu-grid" style={{ marginBottom: 16 }}>
                {previousItems.map(name => (
                  <div key={name} style={{ position: 'relative' }}>
                    <div
                      className={`menu-item${selectedItems.some(s => s.name === name) ? ' on' : ''}`}
                      onClick={() => toggleItem(name)}
                      style={{ paddingRight: 28 }}>
                      <div className="menu-item-name">{name}</div>
                      <div className="menu-item-cat">Previously ordered</div>
                    </div>
                    <span
                      onClick={e => { e.stopPropagation(); deleteItemPermanently(name) }}
                      style={{ position: 'absolute', top: 6, right: 8, cursor: 'pointer', fontSize: 13, color: 'var(--fg3)', fontWeight: 800, lineHeight: 1, zIndex: 2 }}
                      title="Delete this item">✕</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Add new item */}
          <div className="section-label">Add a dish</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <input className="inp" style={{ flex: 1 }}
              placeholder="Type a dish name (e.g. Truffle Pasta, House Burger…)"
              value={customItem} onChange={e => setCustomItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()} />
            <button className="btn btn-primary" onClick={addCustom}>+ Add</button>
          </div>

          {/* Selected items */}
          {selectedItems.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div className="section-label">Selected ({selectedItems.length})</div>
              {selectedItems.map((item, i) => (
                <span key={item.name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', background: 'var(--accent3)', color: 'var(--fg)',
                  borderRadius: 14, fontSize: 12, fontWeight: 700, margin: 2
                }}>
                  {item.name}
                  <span style={{ cursor: 'pointer' }} onClick={() => setSelectedItems(prev => prev.filter((_, j) => j !== i))}>✕</span>
                </span>
              ))}
            </div>
          )}

          <button className="action-btn" disabled={selectedItems.length === 0} onClick={goToStep3}>
            Rate selected items →
          </button>
        </>
      )}

      {/* ── STEP 3: Rate ── */}
      {step === 3 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setStep(2)}>← Back</button>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRestaurant?.name}</div>
          </div>

          {drafts.map((draft, i) => (
            <div className="card" key={draft.item_name + i}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{draft.item_name}</div>
              </div>

              <div className="form-group">
                <div className="form-label">Who had this?</div>
                <div>
                  {allPeople.map(p => (
                    <button key={p.id} className={`chip${draft.who.includes(p.id) ? ' on' : ''}`}
                      onClick={() => toggleWho(i, p.id)}>
                      <span className="chip-avatar">{initials(p.name)}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <div className="form-label">Rating mode</div>
                <div className="rating-toggle">
                  <button className={`rating-toggle-btn${draft.mode === 'stars' ? ' on' : ''}`}
                    onClick={() => updateDraft(i, { mode: 'stars' })}>★ Stars</button>
                  <button className={`rating-toggle-btn${draft.mode === 'detailed' ? ' on' : ''}`}
                    onClick={() => updateDraft(i, { mode: 'detailed' })}>☰ Detailed</button>
                </div>
              </div>

              {draft.mode === 'stars' && (
                <div className="form-group">
                  <div className="form-label">Overall rating &nbsp;<span style={{fontSize:12,color:'var(--fg3)',fontWeight:600}}>({draft.rating_overall} / 5)</span></div>
                  <StarRating value={draft.rating_overall} onChange={v => updateDraft(i, { rating_overall: v })} size={28} />
                </div>
              )}

              {draft.mode === 'detailed' && ATTRS.map(attr => {
                const key = `rating_${attr.toLowerCase()}` as keyof NewEntryDraft
                const val = (draft[key] as number) ?? 3
                return (
                  <div className="slider-row" key={attr}>
                    <div className="slider-head">
                      <span>{attr}</span>
                      <span className="slider-val">{val}</span>
                    </div>
                    <input type="range" min={1} max={5} step={1} value={val}
                      onChange={e => {
                        const v = parseInt(e.target.value)
                        const vals = ATTRS.map(a =>
                          a === attr ? v : ((draft[`rating_${a.toLowerCase()}` as keyof NewEntryDraft] as number) ?? 3)
                        )
                        updateDraft(i, {
                          [key]: v,
                          rating_overall: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
                        } as any)
                      }} />
                  </div>
                )
              })}

              <div className="form-group" style={{ marginTop: 6 }}>
                <div className="form-label">Notes</div>
                <textarea className="inp" placeholder="Anything to remember next time…"
                  value={draft.notes} onChange={e => updateDraft(i, { notes: e.target.value })} />
              </div>
              {draft.saved_id && (
                <div className="form-group" style={{ marginTop: 6 }}>
                  <div className="form-label">Photo (optional)</div>
                  <PhotoUpload
                    entryId={draft.saved_id}
                    existingUrl={draft.photo_url}
                    onUploaded={url => updateDraft(i, { photo_url: url })}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label">Date of visit</label>
            <input type="date" className="inp" style={{ width: 180 }} value={visitDate}
              onChange={e => setVisitDate(e.target.value)} />
          </div>

          {saveError && <div className="auth-error">{saveError}</div>}

          {saved ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ background: '#e8f5e8', color: '#0e3d0e', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
                ✓ Saved! Add photos above or tap Done.
              </div>
              <button className="action-btn" onClick={onSaved}>
                Done →
              </button>
            </div>
          ) : (
            <button className="action-btn" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '✓ Save to Diary'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
