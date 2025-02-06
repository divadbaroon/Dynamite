"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WaitingRoomGuide from '@/components/Discussion/waiting-room/WaitingRoomDisucussionGuide'
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { getDiscussionById, updateHasLaunched, updateDiscussionPointTimestamps } from "@/lib/actions/discussion";
import type { Discussion } from '@/types';

interface WaitingRoomClientProps {
  discussionId: string;
  groupId: string;
}

export default function WaitingRoomClient({ discussionId, groupId }: WaitingRoomClientProps) {
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!discussionId) {
      setError("No discussion ID provided");
      setLoading(false);
      return;
    }

    // Initial discussion fetch
    const fetchDiscussion = async () => {
      try {
        const { discussion, error } = await getDiscussionById(discussionId);
        if (error) throw error;
        if (!discussion) {
          setError("Session not found");
          return;
        }

        setDiscussion(discussion);
        
        // If discussion is already active, handle transition
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

    // Set up realtime subscription
    const channel = supabase
      .channel(`discussion-status-${discussionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${discussionId}`
        },
        async (payload) => {
          const updatedDiscussion = payload.new as Discussion;
          setDiscussion(updatedDiscussion);

          if (updatedDiscussion.status === 'active' && !isTransitioning) {
            handleDiscussionStart();
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [discussionId, groupId, isTransitioning]);

  const handleDiscussionStart = async () => {
    try {
      setIsTransitioning(true);
      
      // Update has_launched timestamp
      const { error: launchError } = await updateHasLaunched(discussionId);
      if (launchError) {
        console.log("Error updating has_launched:", launchError);
      }
  
      // Update discussion point timestamps
      const { error: timestampError } = await updateDiscussionPointTimestamps(discussionId);
      if (timestampError) {
        console.log("Error updating point timestamps:", timestampError);
      }
  
      toast.success("Discussion is starting!");
      router.replace(`/discussion/join/${discussionId}/${groupId}`);
    } catch (error) {
      console.log("Error during transition:", error);
      setIsTransitioning(false);
      toast.error("Failed to join discussion");
    }
  };
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
                <WaitingRoomGuide discussion={discussion} groupId={groupId}/>
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