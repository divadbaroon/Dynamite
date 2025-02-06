import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"

import { SupabaseUser } from "@/types"

export function useSupabaseUser() {
    const [user, setUser] = useState<SupabaseUser | null>(null)
    const supabase = createClient()
  
    useEffect(() => {
      const getUser = async () => {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        if (error) {
          console.log('Error fetching user:', error)
          return
        }
        setUser(currentUser)
      }
    
      getUser()
    
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
    
      return () => {
        subscription.unsubscribe()
      }
    }, [])
  
    return { user }
  }