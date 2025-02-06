"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClipboardCopy, Users, Check, BarChart2, Square, Play } from "lucide-react"

import { getDiscussionById, updateDiscussionStatus } from "@/lib/actions/discussion"
import { generateDiscussionInviteLink } from "@/lib/actions/link"

import type { Discussion, DiscussionContentProps } from "@/types"

export function DiscussionContent({ discussionId }: DiscussionContentProps) {
  const router = useRouter()
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [discussionData, setDiscussionData] = useState<Discussion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDiscussionData = async () => {
      try {
        const { discussion, error } = await getDiscussionById(discussionId)
        if (error) throw error
        if (!discussion) throw new Error("Discussion not found")

        setDiscussionData(discussion)
      } catch (error) {
        console.log("Error loading discussion:", error)
        setError("Failed to load discussion data")
      } finally {
        setLoading(false)
      }
    }

    loadDiscussionData()
  }, [discussionId])

  async function generateInviteLink() {
    const { link, error } = await generateDiscussionInviteLink(discussionId)
    if (error) {
      console.log(error)
      return
    }
    setInviteLink(link)
  }

  const copyToClipboard = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.log("Failed to copy:", err)
      }
    }
  }

  const handleLaunchDiscussion = async () => {
    try {
      const { discussion, error } = await updateDiscussionStatus(discussionId, 'active')
      if (error) throw error
      
      setDiscussionData(discussion)
      setIsDialogOpen(false)
    } catch (error) {
      console.log('Error launching discussion:', error)
    }
  }
  
  const handleEndDiscussion = async () => {
    try {
      const { discussion, error } = await updateDiscussionStatus(discussionId, 'completed')
      if (error) throw error
      
      setDiscussionData(discussion)
      setIsDialogOpen(false)
    } catch (error) {
      console.log('Error ending discussion:', error)
    }
  }

  const formatTimeLeft = (timeLeftInSeconds: number | null): string => {
    if (timeLeftInSeconds === null) return "Duration not set"
    const minutes = Math.ceil(timeLeftInSeconds / 60)
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !discussionData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Discussion not found"}</p>
          <Button onClick={() => router.push("/discussion")}>Back to Discussions</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{discussionData.title}</h1>
        <p className="text-lg text-muted-foreground mb-8">Manage and prepare your discussion</p>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="details">1. Review Details</TabsTrigger>
            <TabsTrigger value="invite">2. Invite Participants</TabsTrigger>
            <TabsTrigger value="launch">3. launch</TabsTrigger>
            <TabsTrigger
              value="monitor"
              disabled={discussionData?.status !== "active" && discussionData?.status !== "completed"}
            >
              4. Monitor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Discussion Details</CardTitle>
                <CardDescription>Review and prepare for your discussion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Task</h2>
                    <p className="text-muted-foreground">{discussionData.task}</p>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Scenario</h2>
                    <p className="text-muted-foreground">{discussionData.scenario}</p>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Discussion Points</h2>
                    <ul className="list-disc pl-5 space-y-1">
                      {discussionData.discussion_points.map((point, index) => (
                        <li key={index} className="text-muted-foreground">
                          {typeof point === 'string' ? point : point.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Discussion Duration</h2>
                    <p className="text-muted-foreground">{formatTimeLeft(discussionData.time_left ?? null)}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button>Edit</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invite">
            <Card>
              <CardHeader>
                <CardTitle>Invite Participants</CardTitle>
                <CardDescription>Generate and share the session link</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside mb-6 space-y-2">
                  <li>Click the &quot;Generate Invite Link&quot; button below</li>
                  <li>Copy the generated link to your clipboard</li>
                  <li>Share the link with your participants</li>
                </ol>
                <div className="flex flex-col space-y-4">
                  <Button onClick={generateInviteLink} className="w-full sm:w-auto">
                    Generate Invite Link
                    <ClipboardCopy className="ml-2 h-4 w-4" />
                  </Button>
                  {inviteLink && (
                    <div className="flex items-center space-x-2">
                      <input type="text" value={inviteLink} readOnly className="flex-grow p-2 border rounded" />
                      <Button onClick={copyToClipboard}>
                        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Note: The generated link will be valid for 24 hours.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor">
            <Card>
              <CardHeader>
                <CardTitle>Discussion Overview</CardTitle>
                <CardDescription>Quick insights into your discussion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{discussionData.participant_count}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Participation Rate</CardTitle>
                      <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">85%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg. Topic Coverage</CardTitle>
                      <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">60%</div>
                    </CardContent>
                  </Card>
                </div>
                <Button className="w-full">View Full Dashboard</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="launch">
            <Card>
              <CardHeader>
                <CardTitle>Launch Discussion</CardTitle>
                <CardDescription>Review status and start when ready</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Students Ready</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{discussionData.participant_count}</div>
                      <p className="text-xs text-muted-foreground">waiting in lobby</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Groups Formed</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{discussionData.group_count}</div>
                      <p className="text-xs text-muted-foreground">ready for discussion</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="pt-4">
                  <Button onClick={() => setIsDialogOpen(true)} className="w-full" size="lg">
                    {discussionData.status === "active" ? (
                      <>
                        End Discussion
                        <Square className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Launch Discussion
                        <Play className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {discussionData.status === "active"
                      ? "This will end the discussion and conclude all group discussions"
                      : "Once launched, participants will be moved from the waiting room to their assigned groups"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>
                    {discussionData.status === 'active' ? 'End Discussion' : 'Launch Discussion'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                    {discussionData.status === 'active'
                    ? 'This will end the discussion and conclude all group discussions. This action cannot be undone.'
                    : 'This will start the discussion and release participants into their groups. Discussion details cannot be changed after launch.'}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={discussionData.status === 'active' ? handleEndDiscussion : handleLaunchDiscussion}
                    className={discussionData.status === 'active' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                    {discussionData.status === 'active' ? 'End Discussion' : 'Launch Discussion'}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

