import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setPreferences(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)

    if (data?.role === 'adopter') {
      await fetchPreferences(userId)
    }
    setLoading(false)
  }

  async function fetchPreferences(userId) {
    const { data } = await supabase
      .from('adopter_preferences')
      .select('*')
      .eq('adopter_id', userId)
      .maybeSingle()
    setPreferences(data)
  }

  async function refreshPreferences() {
    if (user) await fetchPreferences(user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const preferencesReady = profile?.role !== 'adopter' || !!preferences

  return (
    <AuthContext.Provider value={{
      user, profile, preferences, preferencesReady, loading, signOut, refreshPreferences,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
