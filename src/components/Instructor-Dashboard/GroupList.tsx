import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from 'lucide-react';
import { Message } from '@/types';

interface GroupListProps {
  groupedMessages: Record<string, Message[]>;
  groupMapping: Record<string, number>;
  selectedGroup: string | null;
  setSelectedGroup: (groupId: string | null) => void;
}

function GroupList({ 
  groupedMessages, 
  groupMapping, 
  selectedGroup, 
  setSelectedGroup 
}: GroupListProps) {
  return (
    <>
      {Object.entries(groupedMessages).map(([groupId, msgs]: [string, Message[]]) => (
        <Card 
          key={groupId}
          className={`cursor-pointer transition-all ${
            selectedGroup === groupId ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
          }`}
          onClick={() => setSelectedGroup(selectedGroup === groupId ? null : groupId)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageCircle 
                className={`h-5 w-5 ${
                  selectedGroup === groupId ? 'text-blue-500' : 'text-gray-500'
                }`} 
              />
              <div>
                <h3 className="font-semibold">
                  Group {groupMapping[groupId] || '...'}
                </h3>
                <p className="text-sm text-gray-500">{msgs.length} messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default GroupList;