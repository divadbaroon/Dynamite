import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Trash2, Check } from "lucide-react"
import { ReviewDialogProps, BulletPoint, DiscussionPoint } from "@/types"
import { submitAnswers } from "@/lib/actions/answers"
import { toast } from "sonner"

export function ReviewDialog({
  isOpen,
  setIsOpen,
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
  userId
}: ReviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmitClick = async () => {
    if (!isTimeUp) {
      setShowConfirmDialog(true);
      return;
    }
    
    await submitAnswersToServer();
  };

  const submitAnswersToServer = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await submitAnswers(discussion.id, groupId, userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit answers');
      }
  
      setIsSubmitted(true);
  
      await toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1000)),
        {
          loading: 'Submitting your answers...',
          success: () => {
            window.location.href = `/feedback/${discussion.id}/${groupId}`;
            return 'Answers submitted successfully! You will be redirected to the feedback page shortly.';
          },
          error: 'Failed to submit answers',
        }
      );
    } catch (error) {
      console.log('Error submitting answers:', error);
      toast.error('Failed to submit answers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          if (!isTimeUp) {
            setIsOpen(open);
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
            {discussion.discussion_points.map((point: DiscussionPoint, index: number) => (
              <div key={index} className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-lg min-w-[24px]">{index + 1}.</span>
                  <div className="space-y-4 flex-1">
                    <h4 className="font-semibold text-lg">{point.content}</h4>
                    
                    {sharedAnswers[`point${index}`]?.length > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        {sharedAnswers[`point${index}`].map((point: string | BulletPoint, i: number) => (
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
                                  <p className={`text-sm ${typeof point === 'object' && point.isDeleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                    {typeof point === 'string' ? point : point.content}
                                  </p>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {typeof point === 'object' && point.isDeleted ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-blue-500 hover:text-blue-700"
                                        onClick={() => handleUndo(index, i)}
                                      >
                                        Undo
                                      </Button>
                                    ) : (
                                      <>
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
                                      </>
                                    )}
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
                  {index < discussion.discussion_points.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 mt-6">
            {!isTimeUp && (
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSubmitClick}
              className={`px-8 ${isSubmitted ? 'bg-green-500 hover:bg-green-600' : ''}`}
              disabled={isSubmitting || isSubmitted}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : isSubmitted ? (
                <Check className="h-5 w-5" />
              ) : (
                'Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Early?</AlertDialogTitle>
            <AlertDialogDescription>
              There is still time remaining in the discussion. Submitting now will end your group&apos;s conversation early. 
              Are you sure you want to submit your answers now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Discussion</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowConfirmDialog(false);
                submitAnswersToServer();
              }}
              className="bg-primary"
            >
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}