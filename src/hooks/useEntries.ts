import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { DiaryEntry, DishStats, Restaurant } from '@/types'

export function useEntries() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchEntries()
  }, [user])

  async function fetchEntries() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('diary_entries')
      .select('*, restaurant:restaurants(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setEntries(data)
      // Extract unique restaurants
      const restMap = new Map<string, Restaurant>()
      data.forEach(e => { if (e.restaurant) restMap.set(e.restaurant.id, e.restaurant) })
      setRestaurants(Array.from(restMap.values()))
    }
    setLoading(false)
  }

  async function addEntries(
    restaurantId: string,
    items: Array<{
      item_name: string
      item_category: string
      visit_date: string
      rating_overall: number
      rating_flavor?: number
      rating_temperature?: number
      rating_texture?: number
      rating_presentation?: number
      rating_value?: number
      notes: string
      session_id?: string
    }>
  ) {
    if (!user) return { error: 'Not logged in' }

    const rows = items.map(item => ({
      user_id: user.id,
      restaurant_id: restaurantId,
      ...item,
    }))

    const { error } = await supabase.from('diary_entries').insert(rows)
    if (error) {
      console.error('addEntries error:', error)
      return { error: error.message }
    }
    return { error: null }
  }

  async function getDishStats(restaurantId: string): Promise<DishStats[]> {
    if (!user) return []
    const { data } = await supabase
      .from('dish_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .order('avg_rating', { ascending: false })
    return data ?? []
  }

  async function getEntriesForDish(restaurantId: string, itemName: string): Promise<DiaryEntry[]> {
    if (!user) return []
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .ilike('item_name', itemName)
      .order('visit_date', { ascending: false })
    return data ?? []
  }

  async function deleteEntry(entryId: string): Promise<void> {
    const { error } = await supabase.from('diary_entries').delete().eq('id', entryId)
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== entryId))
    }
  }

  async function getOrCreateRestaurant(name: string, address: string, cuisine: string, googlePlaceId?: string): Promise<Restaurant | null> {
    const cleanPlaceId = (googlePlaceId && !googlePlaceId.startsWith('mock-')) ? googlePlaceId : null

    try {
      // 1. Try by google_place_id first — most reliable
      if (cleanPlaceId) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('google_place_id', cleanPlaceId)
          .maybeSingle()
        if (data) return data
      }

      // 2. Try by name
      const { data: byName } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('name', name)
        .maybeSingle()
      if (byName) return byName

      // 3. Insert fresh — no upsert, just a plain insert
      const { data: created, error } = await supabase
        .from('restaurants')
        .insert({
          name,
          address: address || null,
          cuisine: cuisine || null,
          google_place_id: cleanPlaceId,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {
        // 4. If insert failed (race condition), try lookup one more time
        const { data: retry } = await supabase
          .from('restaurants')
          .select('*')
          .ilike('name', name)
          .maybeSingle()
        if (retry) return retry
        console.error('Failed to create restaurant:', error)
        return null
      }

      return created
    } catch (e) {
      console.error('getOrCreateRestaurant error:', e)
      return null
    }
  }

  return {
    entries,
    restaurants,
    loading,
    addEntries,
    getDishStats,
    getEntriesForDish,
    getOrCreateRestaurant,
    refresh: fetchEntries,
    deleteEntry,
  }
}
