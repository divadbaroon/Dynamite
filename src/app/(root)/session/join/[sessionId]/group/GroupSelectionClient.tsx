"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Users } from 'lucide-react'
import { joinOrCreateGroup } from '@/lib/actions/group'

import { GroupSelectionClientProps } from "@/types"
  
export default function GroupSelectionClient({ sessionId }: GroupSelectionClientProps) {
  const router = useRouter()
  const [groupNumberInput, setGroupNumberInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleJoinGroup = async () => {
    if (!groupNumberInput) {
      toast.error("Please enter a group number")
      return
    }

    setIsJoining(true)
    try {
      const { group, error } = await joinOrCreateGroup(
        sessionId,
        parseInt(groupNumberInput)
      )

      if (error) {
        if (error.message === 'Not authenticated') {
          toast.error("You must be signed in to join a group")
          return
        }
        throw error
      }

      if (group) {
        toast.success("Successfully joined the group")
        router.push(`/session/join/${sessionId}/${group.id}`)
      }
    } catch (error) {
      console.error('Error joining group:', error)
      toast.error("Failed to join group. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl mt-5">      
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Join Group</CardTitle>
          <CardDescription className="text-center">
            Enter your group number according to the breakout room number you are currently in
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="relative">
              <Input
                type="number"
                placeholder="Enter your group number"
                value={groupNumberInput}
                onChange={(e) => setGroupNumberInput(e.target.value)}
                className="pl-10 py-6 text-center text-xl"
              />
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <Button
              onClick={handleJoinGroup}
              disabled={!groupNumberInput || isJoining}
              className="w-full py-6 text-lg font-semibold transition-colors duration-200"
            >
              {isJoining ? 'Joining...' : 'Join Group'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}