// ============================================================
// Dish Diary - TypeScript Types
// ============================================================

export interface Profile {
  id: string
  display_name: string
  email: string
  avatar_color: string
  created_at: string
}

export interface Restaurant {
  id: string
  name: string
  address: string | null
  cuisine: string | null
  google_place_id: string | null
  created_by: string | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  user_id: string
  restaurant_id: string
  session_id: string | null
  item_name: string
  item_category: string | null
  visit_date: string
  rating_overall: number | null
  rating_flavor: number | null
  rating_temperature: number | null
  rating_texture: number | null
  rating_presentation: number | null
  rating_value: number | null
  notes: string | null
  created_at: string
  // joined
  restaurant?: Restaurant
  user?: Profile
}

export interface DishStats {
  user_id: string
  restaurant_id: string
  item_name: string
  item_category: string | null
  visit_count: number
  avg_rating: number
  avg_flavor: number | null
  avg_temperature: number | null
  avg_texture: number | null
  avg_presentation: number | null
  avg_value: number | null
  last_visited: string
  all_notes: string[] | null
}

export interface DiningSession {
  id: string
  code: string
  restaurant_id: string | null
  created_by: string
  status: 'active' | 'ended'
  created_at: string
  ended_at: string | null
  // joined
  restaurant?: Restaurant
  participants?: SessionParticipant[]
}

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  joined_at: string
  user?: Profile
}

export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  from_user?: Profile
  to_user?: Profile
}

export interface WishlistItem {
  id: string
  user_id: string
  item_name: string
  restaurant_name: string | null
  priority: 'high' | 'med' | 'low'
  notes: string | null
  created_at: string
}

// UI-only types
export interface MenuCategory {
  [category: string]: string[]
}

export interface RestaurantSearchResult {
  name: string
  address: string
  cuisine: string
  menu: MenuCategory
}

export interface RatingMode {
  mode: 'stars' | 'detailed'
}

export interface NewEntryDraft {
  item_name: string
  item_category: string
  who: string[] // user_ids
  rating_overall: number
  rating_flavor: number
  rating_temperature: number
  rating_texture: number
  rating_presentation: number
  rating_value: number
  notes: string
  mode: 'stars' | 'detailed'
}
