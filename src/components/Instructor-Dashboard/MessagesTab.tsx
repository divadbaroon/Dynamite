import React from 'react';
import GroupList from './GroupList';
import MessageDisplay from './MessageDisplay';
import { Message } from '@/types';

interface MessagesTabProps {
  groupedMessages: Record<string, Message[]>;
  groupMapping: Record<string, number>;
  selectedGroup: string | null;
  setSelectedGroup: (groupId: string | null) => void;
}

function MessagesTab({ 
  groupedMessages, 
  groupMapping, 
  selectedGroup, 
  setSelectedGroup 
}: MessagesTabProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Side - Group List */}
      <div className="col-span-4 space-y-4">
        <GroupList 
          groupedMessages={groupedMessages}
          groupMapping={groupMapping}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
        />
      </div>

      {/* Right Side - Message Display */}
      <div className="col-span-8">
        <MessageDisplay 
          selectedGroup={selectedGroup}
          groupedMessages={groupedMessages}
          groupMapping={groupMapping}
        />
      </div>
    </div>
  );
}

export default MessagesTab;