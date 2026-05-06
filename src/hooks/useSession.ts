import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { generateSessionCode } from '@/lib/helpers'
import type { DiningSession, SessionParticipant } from '@/types'

export function useSession() {
  const { user, profile } = useAuth()
  const [activeSession, setActiveSession] = useState<DiningSession | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])

  useEffect(() => {
    if (!user || !activeSession) return

    // Realtime: watch for new participants and entries
    const sub = supabase
      .channel(`session:${activeSession.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_participants', filter: `session_id=eq.${activeSession.id}` },
        () => fetchParticipants(activeSession.id)
      )
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [activeSession?.id])

  async function fetchParticipants(sessionId: string) {
    const { data } = await supabase
      .from('session_participants')
      .select('*, user:profiles(*)')
      .eq('session_id', sessionId)
    if (data) setParticipants(data)
  }

  async function createSession(restaurantId?: string): Promise<{ error: string | null }> {
    if (!user) return { error: 'Not logged in' }

    const code = generateSessionCode()
    const { data, error } = await supabase
      .from('dining_sessions')
      .insert({ code, created_by: user.id, restaurant_id: restaurantId ?? null })
      .select()
      .single()

    if (error || !data) return { error: error?.message ?? 'Failed to create session' }

    // Add creator as participant
    await supabase.from('session_participants').insert({ session_id: data.id, user_id: user.id })
    await fetchParticipants(data.id)
    setActiveSession(data)
    return { error: null }
  }

  async function joinSession(code: string): Promise<{ error: string | null }> {
    if (!user) return { error: 'Not logged in' }

    const { data: session } = await supabase
      .from('dining_sessions')
      .select('*, restaurant:restaurants(*)')
      .eq('code', code.toUpperCase().trim())
      .eq('status', 'active')
      .single()

    if (!session) return { error: 'Session not found or already ended.' }

    // Join as participant (ignore if already joined)
    await supabase
      .from('session_participants')
      .upsert({ session_id: session.id, user_id: user.id }, { onConflict: 'session_id,user_id' })

    await fetchParticipants(session.id)
    setActiveSession(session)
    return { error: null }
  }

  async function endSession(): Promise<void> {
    if (!activeSession) return
    await supabase
      .from('dining_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', activeSession.id)
    setActiveSession(null)
    setParticipants([])
  }

  function leaveSession() {
    setActiveSession(null)
    setParticipants([])
  }

  return { activeSession, participants, createSession, joinSession, endSession, leaveSession }
}
