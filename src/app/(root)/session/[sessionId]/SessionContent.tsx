"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ClipboardCopy, Users, Check, BarChart2 } from "lucide-react"
import { getSessionById } from '@/lib/actions/session'
import { Session, SessionContentProps } from "@/types"

export function SessionContent({ sessionId }: SessionContentProps) {
    const router = useRouter()
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [sessionData, setSessionData] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadSessionData = async () => {
            try {
                const { session, error } = await getSessionById(sessionId)
                if (error) throw error
                if (!session) throw new Error('Session not found')
                
                setSessionData(session)
            } catch (error) {
                console.error('Error loading session:', error)
                setError('Failed to load session data')
            } finally {
                setLoading(false)
            }
        }

        loadSessionData()
    }, [sessionId])

    const generateInviteLink = () => {
        setInviteLink(`${window.location.origin}/session/join/${sessionId}`)
    }

    const copyToClipboard = async () => {
        if (inviteLink) {
            try {
                await navigator.clipboard.writeText(inviteLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                console.error('Failed to copy:', err)
            }
        }
    }

    const formatTimeLeft = (timeLeftInSeconds: number | null): string => {
        if (timeLeftInSeconds === null) return 'Duration not set'
        const minutes = Math.ceil(timeLeftInSeconds / 60)
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`
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

    if (error || !sessionData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
                    <p className="text-gray-600 mb-4">{error || 'Session not found'}</p>
                    <Button onClick={() => router.push('/sessions')}>
                        Back to Sessions
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">{sessionData.title}</h1>
                <p className="text-lg text-muted-foreground mb-8">Manage and prepare your session</p>
                
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8">
                        <TabsTrigger value="details">1. Review Details</TabsTrigger>
                        <TabsTrigger value="invite">2. Invite Participants</TabsTrigger>
                        <TabsTrigger value="monitor">3. Monitor</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details">
                        <Card>
                            <CardHeader>
                                <CardTitle>Session Details</CardTitle>
                                <CardDescription>Review and prepare for your session</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-semibold mb-2">Task</h2>
                                        <p className="text-muted-foreground">{sessionData.task}</p>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold mb-2">Scenario</h2>
                                        <p className="text-muted-foreground">{sessionData.scenario}</p>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold mb-2">Discussion Points</h2>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {sessionData.discussion_points.map((point, index) => (
                                                <li key={index} className="text-muted-foreground">{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold mb-2">Session Duration</h2>
                                        <p className="text-muted-foreground">
                                            {formatTimeLeft(sessionData.time_left ?? null)}
                                        </p>
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
                                            <input
                                                type="text"
                                                value={inviteLink}
                                                readOnly
                                                className="flex-grow p-2 border rounded"
                                            />
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
                                <CardTitle>Session Overview</CardTitle>
                                <CardDescription>Quick insights into your session</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{sessionData.participant_count}</div>
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
                                <Button className="w-full">
                                    View Full Dashboard
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Session Launch</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will start the session and release participants into their groups. 
                                Session details cannot be changed after launch.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Launch</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}