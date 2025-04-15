"use client"

import { useCallback, useMemo, memo } from "react"
import type { FC } from 'react'
import { Timer } from "./components/Timer"
import { ReviewDialog } from "./components/ReviewDialog"
import { DiscussionPoints } from "./components/DiscussionPoints"
import { HeaderContent } from "./components/HeaderContent"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CARD_HEIGHTS } from './components/constants'
import { Header } from './components/Header'
import { FooterContent } from './components/FooterContent'

import { useTimer } from "@/lib/hooks/timer"
import { useAnswerManagement } from "@/lib/hooks/useAnswerManagement"
import { useReviewDialog } from "@/lib/hooks/useReviewDialog"
import { DiscussionGuideProps } from "@/types"

const DiscussionGuide: FC<DiscussionGuideProps> = ({ 
  discussion, 
  mode, 
  groupId,
  sharedAnswers,
  currentPointIndex,
  isRunning,
  openItem,
  isTimeUp,
  setCurrentPointIndex,
  setIsTimeUp
}) => {
  const handleTimeUp = useCallback(() => {
    requestAnimationFrame(() => {
      setIsTimeUp(true);
    });
  }, [setIsTimeUp]);

  const { 
    timeLeft, 
    setTimeLeft, 
    formatTime 
  } = useTimer({ 
    discussion, 
    mode, 
    isRunning,
    onTimeUp: handleTimeUp
  });

  const {
    editingPoint,
    editedContent,
    setEditingPoint,
    setEditedContent,
    handleDelete,
    handleSaveEdit,
    handleUndo
  } = useAnswerManagement({
    discussionId: discussion?.id,
    groupId,
    sharedAnswers
  });

  const {
    isReviewOpen,
    setIsReviewOpen,
    handleReview
  } = useReviewDialog({ isTimeUp });

  const discussionPointsProps = useMemo(() => 
    discussion ? {
      discussion,
      mode,
      currentPointIndex,
      setCurrentPointIndex,
      openItem,
      sharedAnswers,
      editingPoint,
      setEditingPoint,
      editedContent,
      setEditedContent,
      handleSaveEdit,
      handleDelete,
      handleUndo,
      isRunning
    } : null
  , [
    discussion,
    mode,
    currentPointIndex,
    setCurrentPointIndex,
    openItem,
    sharedAnswers,
    editingPoint,
    setEditingPoint,
    editedContent,
    setEditedContent,
    handleSaveEdit,
    handleDelete,
    handleUndo,
    isRunning
  ]);

  const timerProps = useMemo(() => 
    discussion ? {
      timeLeft,
      setTimeLeft,
      isRunning,
      mode,
      isSubmitted: false,
      onTimeUp: handleTimeUp,
      discussionId: discussion.id
    } : null
  , [
    discussion,
    timeLeft,
    setTimeLeft,
    isRunning,
    mode,
    handleTimeUp
  ]);

  const reviewDialogProps = useMemo(() => 
    discussion?.author ? {
      isOpen: isReviewOpen,
      setIsOpen: setIsReviewOpen,
      isTimeUp,
      discussion,
      sharedAnswers,
      editingPoint,
      setEditingPoint,
      editedContent,
      setEditedContent,
      handleSaveEdit,
      handleDelete,
      handleUndo,
      groupId,
      userId: discussion.author
    } : null
  , [
    discussion,
    isReviewOpen,
    setIsReviewOpen,
    isTimeUp,
    sharedAnswers,
    editingPoint,
    setEditingPoint,
    editedContent,
    setEditedContent,
    handleSaveEdit,
    handleDelete,
    handleUndo,
    groupId
  ]);

  if (!discussion) return null;
  if (!groupId) return <div>Missing group ID</div>;
  if (!discussionPointsProps || !timerProps) return null;

  const cardHeight = CARD_HEIGHTS[mode as keyof typeof CARD_HEIGHTS] || CARD_HEIGHTS['waiting-room'];

  return (
    <Card className={`w-full ${cardHeight} flex flex-col`}>
      <Header />

      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <HeaderContent 
            task={discussion.task}
            scenario={discussion.scenario}
          />
          <DiscussionPoints {...discussionPointsProps} />
        </ScrollArea>
      </CardContent>

      {mode === 'discussion' && (
        <CardFooter className="flex-shrink-0 border-t pt-4">
          <FooterContent 
            timeLeft={timeLeft}
            formatTime={formatTime}
            handleReview={handleReview}
          />
        </CardFooter>
      )}

      <Timer {...timerProps} />

      {isReviewOpen && discussion.author && reviewDialogProps && (
        <ReviewDialog {...reviewDialogProps} />
      )}
    </Card>
  );
};

export default DiscussionGuide;