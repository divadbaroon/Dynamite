"use client"

import { useState } from "react"
import { toast } from "sonner"
import { deleteAnswerPoint, saveAnswerEdit } from "@/lib/actions/discussion"
import { BulletPoint, EditingPoint, SharedAnswers } from "@/types"

interface UseAnswerManagementProps {
  discussionId: string | undefined
  groupId: string | undefined
  sharedAnswers: SharedAnswers
}

export function useAnswerManagement({ discussionId, groupId, sharedAnswers }: UseAnswerManagementProps) {
  const [editingPoint, setEditingPoint] = useState<EditingPoint | null>(null)
  const [editedContent, setEditedContent] = useState<string>("")

  const handleDelete = async (pointIndex: number, bulletIndex: number): Promise<void> => {
    if (!discussionId || !groupId) {
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
  
      const { error } = await deleteAnswerPoint(discussionId, groupId, updatedAnswers)
  
      if (error) throw error
      toast.success('Bullet point deleted')
    } catch (error) {
      console.error('Error deleting bullet point:', error)
      toast.error('Failed to delete bullet point')
    }
  }

  const handleSaveEdit = async (pointIndex: number, bulletIndex: number, newContent: string): Promise<void> => {
    if (!discussionId || !groupId) {
      toast.error("Missing discussion or group information")
      return
    }
  
    try {
      const updatedAnswers = { ...sharedAnswers }
      const key = `point${pointIndex}`
      
      // Make sure we preserve existing points array
      if (!updatedAnswers[key] || !Array.isArray(updatedAnswers[key])) {
        updatedAnswers[key] = []
      }
  
      // Adding a new point
      if (bulletIndex === updatedAnswers[key].length) {
        updatedAnswers[key] = [
          ...updatedAnswers[key],
          {
            content: newContent,
            isDeleted: false
          }
        ]
      } 
      // Editing existing point
      else {
        const currentPoints = [...updatedAnswers[key]]
        
        if (typeof currentPoints[bulletIndex] === 'string') {
          currentPoints[bulletIndex] = {
            content: currentPoints[bulletIndex] as string,
            isDeleted: false
          }
        }
        
        currentPoints[bulletIndex] = {
          ...(currentPoints[bulletIndex] as BulletPoint),
          content: newContent,
          isDeleted: false
        }
        
        updatedAnswers[key] = currentPoints
      }
  
      const { error } = await saveAnswerEdit(discussionId, groupId, updatedAnswers)
  
      if (error) throw error
      setEditingPoint(null)
      toast.success(bulletIndex === updatedAnswers[key].length - 1 ? 'New point added' : 'Bullet point updated')
    } catch (error) {
      console.error('Error updating bullet point:', error)
      toast.error('Failed to update bullet point')
    }
  }

  const handleUndo = async (pointIndex: number, bulletIndex: number) => {
    if (!discussionId || !groupId) {
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
  
      const { error } = await saveAnswerEdit(discussionId, groupId, updatedAnswers)
  
      if (error) throw error
      toast.success('Bullet point restored')
    } catch (error) {
      console.error('Error restoring bullet point:', error)
      toast.error('Failed to restore bullet point')
    }
  }

  return {
    editingPoint,
    editedContent,
    setEditingPoint,
    setEditedContent,
    handleDelete,
    handleSaveEdit,
    handleUndo
  }
}