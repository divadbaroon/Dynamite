import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from 'lucide-react';
import { Message } from '@/types';

interface MessageDisplayProps {
  selectedGroup: string | null;
  groupedMessages: Record<string, Message[]>;
  groupMapping: Record<string, number>;
}

function MessageDisplay({ 
  selectedGroup, 
  groupedMessages, 
  groupMapping 
}: MessageDisplayProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change or group selection changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [selectedGroup, groupedMessages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!selectedGroup) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a group to view messages</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold">
          Group {groupMapping[selectedGroup]} Messages
        </CardTitle>
      </CardHeader>
      <CardContent 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent'
        }}
      >
        {groupedMessages[selectedGroup]?.map((msg: Message) => (
          <div 
            key={msg.id} 
            className="p-4 rounded-lg bg-gray-50 border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <span className="font-medium">{msg.username}</span>
              <span className="text-sm text-gray-500">
                {formatTime(msg.created_at)}
              </span>
            </div>
            <p className="mt-2 text-gray-700">{msg.content}</p>
          </div>
        ))}
        <div ref={messageEndRef} />
      </CardContent>
    </Card>
  );
}

export default MessageDisplay;