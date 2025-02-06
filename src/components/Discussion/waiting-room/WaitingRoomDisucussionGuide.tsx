import React from 'react';
import type { Discussion } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WaitingRoomGuideProps {
  discussion: Discussion | null;
  groupId: string;
}

export default function WaitingRoomGuide({ discussion, groupId }: WaitingRoomGuideProps) {
  if (!discussion) return null;

  return (
    <Card className="w-full h-[80vh] flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-2">
        <CardTitle className="text-2xl font-bold text-center">Discussion Guide</CardTitle>
        <Separator />
      </CardHeader>

      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          {/* Task Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Task</h3>
            <p className="text-sm text-gray-600">
              {discussion.task || 'No task provided'}
            </p>
          </section>

          {/* Scenario Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Scenario</h3>
            <p className="text-sm text-gray-600">
              {discussion.scenario || 'No scenario provided'}
            </p>
          </section>

          {/* Discussion Points Section */}
          <section>
            <h3 className="text-lg font-semibold mb-2">Discussion Points</h3>
            <div className="space-y-4">
              {discussion.discussion_points?.map((point, index) => (
                <div key={index} className="text-sm text-gray-600">
                  <div className="flex gap-2">
                    <span className="w-6">{index + 1}.</span>
                    <span>{point.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}