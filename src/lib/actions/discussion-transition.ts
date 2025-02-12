"use client"

import { toast } from "sonner";
import { updateHasLaunched, updateDiscussionPointTimestamps } from "@/lib/actions/discussion";

import { UseDiscussionTransitionProps } from "@/types"

export async function handleDiscussionTransition({
  discussionId,
  groupId,
  onTransitionStart,
  onTransitionError,
  navigate
}: UseDiscussionTransitionProps) {
  try {
    onTransitionStart();
    
    const { error: launchError } = await updateHasLaunched(discussionId);
    if (launchError) {
      console.log("Error updating has_launched:", launchError);
    }

    const { error: timestampError } = await updateDiscussionPointTimestamps(discussionId);
    if (timestampError) {
      console.log("Error updating point timestamps:", timestampError);
    }

    toast.success("Discussion is starting!");
    navigate(`/discussion/join/${discussionId}/${groupId}`);
  } catch (error) {
    console.log("Error during transition:", error);
    onTransitionError();
    toast.error("Failed to join discussion");
  }
}