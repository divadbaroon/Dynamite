import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import PointTimerDisplay from './PointTimerDisplay'

import { updateCurrentPoint } from '@/lib/actions/discussion'
import { DiscussionPointsProps, DiscussionPoint } from "@/types"

export function DiscussionPoints({
  discussion,
  mode,
  currentPointIndex,
  openItem,
  sharedAnswers,
  editingPoint,
  setEditingPoint,
  editedContent,
  setEditedContent,
  handleSaveEdit,
  handleDelete,
  handleUndo,
  isRunning,
  setCurrentPointIndex
}: DiscussionPointsProps) {
  const handlePointTimeUp = async () => {
    if (currentPointIndex < discussion.discussion_points.length - 1) {
      const nextPointIndex = currentPointIndex + 1;
      
      try {
        const { error } = await updateCurrentPoint(discussion.id, nextPointIndex);
        
        if (error) {
          console.log('Error updating current point:', error);
          return;
        }
        
        // Just update currentPointIndex - openItem will be derived automatically
        setCurrentPointIndex(nextPointIndex);
      } catch (error) {
        console.log('Error in update operation:', error);
      }
    }
  };

  const renderAccordionContent = (index: number) => {
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
        {bulletPoints.length > 0 && index === currentPointIndex ? ( 
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {bulletPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
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
                  <div className="flex-1 flex items-start justify-between gap-8">
                    <p className={`text-sm ${typeof point === 'object' && point.isDeleted ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                      {typeof point === 'string' ? point : point.content}
                    </p>
                    {isCurrentPoint && (
                      <div className="flex gap-2">
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
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Your discussion is being analyzed in real-time.
                  Bullet points will be generated as your speak.
                </p>
              </div>
            </div>
          </div>
        )}

        {isCurrentPoint && (
          <>
            <PointTimerDisplay 
              discussion={discussion}
              discussionPoint={discussion.discussion_points[currentPointIndex]}
              currentPointIndex={currentPointIndex}
              totalPoints={discussion.discussion_points.length}
              isRunning={isRunning}
              onTimeUp={handlePointTimeUp}
            />
          </>
        )}
      </div>
    );
  };
  
  return (
    <section>
      <h3 className="text-lg font-semibold mb-2">Discussion Points</h3>
      <Accordion 
        type="single" 
        value={openItem}
        onValueChange={(value) => {
          if (value) {
            const index = parseInt(value.replace('item-', ''));
            if (!isNaN(index)) {
              setCurrentPointIndex(index);
            }
          }
        }}
        defaultValue={`item-${currentPointIndex}`} 
        className="w-full"
      >
        {discussion.discussion_points.map((point: DiscussionPoint, index: number) => (
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
                <span>{point.content}</span>
              </div>
            </AccordionTrigger>
            {index === currentPointIndex && (
              <AccordionContent>
                {renderAccordionContent(index)}
              </AccordionContent>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}