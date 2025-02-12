"use client"

import React, { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import WaitingRoomGuide from '@/components/Discussion/waiting-room/WaitingRoomDisucussionGuide'

import { getDiscussionById } from "@/lib/actions/discussion";
import { useDiscussionStatus } from '@/lib/hooks/useDiscussionStatus';

import { handleDiscussionTransition } from '@/lib/actions/discussion-transition';

import type { Discussion, WaitingRoomClientProps } from '@/types';

export default function WaitingRoomClient({ discussionId, groupId }: WaitingRoomClientProps) {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

  const handleDiscussionStart = async () => {
    if (isTransitioning) return;
    
    await handleDiscussionTransition({
      discussionId,
      groupId,
      onTransitionStart: () => setIsTransitioning(true),
      onTransitionError: () => setIsTransitioning(false),
      navigate: router.replace
    });
  };

  useDiscussionStatus({
    discussionId,
    onDiscussionStart: handleDiscussionStart
  });

  useEffect(() => {
    if (!discussionId) {
      setError("No discussion ID provided");
      setLoading(false);
      return;
    }

    const fetchDiscussion = async () => {
      try {
        const { discussion, error } = await getDiscussionById(discussionId);
        if (error) throw error;
        if (!discussion) {
          setError("Session not found");
          return;
        }

        setDiscussion(discussion);
        
        if (discussion.status === 'active') {
          handleDiscussionStart();
        }
      } catch (error) {
        console.log("Error fetching discussion:", error);
        setError("Failed to load discussion data");
      } finally {
        setLoading(false);
      }
    };

    fetchDiscussion();
  }, [discussionId]);
  
  if (loading) {
    return (
      <div className="h-[77vh] w-full flex items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[77vh] w-full flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <button 
          onClick={() => router.push('/')}
          className="text-blue-500 hover:underline"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-[77vh] w-full flex flex-col">
      <div className="p-4">
        <Card className="w-full">
          <CardHeader>
            <CardDescription className="text-center text-lg">
              The instructor will start the discussion soon. Please review the Discussion Guide below.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-1">
        <div className="flex-1 p-4 overflow-hidden">
          <Card className="h-full">
            <CardContent className="h-full p-0">
              <ScrollArea className="h-full px-0">
                <WaitingRoomGuide discussion={discussion} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <Card className="h-full flex flex-col items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center h-full -mt-10">
              <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-4" />
              <p className="text-lg text-center mb-2">
                {isTransitioning 
                  ? "Joining discussion..."
                  : "Waiting for the instructor to start the discussion..."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}