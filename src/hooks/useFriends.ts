import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { FriendRequest, Profile } from '@/types'

export function useFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Profile[]>([])
  const [pendingReceived, setPendingReceived] = useState<FriendRequest[]>([])
  const [pendingSent, setPendingSent] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: reqs } = await supabase
      .from('friend_requests')
      .select('*, from_user:profiles!friend_requests_from_user_id_fkey(*), to_user:profiles!friend_requests_to_user_id_fkey(*)')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

    if (reqs) {
      const accepted = reqs.filter((r: any) => r.status === 'accepted')
      const received = reqs.filter((r: any) => r.status === 'pending' && r.to_user_id === user.id)
      const sent = reqs.filter((r: any) => r.status === 'pending' && r.from_user_id === user.id)

      setFriends(accepted.map((r: any) =>
        r.from_user_id === user.id ? r.to_user : r.from_user
      ).filter(Boolean))
      setPendingReceived(received)
      setPendingSent(sent)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user, fetchAll])

  async function sendRequest(toEmail: string) {
    const { data: target } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .eq('email', toEmail.toLowerCase().trim())
      .single()

    if (!target) return { error: 'No user found with that email.' }
    if (target.id === user?.id) return { error: "You can't add yourself." }

    const { error } = await supabase
      .from('friend_requests')
      .insert({ from_user_id: user?.id, to_user_id: target.id })

    if (error) return { error: 'Request already sent or you are already friends.' }
    await fetchAll()
    return { error: null, name: target.display_name }
  }

  async function acceptRequest(requestId: string) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
    await fetchAll()
  }

  async function declineRequest(requestId: string) {
    await supabase.from('friend_requests').update({ status: 'declined' }).eq('id', requestId)
    await fetchAll()
  }

  async function removeFriend(requestId: string) {
    await supabase.from('friend_requests').delete().eq('id', requestId)
    await fetchAll()
  }

  return { friends, pendingReceived, pendingSent, loading, sendRequest, acceptRequest, declineRequest, removeFriend, refresh: fetchAll }
}
