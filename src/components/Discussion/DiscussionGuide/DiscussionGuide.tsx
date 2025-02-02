import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Discussion } from "@/types"
import { createClient } from "@/utils/supabase/client"
import { Timer } from "./components/Timer"
import { ReviewDialog } from "./components/ReviewDialog"
import { DiscussionPoints } from "./components/DiscussionPoints"
import { HeaderContent } from "./components/HeaderContent"
import { DiscussionGuideProps, SharedAnswers, BulletPoint } from "@/types"

import { 
  getDiscussionById,
  fetchSharedAnswers,
  deleteAnswerPoint,
  saveAnswerEdit
} from '@/lib/actions/discussion'

function DiscussionGuide({ discussion, mode, groupId }: DiscussionGuideProps) {
  
  const [timeLeft, setTimeLeft] = useState<number>(600);

  // Recalculate timeLeft whenever discussion.has_launched updates
  useEffect(() => {
    if (!discussion?.has_launched) {
      console.log('No launch time found');
      setTimeLeft(600);
      return;
    }
    
    const launchTime = new Date(discussion.has_launched).getTime();
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - launchTime) / 1000);
    const remainingTime = Math.max(0, 600 - elapsedSeconds);
    
    console.log("Launched Time", launchTime);
    console.log("Current Time", currentTime);
    console.log("Elapsed Time", elapsedSeconds);
    console.log("Remaining Time", remainingTime);

    setTimeLeft(remainingTime);
  }, [discussion?.has_launched]);
  
  const [isRunning, setIsRunning] = useState(discussion?.status === 'active');
  const [loading, setLoading] = useState(true);
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswers>({});
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isSubmitted] = useState(false);
  const [editingPoint, setEditingPoint] = useState<{ index: number, bulletIndex: number } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [openItem, setOpenItem] = useState<string | undefined>(`item-${currentPointIndex}`);

  const supabase = createClient();

  // Timer sync effect
  useEffect(() => {
    if (!discussion?.has_launched || mode !== 'discussion' || !isRunning) return;

    const syncTimeWithServer = () => {
      if (!discussion.has_launched) return;
    
      const launchedAt = new Date(discussion.has_launched).getTime();
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - launchedAt) / 1000);
      const remainingTime = Math.max(0, 600 - elapsedSeconds);
    
      // Only update if the difference is more than 2 seconds
      if (Math.abs(remainingTime - timeLeft) > 2) {
        setTimeLeft(remainingTime);
      }
    
      if (remainingTime <= 0) {
        setIsTimeUp(true);
        setIsRunning(false);
      }
    };

    // Initial sync
    syncTimeWithServer();

    // Set up periodic sync
    const syncInterval = setInterval(syncTimeWithServer, 5000);
    
    // Regular countdown
    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        if (newTime <= 0) {
          setIsTimeUp(true);
          setIsRunning(false);
        }
        return newTime;
      });
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(countdownInterval);
    };
  }, [discussion?.has_launched, isRunning, mode, timeLeft]);

  useEffect(() => {
    if (isTimeUp) {
      setIsReviewOpen(true);
    }
  }, [isTimeUp]);

  // Fetch current discussion effect
  useEffect(() => {
    if (!discussion?.id) return;

    const getCurrentDiscussion = async () => {
      try {
        const { discussion: currentDiscussion, error } = await getDiscussionById(discussion.id);
        console.log("Discussion from DB:", currentDiscussion);
        if (error) throw error;

        if (currentDiscussion.current_point !== undefined) {
          setCurrentPointIndex(currentDiscussion.current_point);
        }
      } catch (error) {
        console.log('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentDiscussion();

    // Keep realtime subscription
    const channel = supabase
      .channel(`session-${discussion.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${discussion.id}`
        },
        (payload) => {
          const updatedDiscussion = payload.new as Discussion;
          setIsRunning(updatedDiscussion.status === 'active');
          
          if (updatedDiscussion.current_point !== undefined && 
              updatedDiscussion.current_point !== currentPointIndex) {
            setCurrentPointIndex(updatedDiscussion.current_point);
            setOpenItem(`item-${updatedDiscussion.current_point}`);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [discussion?.id, currentPointIndex]);

  // Shared answers effect
  useEffect(() => {
    if (!discussion?.id || !groupId) return;

    const getSharedAnswers = async () => {
      const { data, error } = await fetchSharedAnswers(discussion.id, groupId);
      
      if (error) {
        console.log('Error fetching shared answers:', error);
      }
      if (data?.answers && typeof data.answers === 'object') {
        setSharedAnswers(data.answers as SharedAnswers);
      }
    };

    getSharedAnswers();

    const channel = supabase
      .channel(`shared-answers-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_answers',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          const newAnswers = (payload.new as { answers: SharedAnswers })?.answers;
          if (newAnswers && typeof newAnswers === 'object') {
            setSharedAnswers(newAnswers);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [discussion?.id, groupId]);

  useEffect(() => {
    setOpenItem(`item-${currentPointIndex}`);
  }, [currentPointIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleReview = () => {
    setIsReviewOpen(true)
  }

  const handleDelete = async (pointIndex: number, bulletIndex: number) => {
    if (!discussion?.id || !groupId) {
      toast.error("Missing discussion or group information");
      return;
    }
    try {
      const updatedAnswers = { ...sharedAnswers };
      const key = `point${pointIndex}`;
      
      if (typeof updatedAnswers[key][bulletIndex] === 'string') {
        updatedAnswers[key][bulletIndex] = {
          content: updatedAnswers[key][bulletIndex],
          isDeleted: true
        };
      } else {
        updatedAnswers[key][bulletIndex] = {
          ...updatedAnswers[key][bulletIndex],
          isDeleted: true
        };
      }
  
      const { error } = await deleteAnswerPoint(discussion.id, groupId, pointIndex, bulletIndex, updatedAnswers);
  
      if (error) throw error;
      
      toast.success('Bullet point deleted');
    } catch (error) {
      console.log('Error deleting bullet point:', error);
      toast.error('Failed to delete bullet point');
    }
  };

  const handleSaveEdit = async (pointIndex: number, bulletIndex: number, newContent: string) => {
    if (!discussion?.id || !groupId) {
      toast.error("Missing discussion or group information");
      return;
    }

    try {
      const updatedAnswers = { ...sharedAnswers };
      const key = `point${pointIndex}`;
      
      if (typeof updatedAnswers[key][bulletIndex] === 'string') {
        updatedAnswers[key] = updatedAnswers[key].map((content): BulletPoint => 
          typeof content === 'string' ? { content, isDeleted: false } : content
        );
      }
      
      updatedAnswers[key][bulletIndex] = {
        ...updatedAnswers[key][bulletIndex],
        content: newContent,
      };
  
      const { error } = await saveAnswerEdit(discussion.id, groupId, updatedAnswers);
  
      if (error) throw error;
      setEditingPoint(null);
      toast.success('Bullet point updated');
    } catch (error) {
      console.log('Error updating bullet point:', error);
      toast.error('Failed to update bullet point');
    }
  };

  const handleUndo = async (pointIndex: number, bulletIndex: number) => {
    if (!discussion?.id || !groupId) {
      toast.error("Missing discussion or group information");
      return;
    }
  
    try {
      const updatedAnswers = { ...sharedAnswers };
      const key = `point${pointIndex}`;
      
      if (typeof updatedAnswers[key][bulletIndex] === 'object') {
        updatedAnswers[key][bulletIndex] = {
          ...updatedAnswers[key][bulletIndex],
          isDeleted: false
        };
      }
  
      const { error } = await saveAnswerEdit(discussion.id, groupId, updatedAnswers);
  
      if (error) throw error;
      toast.success('Bullet point restored');
    } catch (error) {
      console.log('Error restoring bullet point:', error);
      toast.error('Failed to restore bullet point');
    }
  };

  if (!discussion) return null;

  const getCardHeight = () => {
    switch (mode) {
      case 'discussion':
        return 'h-[90vh]';
      case 'waiting-room':
        return 'h-[80vh]';
      default:
        return 'h-[80vh]';
    }
  };

  if (loading) {
    return (
      <Card className={`w-full ${getCardHeight()} flex flex-col items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${getCardHeight()} flex flex-col`}>
      <CardHeader className="flex-shrink-0 space-y-2">
        <CardTitle className="text-2xl font-bold text-center">Discussion Guide</CardTitle>
        <Separator />
      </CardHeader>

      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <HeaderContent 
            task={discussion.task}
            scenario={discussion.scenario}
          />

          <DiscussionPoints
            discussion={discussion}
            mode={mode}
            currentPointIndex={currentPointIndex}
            setCurrentPointIndex={setCurrentPointIndex} 
            openItem={openItem}
            setOpenItem={setOpenItem}
            sharedAnswers={sharedAnswers}
            editingPoint={editingPoint}
            setEditingPoint={setEditingPoint}
            editedContent={editedContent}
            setEditedContent={setEditedContent}
            handleSaveEdit={handleSaveEdit}
            handleDelete={handleDelete}
            handleUndo={handleUndo}
            isRunning={isRunning}
          />
        </ScrollArea>
      </CardContent>

      {mode === 'discussion' && (
        <CardFooter className="flex-shrink-0 border-t pt-4">
          <div className="w-full flex justify-between items-center mt-2">
            <p className="text-lg font-semibold">Total Time Left: {formatTime(timeLeft)}</p>
            <Button onClick={handleReview}>Review Answers</Button>
          </div>
        </CardFooter>
      )}

      <Timer
        timeLeft={timeLeft}
        setTimeLeft={setTimeLeft}
        isRunning={isRunning}
        mode={mode}
        isSubmitted={isSubmitted}
        onTimeUp={() => {
          setIsTimeUp(true);
          setIsReviewOpen(true);
        }}
        discussionId={discussion.id}
      />

      {isReviewOpen && discussion.author && ( 
        <ReviewDialog
          isOpen={isReviewOpen}
          setIsOpen={setIsReviewOpen}
          isTimeUp={isTimeUp}
          discussion={discussion}
          sharedAnswers={sharedAnswers}
          editingPoint={editingPoint}
          setEditingPoint={setEditingPoint}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          handleSaveEdit={handleSaveEdit}
          handleDelete={handleDelete}
          handleUndo={handleUndo}
          groupId={groupId}
          userId={discussion.author}
        />
      )}
    </Card>
  );
}

export default DiscussionGuide;