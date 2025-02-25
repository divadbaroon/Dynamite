'use server'

import { joinOrCreateGroup } from '@/lib/actions/group'
import { SimulationMessage } from '@/types'

export async function initializeSimulationGroups(
  sessionId: string, 
  groupData: Record<string, SimulationMessage[]>
) {
  const groupNumbers = Object.keys(groupData).map(Number)
  const results = []

  for (const groupNumber of groupNumbers) {
    const response = await joinOrCreateGroup(sessionId, groupNumber)
    if (response.error) {
      console.error(`Failed to create group ${groupNumber}:`, response.error)
    } else {
      results.push(response.group)
    }
  }

  return {
    success: results.length === groupNumbers.length,
    groups: results,
    error: results.length < groupNumbers.length ? 'Some groups failed to initialize' : null
  }
}