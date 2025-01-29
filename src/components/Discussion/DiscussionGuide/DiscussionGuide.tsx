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
  
  const [ isSubmitted ] = useState(false)

  const [editingPoint, setEditingPoint] = useState<{ index: number, bulletIndex: number } | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const [currentPointIndex, setCurrentPointIndex] = useState(0);

  const [pointTimeLeft, setPointTimeLeft] = useState(() => {
    const savedPointTime = localStorage.getItem(`${discussion?.id}-pointTimeLeft`);
    const savedPointTimestamp = localStorage.getItem(`${discussion?.id}-pointTimerTimestamp`);
    
    if (savedPointTime && savedPointTimestamp) {
      const elapsedTime = Math.floor((Date.now() - parseInt(savedPointTimestamp)) / 1000);
      const remainingTime = Math.max(0, parseInt(savedPointTime) - elapsedTime);
      
      if (remainingTime === 0) {
        localStorage.removeItem(`${discussion?.id}-pointTimeLeft`);
        localStorage.removeItem(`${discussion?.id}-pointTimerTimestamp`);
        return 0;
      }
      
      return remainingTime;
    }
    
    const totalTimeInSeconds = discussion?.time_left || 600;
    const numberOfPoints = discussion?.discussion_points?.length || 1;
    return Math.ceil(totalTimeInSeconds / numberOfPoints); 
  });
  

  const [openItem, setOpenItem] = useState<string | undefined>(`item-${currentPointIndex}`);

  const [currentPointDuration, setCurrentPointDuration] = useState(() => {
    const totalTimeInSeconds = discussion?.time_left || 600
    const numberOfPoints = discussion?.discussion_points?.length || 1
    return Math.ceil(totalTimeInSeconds / numberOfPoints)
  })

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
  
        if (currentDiscussion.current_point !== undefined) {
          setCurrentPointIndex(currentDiscussion.current_point);
          
          const savedPointTime = localStorage.getItem(`${discussion?.id}-pointTimeLeft`);
          const savedPointTimestamp = localStorage.getItem(`${discussion?.id}-pointTimerTimestamp`);
          
          if (savedPointTime && savedPointTimestamp) {
            const elapsedTime = Math.floor((Date.now() - parseInt(savedPointTimestamp)) / 1000);
            const remainingTime = Math.max(0, parseInt(savedPointTime) - elapsedTime);
            setPointTimeLeft(remainingTime);
          } else {
            const totalTimeInSeconds = currentDiscussion.time_left || 600;
            const numberOfPoints = currentDiscussion.discussion_points?.length || 1;
            const pointTime = Math.ceil(totalTimeInSeconds / numberOfPoints);
            
            setPointTimeLeft(pointTime);
            localStorage.setItem(`${discussion?.id}-pointTimeLeft`, pointTime.toString());
            localStorage.setItem(`${discussion?.id}-pointTimerTimestamp`, Date.now().toString());
          }
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
        console.log('Error fetching shared answers:', error);
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
      
      toast.success('Bullet point deleted');
    } catch (error) {
      console.log('Error deleting bullet point:', error);
      toast.error('Failed to delete bullet point');
    }
  };

  useEffect(() => {
    // Create stable references to the values we need
    const discussionId = discussion?.id;
    const totalPoints = discussion?.discussion_points?.length ?? 0;
    
    if (!isRunning || mode !== 'discussion' || !discussionId) return;
  
    localStorage.setItem(`${discussionId}-pointTimeLeft`, pointTimeLeft.toString());
    localStorage.setItem(`${discussionId}-pointTimerTimestamp`, Date.now().toString());
  
    const timer = setInterval(async () => {
      if (pointTimeLeft <= 1) {
        if (currentPointIndex < totalPoints - 1) {
          const nextPointIndex = currentPointIndex + 1;
          
          try {
            const { error } = await updateCurrentPoint(discussionId, nextPointIndex);
            
            if (!error) {
              const totalTimeInSeconds = timeLeft;
              const remainingPoints = totalPoints - nextPointIndex;
              const newPointTime = Math.ceil(totalTimeInSeconds / remainingPoints);
  
              setCurrentPointIndex(nextPointIndex);
              setOpenItem(`item-${nextPointIndex}`);
              setPointTimeLeft(newPointTime);
              setCurrentPointDuration(newPointTime);
              
              localStorage.setItem(`${discussionId}-pointTimeLeft`, newPointTime.toString());
              localStorage.setItem(`${discussionId}-pointTimerTimestamp`, Date.now().toString());
            } else {
              console.error('Error updating current point:', error);
            }
          } catch (error) {
            console.error('Error in update operation:', error);
          }
        }
      } else {
        setPointTimeLeft(prev => Math.max(0, prev - 1));
      }
    }, 1000);
  
    return () => clearInterval(timer);
  }, [
    isRunning,
    mode,
    pointTimeLeft,
    currentPointIndex,
    discussion?.id,
    discussion?.discussion_points?.length 
  ]);

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
            timeLeft={timeLeft}
            currentPointDuration={currentPointDuration}
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