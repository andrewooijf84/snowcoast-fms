import { useEffect } from 'react'
import { useAppStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'

export function useDataInit() {
  const { fetchAll, setUser, user } = useAppStore()

  // Restore Supabase session on reload
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch all data when user is present
  useEffect(() => {
    if (user) fetchAll()
  }, [user])
}
