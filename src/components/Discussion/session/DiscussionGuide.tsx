"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { Session } from "@/types"
import { createClient } from "@/utils/supabase/client"

import { DiscussionGuideProps, Answers, SharedAnswers, SharedAnswersRow, BulletPoint } from "@/types"

function DiscussionGuide({ session, mode, groupId }: DiscussionGuideProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem('timeLeft');
    const savedTimestamp = localStorage.getItem('timerTimestamp');
    
    if (savedTime && savedTimestamp) {
      const elapsedTime = Math.floor((Date.now() - parseInt(savedTimestamp)) / 1000);
      const remainingTime = Math.max(0, parseInt(savedTime) - elapsedTime);
      return remainingTime;
    }
    return session?.time_left || 600;
  });
  
  const [isRunning, setIsRunning] = useState(session?.status === 'active')
  const [loading, setLoading] = useState(true)
  const [answers] = useState<Answers>(() => {
    const savedAnswers = localStorage.getItem('discussionAnswers');
    return savedAnswers ? JSON.parse(savedAnswers) : {};
  });
  const [sharedAnswers, setSharedAnswers] = useState<SharedAnswers>({});
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isTimeUp, setIsTimeUp] = useState(() => {
    const timeUpState = localStorage.getItem('isTimeUp') === 'true';
    if (timeUpState) {
      setTimeout(() => setIsReviewOpen(true), 0);
    }
    return timeUpState;
  });
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [editingPoint, setEditingPoint] = useState<{ index: number, bulletIndex: number } | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [deletedItems, setDeletedItems] = useState<{[key: string]: boolean[]}>({});

  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [pointTimeLeft, setPointTimeLeft] = useState(180); // 3 minutes in seconds
  const [openItem, setOpenItem] = useState<string | undefined>(`item-${currentPointIndex}`);

  const supabase = createClient();

  // Subscribe to session changes and update timer
  useEffect(() => {
    if (!session?.id) return;
  
    const fetchCurrentSession = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', session.id)
          .maybeSingle();
  
        console.log('Session data received:', data); 
  
        if (error) throw error;
        if (data) {
          if (!localStorage.getItem('timeLeft')) {
            setTimeLeft(data.time_left || 600);
          }
          setIsRunning(data.status === 'active');
          // Set current point from session data
          if (data.current_point !== undefined) {
            setCurrentPointIndex(data.current_point);
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCurrentSession();

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          const updatedSession = payload.new as Session;
          if (!localStorage.getItem('timeLeft')) {
            setTimeLeft(updatedSession.time_left || 600);
          }
          setIsRunning(updatedSession.status === 'active');
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.id]);

  // Subscribe to shared answers changes
  useEffect(() => {
    if (!session?.id || !groupId) return;

    const fetchSharedAnswers = async () => {
      const { data, error } = await supabase
        .from('shared_answers')
        .select('*')
        .eq('session_id', session.id)
        .eq('group_id', groupId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shared answers:', error);
      }
      if (data?.answers && typeof data.answers === 'object') {
        setSharedAnswers(data.answers as SharedAnswers);
      }
    };

    fetchSharedAnswers();

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
          const newAnswers = (payload.new as SharedAnswersRow)?.answers;
          if (newAnswers && typeof newAnswers === 'object') {
            setSharedAnswers(newAnswers);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [session?.id, groupId]);

  // Timer effect with persistence
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0 && mode === 'discussion') {
      console.log('Starting timer...');
      localStorage.setItem('timeLeft', timeLeft.toString());
      localStorage.setItem('timerTimestamp', Date.now().toString());
      
      timer = setInterval(() => {
        setTimeLeft((prevTime: number) => {
          const newTime = Math.max(0, prevTime - 1);
          
          localStorage.setItem('timeLeft', newTime.toString());
          localStorage.setItem('timerTimestamp', Date.now().toString());
          
          if (newTime === 0) {
            setIsTimeUp(true);
            localStorage.setItem('isTimeUp', 'true');
            setIsReviewOpen(true);
          }
          return newTime;
        });
      }, 1000);
    }
  
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRunning, mode, timeLeft, isSubmitted]);

  // Timer effect for individual discussion points
  useEffect(() => {
    if (!isRunning || mode !== 'discussion') return;
  
    let timer: NodeJS.Timeout;
    
    if (pointTimeLeft > 0) {
      timer = setInterval(async () => {
        setPointTimeLeft(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0) {
            if (currentPointIndex < session!.discussion_points.length - 1) {
              const nextPointIndex = currentPointIndex + 1;
              
              (async () => {
                try {
                  const { data, error } = await supabase 
                    .from('sessions')
                    .update({ 
                      current_point: nextPointIndex,
                    })
                    .eq('id', session!.id)
                    .select(); 
  
                  if (error) {
                    console.error('Error updating current point:', error);
                  } else {
                    console.log('Update response:', data);
                    setCurrentPointIndex(nextPointIndex);
                    setOpenItem(`item-${nextPointIndex}`);
                    setPointTimeLeft(180);
                  }
                } catch (error) {
                  console.error('Error in update operation:', error);
                }
              })();
            }
          }
          return newTime;
        });
      }, 1000);
    }
  
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, mode, pointTimeLeft, currentPointIndex, session?.id]);

  useEffect(() => {
    console.log('Current point index changed to:', currentPointIndex);
  }, [currentPointIndex]);

  useEffect(() => {
    localStorage.setItem('discussionAnswers', JSON.stringify(answers));
  }, [answers]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleReview = () => {
    setIsReviewOpen(true)
  }

  const handleDelete = async (pointIndex: number, bulletIndex: number) => {
    try {
      const updatedAnswers = { ...sharedAnswers };
      const key = `point${pointIndex}`;
      
      // Instead of filtering out the item, update its isDeleted flag
      if (typeof updatedAnswers[key][bulletIndex] === 'string') {
        // If the item is a string, convert it to a BulletPoint object
        updatedAnswers[key][bulletIndex] = {
          content: updatedAnswers[key][bulletIndex],
          isDeleted: true
        };
      } else {
        // If it's already a BulletPoint object, just update isDeleted
        updatedAnswers[key][bulletIndex] = {
          ...updatedAnswers[key][bulletIndex],
          isDeleted: true
        };
      }
  
      const { error } = await supabase
        .from('shared_answers')
        .upsert({
          session_id: session?.id,
          group_id: groupId,
          answers: updatedAnswers,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'session_id,group_id' 
        });
  
      if (error) throw error;
      
      // Update deleted items state for UI
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

  const handleSaveEdit = async (pointIndex: number, bulletIndex: number, newContent: string) => {
    try {
      const updatedAnswers = { ...sharedAnswers };
      const key = `point${pointIndex}`;
      
      // Convert to BulletPoint array if needed
      if (typeof updatedAnswers[key][bulletIndex] === 'string') {
        updatedAnswers[key] = updatedAnswers[key].map((content: string | BulletPoint) => 
          typeof content === 'string' ? { content, isDeleted: false } : content
        );
      }
      
      // Update the content while preserving isDeleted status
      updatedAnswers[key][bulletIndex] = {
        ...updatedAnswers[key][bulletIndex],
        content: newContent,
      };
  
      const { error } = await supabase
        .from('shared_answers')
        .upsert({
          session_id: session?.id,
          group_id: groupId,
          answers: updatedAnswers,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'session_id,group_id' 
        });
  
      if (error) throw error;
      setEditingPoint(null);
      toast.success('Bullet point updated');
    } catch (error) {
      console.error('Error updating bullet point:', error);
      toast.error('Failed to update bullet point');
    }
  };

  const handleSubmit = async () => {
    try {
      // Save answers to Supabase
      const { error } = await supabase
        .from('answers')  
        .insert([
          {
            session_id: session?.id,
            user_id: session?.author,
            answers: answers,
            submitted_at: new Date().toISOString()
          }
        ])
        .select();
  
      if (error) throw error;
  
      // Clear localStorage after successful submission
      localStorage.removeItem('timeLeft');
      localStorage.removeItem('timerTimestamp');
      localStorage.removeItem('isTimeUp');
      localStorage.removeItem('discussionAnswers');
      
      setIsSubmitted(true);
      setIsReviewOpen(false);
      
      await toast.promise(
        new Promise((resolve) => setTimeout(resolve, 3000)),
        {
          loading: 'Submitting your answers...',
          success: () => {
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
            return 'Answers submitted successfully! You will be exited from the conversation shortly.';
          },
          error: 'Failed to submit answers',
        }
      );
    } catch (error) {
      console.error('Error submitting answers:', error);
      toast.error("Failed to submit answers");
    }
  };

  if (!session) {
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

  const getTimerColor = (timeLeft: number) => {
    if (timeLeft > 120) return 'bg-green-500'; // First minute - green
    if (timeLeft > 60) return 'bg-yellow-500';  // Second minute - yellow
    return 'bg-red-500'; // Last minute - red
  };

  const renderAccordionContent = (point: string, index: number) => {
    if (mode === 'waiting-room') return null;
    if (mode === 'usage-check') {
      return (
        <div className="text-sm text-gray-600">
          This section will be available during the discussion.
        </div>
      );
    }
  
    const bulletPoints = sharedAnswers[`point${index}`] || [];
    const isCurrentPoint = index === currentPointIndex;
  
    return (
      <div className="space-y-4">
        {/* Bullet points section */}
        {bulletPoints.length > 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {bulletPoints
              .map((point, originalIndex) => ({ point, originalIndex }))
              .filter(({ point }) => {
                if (typeof point === 'string') return true;
                return !point.isDeleted;
              })
              .map(({ point, originalIndex: i }) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-gray-500 pt-1.5 -mt-1.5">•</span>
                  {editingPoint?.index === index && editingPoint?.bulletIndex === i ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(index, i, editedContent);
                          } else if (e.key === 'Escape') {
                            setEditingPoint(null);
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(index, i, editedContent)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPoint(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-start justify-between group">
                      <p className="text-sm text-gray-600">
                        {typeof point === 'string' ? point : point.content}
                      </p>
                      {isCurrentPoint && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingPoint({ index, bulletIndex: i });
                              setEditedContent(typeof point === 'string' ? point : point.content);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(index, i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              {/* Main text */}
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  AI Analysis in Progress
                </p>
                <p className="text-sm text-gray-600">
                  Your discussion is being analyzed in real-time.
                  Key points will appear here automatically as they're identified.
                </p>
              </div>

              {/* Loading indicator */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}

        {/* Timer section */}
        {isCurrentPoint && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Time Remaining</span>
              <span className={`text-lg font-bold ${pointTimeLeft <= 60 ? 'text-red-500' : ''}`}>
                {Math.floor(pointTimeLeft / 60)}:{(pointTimeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getTimerColor(pointTimeLeft)} transition-all duration-300`}
                style={{ 
                  width: `${(pointTimeLeft / 180) * 100}%`,
                  transition: 'width 1s linear'
                }}
              />
            </div>

            {/* Helper text */}
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>Discussion Point {currentPointIndex + 1} of {session!.discussion_points.length}</span>
              {pointTimeLeft <= 30 && (
                <span className="text-red-500 font-medium animate-pulse">
                  Wrapping up soon...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className={`w-full ${getCardHeight()} flex flex-col`}>
      <CardHeader className="flex-shrink-0 space-y-2">
        <CardTitle className="text-2xl font-bold text-center">
          Discussion Guide
        </CardTitle>
        <h3 className="font-semibold"></h3>
        <Separator />
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Task</h3>
            <p className="text-sm text-gray-600">
              {session.task}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Scenario</h3>
            <p className="text-sm text-gray-600">
              {session.scenario}
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Discussion Points</h3>
            <Accordion 
              type="single" 
              value={openItem}
              onValueChange={setOpenItem}
              className="w-full"
            >
              {session.discussion_points.map((point, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  disabled={index !== currentPointIndex}
                  className={index !== currentPointIndex ? 'opacity-50' : ''}
                >
                  <AccordionTrigger 
                    className={`
                      [&[data-state=open]]:text-primary 
                      text-left 
                      ${mode !== 'discussion' ? '[&>svg]:hidden' : ''}
                    `}
                    disabled={index !== currentPointIndex}
                  >
                    <div className="flex gap-2">
                      <span className="w-6">{index + 1}.</span>
                      <span>{point}</span>
                    </div>
                  </AccordionTrigger>
                  {index === currentPointIndex && (
                    <AccordionContent>
                      {renderAccordionContent(point, index)}
                    </AccordionContent>
                  )}
                </AccordionItem>
              ))}
            </Accordion>
          </section>
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

      {mode === 'discussion' && (
        <Dialog 
          open={isReviewOpen} 
          onOpenChange={(open) => {
            if (!isTimeUp) {
              setIsReviewOpen(open);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-4">
                {isTimeUp ? "Time's Up! Please Submit Your Answers" : "Review Your Answers"}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="pr-4 max-h-[60vh]">
              <div className="space-y-8">
                {session.discussion_points.map((point, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-lg min-w-[24px]">{index + 1}.</span>
                      <div className="space-y-4 flex-1">
                        <h4 className="font-semibold text-lg">{point}</h4>
                        
                        {/* Show shared bullet points in review */}
                        {sharedAnswers[`point${index}`]?.length > 0 ? (
                          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            {sharedAnswers[`point${index}`].map((point, i) => (
                              <div key={i} className="flex items-start gap-2 group">
                                <span className="text-gray-500 pt-1.5 -mt-1.5">•</span>
                                {editingPoint?.index === index && editingPoint?.bulletIndex === i ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <Input
                                      className="flex-1"
                                      value={editedContent}
                                      onChange={(e) => setEditedContent(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEdit(index, i, editedContent);
                                        } else if (e.key === 'Escape') {
                                          setEditingPoint(null);
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveEdit(index, i, editedContent)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingPoint(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex items-start justify-between group">
                                    <p className={`text-sm ${deletedItems[`point${index}`]?.[i] ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                      {typeof point === 'string' ? point : point.content}
                                    </p>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingPoint({ index, bulletIndex: i });
                                          setEditedContent(typeof point === 'string' ? point : point.content);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => handleDelete(index, i)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-6 rounded-lg text-center">                         
                            <p className="text-sm text-gray-600 mt-1">
                              Key points will be generated as your group discusses this topic.
                            </p>                           
                          </div>
                        )}
                      </div>
                    </div>
                    {index < session.discussion_points.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter className="gap-2 mt-6">
              {!isTimeUp && (
                <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSubmit} className="px-8">
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

export default DiscussionGuide;