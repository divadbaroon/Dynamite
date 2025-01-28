'use server'

import { createClient } from '@/utils/supabase/server'
import { uniqueNamesGenerator, Config, adjectives, animals } from 'unique-names-generator'
import { UserData } from "@/types"

export async function createAnonymousUser(sessionId: string, consentStatus: boolean) {
  const supabase = await createClient()

  try {
    // Check if user is already signed in
    const { data: { session: existingSession } } = await supabase.auth.getSession()

    if (existingSession?.user) {
      // User exists, check if we need to update consent
      const { data: existingUser } = await supabase
        .from('users')
        .select('consent_status')
        .eq('id', existingSession.user.id)
        .single()

      if (existingUser && existingUser.consent_status !== consentStatus) {
        // Update consent status if it's different
        const { error: updateError } = await supabase
          .from('users')
          .update({ consent_status: consentStatus })
          .eq('id', existingSession.user.id)

        if (updateError) throw updateError
      }

      return { user: existingSession.user, error: null }
    }

    // If no existing user, create a new anonymous user
    const { data: { user }, error: authError } = await supabase.auth.signInAnonymously()

    if (authError || !user) {
      throw authError || new Error('Failed to create anonymous user')
    }

    // Configure username generation
    const config: Config = {
      dictionaries: [adjectives, animals],
      separator: '',
      length: 2,
      style: 'capital'
    }

    const username = uniqueNamesGenerator(config)

    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        username,
        session_id: sessionId,
        consent_status: consentStatus
      }])

    if (dbError) throw dbError

    return { user, error: null }
  } catch (error) {
    console.log('Error creating anonymous user:', error)
    return { user: null, error }
  }
}

export async function updateUserConsent({
  user_id,
  consent_status
}: {
  user_id: string
  consent_status: boolean
}) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('users')
      .update({ consent_status })
      .eq('id', user_id)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.log('Error updating user consent:', error)
    return { error }
  }
}

export async function getUserById(userId: string) {
  try {

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    if (!data) throw new Error("User not found")

    return data as UserData
  } catch (error) {
    console.log('Error getting user by Id:', error)
    return null
  }
}