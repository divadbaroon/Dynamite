import { useState } from "react"
import type { FC } from 'react'
import { Timer } from "./components/Timer"
import { ReviewDialog } from "./components/ReviewDialog"
import { DiscussionPoints } from "./components/DiscussionPoints"
import { HeaderContent } from "./components/HeaderContent"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import { deleteAnswerPoint, saveAnswerEdit } from "@/lib/actions/discussion"
import { useTimer } from "@/lib/hooks/timer"

import { BulletPoint, DiscussionGuideProps, EditingPoint } from "@/types"

const DiscussionGuide: FC<DiscussionGuideProps> = ({ 
  discussion, 
  mode, 
  groupId,
  sharedAnswers,
  currentPointIndex,
  isRunning,
  openItem,
  setCurrentPointIndex,
  setOpenItem
}) => {
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false)
  const [isSubmitted] = useState<boolean>(false)
  const [editingPoint, setEditingPoint] = useState<EditingPoint | null>(null)
  const [editedContent, setEditedContent] = useState<string>("")
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false)
  const [ loading ] = useState<boolean>(false)

  const { 
    timeLeft, 
    setTimeLeft, 
    formatTime 
  } = useTimer({ 
    discussion, 
    mode, 
    isRunning,
    onTimeUp: () => {
      setIsTimeUp(true)
      setIsReviewOpen(true)
    }
  })

  const handleReview = (): void => {
    setIsReviewOpen(true)
  }

  const handleDelete = async (pointIndex: number, bulletIndex: number): Promise<void> => {
    if (!discussion?.id || !groupId) {
      toast.error("Missing discussion or group information")
      return
    }
    try {
      const updatedAnswers = { ...sharedAnswers }
      const key = `point${pointIndex}`
      
      if (typeof updatedAnswers[key][bulletIndex] === 'string') {
        updatedAnswers[key][bulletIndex] = {
          content: updatedAnswers[key][bulletIndex] as string,
          isDeleted: true
        }
      } else {
        updatedAnswers[key][bulletIndex] = {
          ...updatedAnswers[key][bulletIndex] as BulletPoint,
          isDeleted: true
        }
      }
  
      const { error } = await deleteAnswerPoint(discussion.id, groupId, pointIndex, bulletIndex, updatedAnswers)
  
      if (error) throw error
      toast.success('Bullet point deleted')
    } catch (error) {
      console.error('Error deleting bullet point:', error)
      toast.error('Failed to delete bullet point')
    }
  }

  const handleSaveEdit = async (pointIndex: number, bulletIndex: number, newContent: string): Promise<void> => {
    if (!discussion?.id || !groupId) {
      toast.error("Missing discussion or group information")
      return
    }

    try {
      const updatedAnswers = { ...sharedAnswers }
      const key = `point${pointIndex}`
      
      if (typeof updatedAnswers[key][bulletIndex] === 'string') {
        updatedAnswers[key] = updatedAnswers[key].map((content): BulletPoint => 
          typeof content === 'string' ? { content, isDeleted: false } : content
        )
      }
      
      updatedAnswers[key][bulletIndex] = {
        ...updatedAnswers[key][bulletIndex] as BulletPoint,
        content: newContent,
      }
  
      const { error } = await saveAnswerEdit(discussion.id, groupId, updatedAnswers)
  
      if (error) throw error
      setEditingPoint(null)
      toast.success('Bullet point updated')
    } catch (error) {
      console.error('Error updating bullet point:', error)
      toast.error('Failed to update bullet point')
    }
  }

  const handleUndo = async (pointIndex: number, bulletIndex: number) => {
    if (!discussion?.id || !groupId) {
      toast.error("Missing discussion or group information")
      return
    }
  
    try {
      const updatedAnswers = { ...sharedAnswers }
      const key = `point${pointIndex}`
      
      if (typeof updatedAnswers[key][bulletIndex] === 'object') {
        updatedAnswers[key][bulletIndex] = {
          ...updatedAnswers[key][bulletIndex],
          isDeleted: false
        }
      }
  
      const { error } = await saveAnswerEdit(discussion.id, groupId, updatedAnswers)
  
      if (error) throw error
      toast.success('Bullet point restored')
    } catch (error) {
      console.log('Error restoring bullet point:', error)
      toast.error('Failed to restore bullet point')
    }
  }

  if (!discussion) return null

  const getCardHeight = () => {
    switch (mode) {
      case 'discussion':
        return 'h-[90vh]'
      case 'waiting-room':
        return 'h-[80vh]'
      default:
        return 'h-[80vh]'
    }
  }

  if (loading) {
    return (
      <Card className={`w-full ${getCardHeight()} flex flex-col items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </Card>
    )
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
          setIsTimeUp(true)
          setIsReviewOpen(true)
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
  )
}

export default DiscussionGuide