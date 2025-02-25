'use server'

import { createClient } from '@/utils/supabase/server'

import { EthicalPerspective } from "@/types"

export async function saveEthicalPerspectives(
  sessionId: string,
  groupId: string,
  currentPoint: number,
  perspectives: EthicalPerspective[]
) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('ethical_perspectives')
      .insert({
        session_id: sessionId,
        group_id: groupId,
        current_point: currentPoint,
        perspectives: perspectives,
        created_at: new Date().toISOString()
      })

    if (error) throw error
    
    return { error: null }
  } catch (error) {
    console.error('Error saving ethical perspectives:', error)
    return { error }
  }
}

export async function fetchSessionEthicalPerspectives(sessionId: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('ethical_perspectives')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group perspectives by current_point for easier consumption
    const groupedByPoint = data?.reduce((acc: Record<number, typeof data>, item) => {
      if (!acc[item.current_point]) {
        acc[item.current_point] = []
      }
      acc[item.current_point].push(item)
      return acc
    }, {})
    
    return { 
      data: groupedByPoint,
      rawData: data,
      error: null 
    }
  } catch (error) {
    console.error('Error fetching session ethical perspectives:', error)
    return { data: null, rawData: null, error }
  }
}