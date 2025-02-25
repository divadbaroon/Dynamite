"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useTranscriptAnalysis } from "@/lib/hooks/transcriptAnalaysis"
import { useDiscussion } from '@/lib/hooks/useDiscussion'
import { useSharedAnswers } from '@/lib/hooks/sharedAnswers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { initializeSimulationGroups } from '@/lib/actions/simulation'
import { useEthicalAnalysis } from '@/lib/hooks/useEthicalAnalysis'
import { Group, SimulatorPageProps, SimulationMessage, SimulationData, GroupProgress } from '@/types'

export default function SimulatorPage({ discussionId }: SimulatorPageProps) {
  const [simData, setSimData] = useState<SimulationData | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializedGroups, setInitializedGroups] = useState<string[]>([])
  const [groupMapping, setGroupMapping] = useState<Record<string, string>>({})
  const [groupProgress, setGroupProgress] = useState<Record<string, GroupProgress>>({})

  const { analyzeEthicalPerspectives } = useEthicalAnalysis()

  const supabase = createClient()
  
  // Track sent messages per group
  const sentMessagesRef = useRef<Record<string, Set<string>>>({})
  const simulationStartRef = useRef<number | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const analysisIntervalsRef = useRef<{ [groupId: string]: NodeJS.Timeout }>({})
  
  const {
    discussion,
    loading: discussionLoading,
    currentPointIndex,
  } = useDiscussion(discussionId)

  const { sharedAnswers, loading: answersLoading } = useSharedAnswers(discussionId)
  const currentPoint = discussion?.discussion_points?.[currentPointIndex] || null
  const { analyzeTranscript } = useTranscriptAnalysis()

  const initializeGroups = async (data: SimulationData) => {
    setIsInitializing(true)
    try {
      const result = await initializeSimulationGroups(
        discussionId,
        data.groups
      )

      if (!result.success || !result.groups?.length) {
        throw new Error(result.error || 'Failed to initialize groups')
      }

      const validGroups = result.groups.filter(
        (g): g is Group => Boolean(g && typeof g === 'object' && 'id' in g && 'created_at' in g)
      )

      if (!validGroups.length) {
        throw new Error('No valid groups were created')
      }

      // Create mapping of original group numbers to new UUIDs
      const newGroupMapping: Record<string, string> = {}
      validGroups.forEach((g, index) => {
        newGroupMapping[(index + 1).toString()] = g.id
      })

      setGroupMapping(newGroupMapping)

      // Initialize progress tracking for each group
      const initialProgress: Record<string, GroupProgress> = {}
      const initialSentMessages: Record<string, Set<string>> = {}

      // Remap all the groups and their messages with new IDs
      const remappedGroups: typeof data.groups = {}
      Object.entries(data.groups).forEach(([originalGroupId, messages]) => {
        const newGroupId = newGroupMapping[originalGroupId]
        if (newGroupId) {
          remappedGroups[newGroupId] = messages.map(msg => ({
            ...msg,
            group_id: newGroupId,
            session_id: discussionId
          }))
          
          initialProgress[newGroupId] = {
            totalMessages: messages.length,
            sentMessages: 0,
            isComplete: false
          }
          
          initialSentMessages[newGroupId] = new Set()
        }
      })

      sentMessagesRef.current = initialSentMessages
      setGroupProgress(initialProgress)

      setInitializedGroups(validGroups.map(g => g.id))
      setSimData({
        ...data,
        session_id: discussionId,
        groups: remappedGroups
      })
      setError(null)

      toast.success('Groups initialized successfully')
    } catch (err) {
      console.error('Failed to initialize groups:', err)
      setError('Failed to initialize simulation groups')
      toast.error('Failed to initialize groups')
    } finally {
      setIsInitializing(false)
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/json': ['.json'] },
    onDrop: async (files) => {
      try {
        const file = files[0]
        const text = await file.text()
        const data = JSON.parse(text)
        await initializeGroups(data)
      } catch (err) {
        console.error(err)
        setError('Failed to parse simulation data')
      }
    }
  })

  const runGroupAnalysis = async (groupId: string) => {
    if (!simData || !currentPoint || answersLoading) return
  
    try {
      // Get all messages for this group from DB
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', discussionId)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
  
      if (fetchError) {
        console.error('Error fetching messages:', fetchError)
        return
      }
  
      if (!messages?.length) return
  
      // Get simulation progress (how far along we are in sent messages)
      const sentCount = sentMessagesRef.current[groupId]?.size || 0
      
      // Only analyze the most recent chunk of sent messages
      const recentMessages = messages.slice(Math.max(0, sentCount - 10), sentCount)
  
      if (recentMessages.length > 0) {
        console.log('Analyzing messages:', {
          groupId,
          totalSent: sentCount,
          analyzing: recentMessages.length,
          messageRange: {
            from: recentMessages[0].created_at,
            to: recentMessages[recentMessages.length - 1].created_at
          }
        })
  
        // Run both analyses in parallel
        await Promise.all([
          analyzeTranscript(
            discussionId,
            groupId,
            recentMessages,
            currentPoint,
            sharedAnswers || {}
          ),
          analyzeEthicalPerspectives(
            discussionId,
            groupId,
            recentMessages,
            currentPoint
          )
        ])
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    }
  }

  const sendMessage = async (message: SimulationMessage, groupId: string) => {
    if (sentMessagesRef.current[groupId]?.has(message.id)) return

    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          session_id: discussionId,
          group_id: groupId,
          user_id: message.user_id,
          username: message.username,
          content: message.content,
          created_at: new Date(message.created_time).toISOString(),
          audio_url: null
        })

      if (insertError) throw insertError
      
      sentMessagesRef.current[groupId]?.add(message.id)
      setGroupProgress(prev => ({
        ...prev,
        [groupId]: {
          ...prev[groupId],
          sentMessages: (prev[groupId]?.sentMessages || 0) + 1
        }
      }))
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Function to find messages ready to be sent for a given time
  const findReadyMessages = (simulatedTime: number) => {
    const readyMessages: { message: SimulationMessage; groupId: string }[] = []

    Object.entries(simData?.groups || {}).forEach(([groupId, messages]) => {
      messages.forEach(message => {
        const messageTime = new Date(message.created_time).getTime()
        if (messageTime <= simulatedTime && !sentMessagesRef.current[groupId]?.has(message.id)) {
          readyMessages.push({ message, groupId })
        }
      })
    })

    return readyMessages
  }

  useEffect(() => {
    if (!isRunning || !simData) return

    simulationStartRef.current = Date.now()
    sessionStartRef.current = new Date(simData.session_start_time).getTime()

    console.log('Starting simulation:', {
      startTime: new Date(simData.session_start_time).toISOString(),
      groupCount: Object.keys(simData.groups).length,
      totalMessages: Object.values(simData.groups).reduce(
        (sum, messages) => sum + messages.length, 
        0
      )
    })

    // Start analysis intervals for all groups
    initializedGroups.forEach(groupId => {
      const analysisInterval = setInterval(() => {
        runGroupAnalysis(groupId)
      }, 15000) // Run analysis every 15 seconds
      analysisIntervalsRef.current[groupId] = analysisInterval
    })

    // Main simulation interval
    const interval = setInterval(async () => {
      if (!simulationStartRef.current || !sessionStartRef.current) return

      const elapsedSimulationTime = Date.now() - simulationStartRef.current
      const simulatedTime = sessionStartRef.current + elapsedSimulationTime

      // Find all messages that should be sent at this time across all groups
      const readyMessages = findReadyMessages(simulatedTime)

      // Send all ready messages in parallel
      await Promise.all(
        readyMessages.map(({ message, groupId }) => 
          sendMessage(message, groupId)
        )
      )

      // Check if all groups are complete
      const allGroupsComplete = Object.entries(simData.groups).every(([groupId, messages]) => {
        const sentCount = sentMessagesRef.current[groupId]?.size || 0
        return sentCount === messages.length
      })

      if (allGroupsComplete) {
        console.log('Simulation completed:', {
          totalMessagesSent: Object.values(sentMessagesRef.current)
            .reduce((sum, set) => sum + set.size, 0),
          duration: Date.now() - (simulationStartRef.current || 0)
        })
        setIsRunning(false)
      }
    }, 100)

    return () => {
      clearInterval(interval)
      Object.values(analysisIntervalsRef.current).forEach(clearInterval)
      analysisIntervalsRef.current = {}
    }
  }, [isRunning, simData, initializedGroups])

  const resetSimulation = async () => {
    if (!simData) return

    try {
      await Promise.all(
        initializedGroups.map(groupId =>
          supabase
            .from('messages')
            .delete()
            .eq('session_id', discussionId)
            .eq('group_id', groupId)
        )
      )

      // Reset all tracking state
      sentMessagesRef.current = Object.fromEntries(
        initializedGroups.map(groupId => [groupId, new Set()])
      )
      
      setGroupProgress(prev => 
        Object.fromEntries(
          Object.entries(prev).map(([groupId, progress]) => [
            groupId,
            { ...progress, sentMessages: 0, isComplete: false }
          ])
        )
      )

      simulationStartRef.current = null
      sessionStartRef.current = null
      setError(null)
      toast.success("Simulation reset")
    } catch (error) {
      setError('Failed to reset simulation')
    }
  }

  let content;
  if (discussionLoading || answersLoading) {
    content = (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin" />
      </div>
    );
  } else if (!simData || isInitializing) {
    content = (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {isInitializing ? 'Initializing Groups...' : 'Upload Simulation Data'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isInitializing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-600">Creating simulation groups...</p>
              </div>
            ) : (
              <div 
                {...getRootProps()} 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
              >
                <input {...getInputProps()} />
                <p>Drop simulation data file here or click to select</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Session Simulator</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="font-medium">Discussion ID: {discussionId}</div>
              <div className="font-medium">
                Start Time: {new Date(simData.session_start_time).toLocaleString()}
              </div>
              <div className="font-medium">
                Current Point: {currentPoint?.content || 'None'}
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Groups:</div>
                {Object.entries(simData.groups).map(([groupId]) => {
                  const progress = groupProgress[groupId];
                  const percentComplete = progress ? 
                    Math.round((progress.sentMessages / progress.totalMessages) * 100) : 0;
                  
                  return (
                    <div 
                      key={groupId}
                      className={`p-4 rounded-lg ${
                        progress?.isComplete ? 'bg-green-50 border border-green-200' :
                        isRunning ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium">
                        qGroup {Object.entries(groupMapping).find(([v]) => v === groupId)?.[0] || groupId}
                        </div>
                        <div className="text-sm text-gray-500">
                          Messages: {progress?.sentMessages || 0} / {progress?.totalMessages || 0}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${percentComplete}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant={isRunning ? "destructive" : "default"}
                >
                  {isRunning ? 'Stop' : 'Start'} Simulation
                </Button>
                <Button
                  onClick={resetSimulation}
                  variant="outline"
                  disabled={isRunning}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return content;
}