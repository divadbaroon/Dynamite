"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { DiscussionGuideProps } from '@/types'

function DiscussionGuide({ session, groupId }: DiscussionGuideProps) {
  const [timeLeft, setTimeLeft] = useState(session?.time_left || 600)
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [pointTimeLeft, setPointTimeLeft] = useState(180) // hardcoded at 3 minutes per point for now
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [openItem, setOpenItem] = useState<string>(`item-${currentPointIndex}`)

  // Main timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime: number) => {
          const newTime = Math.max(0, prevTime - 1);
          if (newTime === 0) {
            setIsTimeUp(true);
            setIsReviewOpen(true);
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // Point timer effect
  useEffect(() => {
    
    if (pointTimeLeft > 0) {
      const timer = setInterval(() => {
        setPointTimeLeft((prev: number) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0 && currentPointIndex < session!.discussion_points.length - 1) {
            const nextPointIndex = currentPointIndex + 1;
            setCurrentPointIndex(nextPointIndex);
            setOpenItem(`item-${nextPointIndex}`);
            return 180; // Reset timer for next point
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [pointTimeLeft, currentPointIndex, session?.discussion_points.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = (timeLeft: number) => {
    if (timeLeft > 120) return 'bg-green-500';
    if (timeLeft > 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleReview = () => {
    setIsReviewOpen(true)
  }

  const handleSubmit = async () => {
    toast.success("Answers submitted successfully!")
    setIsReviewOpen(false)
  }

  if (!session) return null

  return (
    <Card className="w-full h-[90vh] flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-2">
        <CardTitle className="text-2xl text-center">
          Discussion Guide
        </CardTitle>
        <Separator />
      </CardHeader>

      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Task</h3>
            <p className="text-gray-600">{session.task}</p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Scenario</h3>
            <p className="text-gray-600">{session.scenario}</p>
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
                  <AccordionTrigger className="text-left">
                    <div className="flex gap-2">
                      <span className="w-6">{index + 1}.</span>
                      <span>{point}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {/* Point Timer */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Time for this point</span>
                          <span className={`text-lg font-bold ${pointTimeLeft <= 60 ? 'text-red-500' : ''}`}>
                            {formatTime(pointTimeLeft)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getTimerColor(pointTimeLeft)} transition-all duration-300`}
                            style={{ width: `${(pointTimeLeft / 180) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Discussion Area */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">
                          {pointTimeLeft <= 30 ? (
                            <p className="text-red-500 animate-pulse">Wrap up your discussion...</p>
                          ) : (
                            "Discussion in progress..."
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-shrink-0 border-t pt-4">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <p className="text-lg font-semibold">
              Time Left: {formatTime(timeLeft)}
            </p>
            {timeLeft <= 60 && (
              <span className="text-red-500 animate-pulse text-sm font-medium">
                Session ending soon...
              </span>
            )}
          </div>
          <Button onClick={handleReview}>
            Review Answers
          </Button>
        </div>
      </CardFooter>

      <Dialog 
        open={isReviewOpen} 
        onOpenChange={(open) => {
          if (!isTimeUp) setIsReviewOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {isTimeUp ? "Time's Up! Please Submit Your Answers" : "Review Your Answers"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="pr-4 max-h-[60vh]">
            <div className="space-y-8">
              {session.discussion_points.map((point, index) => (
                <div key={index} className="space-y-4">
                  <h4 className="font-semibold text-lg">{point}</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600">Discussion summary will appear here...</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            {!isTimeUp && (
              <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
                Continue Discussion
              </Button>
            )}
            <Button onClick={handleSubmit} className="px-8">
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default DiscussionGuide