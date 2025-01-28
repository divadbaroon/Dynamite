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
import { DiscussionGuideProps, Answers, SharedAnswers, BulletPoint } from "@/types"

import { 
  getDiscussionById,
  fetchSharedAnswers,
  deleteAnswerPoint,
  saveAnswerEdit,
  submitAnswers,
  updateCurrentPoint
} from '@/lib/actions/discussion'

function DiscussionGuide({ discussion, mode, groupId }: DiscussionGuideProps) {
  // State declarations remain the same
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem(`${discussion?.id}-timeLeft`);
    const savedTimestamp = localStorage.getItem(`${discussion?.id}-timerTimestamp`);
    
    if (savedTime && savedTimestamp) {
      const elapsedTime = Math.floor((Date.now() - parseInt(savedTimestamp)) / 1000);
      const remainingTime = Math.max(0, parseInt(savedTime) - elapsedTime);
      return remainingTime;
    }
    return discussion?.time_left || 600;
  });
  
  const [isRunning, setIsRunning] = useState(discussion?.status === 'active')
  const [loading, setLoading] = useState(true)
  const [answers] = useState<Answers>(() => {
    const savedAnswers = localStorage.getItem(`${discussion?.id}-discussionAnswers`);
    return savedAnswers ? JSON.parse(savedAnswers) : {};
  });
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswers>({});
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  const [isTimeUp, setIsTimeUp] = useState(() => {
    return localStorage.getItem(`${discussion?.id}-isTimeUp`) === 'true';
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [editingPoint, setEditingPoint] = useState<{ index: number, bulletIndex: number } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [deletedItems, setDeletedItems] = useState<{[key: string]: boolean[]}>({});
  console.log(deletedItems)

  const [currentPointIndex, setCurrentPointIndex] = useState(0);

  const [pointTimeLeft, setPointTimeLeft] = useState(() => {
    const savedPointTime = localStorage.getItem(`${discussion?.id}-pointTimeLeft`);
    const savedPointTimestamp = localStorage.getItem(`${discussion?.id}-pointTimerTimestamp`);
    
    if (savedPointTime && savedPointTimestamp) {
      const elapsedTime = Math.floor((Date.now() - parseInt(savedPointTimestamp)) / 1000);
      const remainingTime = Math.max(0, parseInt(savedPointTime) - elapsedTime);
      
      // If the timer ran out, set to zero
      if (remainingTime === 0) {
        localStorage.removeItem(`${discussion?.id}-pointTimeLeft`);
        localStorage.removeItem(`${discussion?.id}-pointTimerTimestamp`);
        return 0;
      }
      
      return remainingTime;
    }
    
    // Calculate point time based on total time and number of points
    const totalTimeInSeconds = discussion?.time_left || 600; // 10 minutes default
    const numberOfPoints = discussion?.discussion_points?.length || 1;
    return Math.floor(totalTimeInSeconds / numberOfPoints);
  });
  

  const [openItem, setOpenItem] = useState<string | undefined>(`item-${currentPointIndex}`);

  const supabase = createClient();

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
        if (error) throw error;
  
        if (currentDiscussion) {
          // For the main timer
          if (!localStorage.getItem(`${discussion?.id}-timeLeft`)) {
            setTimeLeft(currentDiscussion.time_left || 600);
          }
          setIsRunning(currentDiscussion.status === 'active');
  
          // For the point timer - check both localStorage and server state
          if (currentDiscussion.current_point !== undefined) {
            setCurrentPointIndex(currentDiscussion.current_point);
            
            // If we have saved point time, use it
            const savedPointTime = localStorage.getItem(`${discussion?.id}-pointTimeLeft`);
            const savedPointTimestamp = localStorage.getItem(`${discussion?.id}-pointTimerTimestamp`);
            
            if (savedPointTime && savedPointTimestamp) {
              const elapsedTime = Math.floor((Date.now() - parseInt(savedPointTimestamp)) / 1000);
              const remainingTime = Math.max(0, parseInt(savedPointTime) - elapsedTime);
              setPointTimeLeft(remainingTime);
            } else {
              // If no saved time, start fresh at 180
              setPointTimeLeft(180);
              localStorage.setItem(`${discussion?.id}-pointTimeLeft`, '180');
              localStorage.setItem(`${discussion?.id}-pointTimerTimestamp`, Date.now().toString());
            }
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
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
          const updatedDiscusison = payload.new as Discussion;
          if (!localStorage.getItem(`${discussion?.id}-timeLeft`)) {
            setTimeLeft(updatedDiscusison.time_left || 600);
          }
          setIsRunning(updatedDiscusison.status === 'active');
        }
      )
      .subscribe();
  
    return () => {
      channel.unsubscribe();
    };
  }, [discussion?.id]);

  // Fetch shared answers effect
  useEffect(() => {
    if (!discussion?.id || !groupId) return;

    const getSharedAnswers = async () => {
      const { data, error } = await fetchSharedAnswers(discussion.id, groupId);
      
      if (error) {
        console.error('Error fetching shared answers:', error);
      }
      if (data?.answers && typeof data.answers === 'object') {
        setSharedAnswers(data.answers as SharedAnswers);
      }
    };

    getSharedAnswers();

    // Keep realtime subscription
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

  // Save answers to localStorage effect
  useEffect(() => {
    localStorage.setItem(`${discussion?.id}-discussionAnswers`, JSON.stringify(answers));
  }, [answers]);

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
      
      setDeletedItems(prev => ({
        ...prev,
        [`point${pointIndex}`]: [
          ...(prev[`point${pointIndex}`] || Array(sharedAnswers[`point${pointIndex}`]?.length || 0).fill(false)),
          true
        ]
      }));
      
      toast.success('Bullet point deleted');
    } catch (error) {
      console.error('Error deleting bullet point:', error);
      toast.error('Failed to delete bullet point');
    }
  };

  useEffect(() => {
    if (!isRunning || mode !== 'discussion' || !discussion?.id) return;
  
    localStorage.setItem(`${discussion?.id}-pointTimeLeft`, pointTimeLeft.toString());
    localStorage.setItem(`${discussion?.id}-pointTimerTimestamp`, Date.now().toString());
  
    const timer = setInterval(async () => {
      // First, update the time
      setPointTimeLeft(prev => Math.max(0, prev - 1));
  
      // Then, check if we need to move to the next point
      if (pointTimeLeft === 1) { // Check at 1 instead of 0 to avoid race condition
        if (currentPointIndex < discussion.discussion_points.length - 1) {
          const nextPointIndex = currentPointIndex + 1;
          
          try {
            const { error } = await updateCurrentPoint(discussion.id, nextPointIndex);
            if (!error) {
              // Calculate point time based on total time and number of points
              const totalTimeInSeconds = timeLeft; // Use remaining total time
              const remainingPoints = discussion.discussion_points.length - nextPointIndex;
              const newPointTime = Math.floor(totalTimeInSeconds / remainingPoints);
              
              // Update these in a separate effect trigger
              setTimeout(() => {
                setCurrentPointIndex(nextPointIndex);
                setOpenItem(`item-${nextPointIndex}`);
                setPointTimeLeft(newPointTime);
                localStorage.setItem(`${discussion?.id}-pointTimeLeft`, newPointTime.toString());
                localStorage.setItem(`${discussion?.id}-pointTimerTimestamp`, Date.now().toString());
              }, 0);
            } else {
              console.error('Error updating current point:', error);
            }
          } catch (error) {
            console.error('Error in update operation:', error);
          }
        }
      }
    }, 1000);
  
    return () => clearInterval(timer);
  }, [isRunning, mode, pointTimeLeft, currentPointIndex, discussion?.id, discussion?.discussion_points.length, timeLeft]);

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
      console.error('Error updating bullet point:', error);
      toast.error('Failed to update bullet point');
    }
  };

  const handleSubmit = async () => {
    if (!discussion?.id || !discussion?.author || !groupId) {
      toast.error("Missing discussion or group information");
      return;
    }
  
    try {
      // Transform answers to SharedAnswers format
      const transformedAnswers: SharedAnswers = Object.entries(answers).reduce((acc, [key, value]) => {
        acc[key] = [{ content: value, isDeleted: false }];
        return acc;
      }, {} as SharedAnswers);
  
      const { error } = await submitAnswers(discussion.id, discussion.author, transformedAnswers);
  
      if (error) throw error;
  
      localStorage.removeItem(`${discussion?.id}-timeLeft`);
      localStorage.removeItem(`${discussion?.id}-timerTimestamp`);
      localStorage.removeItem(`${discussion?.id}-isTimeUp`);
      localStorage.removeItem(`${discussion?.id}-discussionAnswers`);
      localStorage.removeItem(`${discussion?.id}-pointTimeLeft`);        
      localStorage.removeItem(`${discussion?.id}-pointTimerTimestamp`);  
      
      setIsSubmitted(true);
      setIsReviewOpen(false);
      
      await toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1000)),
        {
          loading: 'Submitting your answers...',
          success: () => {
            window.location.href = '/feedback';
            return 'Answers submitted successfully! You will be redirected to the feedback page shortly.';
          },
          error: 'Failed to submit answers',
        }
      );
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error("Failed to submit answers");
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
      console.error('Error restoring bullet point:', error);
      toast.error('Failed to restore bullet point');
    }
  };

  // Rendering logic remains the same
  if (!discussion) {
    return null;
  }

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
        <CardTitle className="text-2xl font-bold text-center">
          Discussion Guide
        </CardTitle>
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
            pointTimeLeft={pointTimeLeft}
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
        handleSubmit={handleSubmit}
        handleUndo={handleUndo}
      />
    </Card>
  );
}

export default DiscussionGuide;