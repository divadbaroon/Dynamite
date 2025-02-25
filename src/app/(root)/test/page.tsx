"use client"

import React, { useState, ChangeEvent } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { generateUsername } from 'unique-username-generator';

interface Message {
  id: string;
  group_id: string;
  session_id: string;
  sender_id: string;
  created_time: string;
  content: string;
}

interface ProcessedMessage {
  id: string;
  group_id: string;
  session_id: string;
  username: string;
  user_id: string;  
  created_time: string;
  content: string;
}

interface SessionInfo {
  session_id: string;
  session_start_time: string;
  groups: {
    [key: string]: ProcessedMessage[];
  };
}

interface UserInfo {
  username: string;
  userId: string;
}

function formatUsername(username: string): string {
  const words = username.split(/(?=[A-Z]|\d)/);
  if (words.length >= 2) {
    return words[0].toLowerCase() + words[1].charAt(0).toUpperCase() + words[1].slice(1).toLowerCase();
  }
  return username;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Page() {
  const [processedData, setProcessedData] = useState<SessionInfo | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [userMap, setUserMap] = useState<Map<string, UserInfo>>(new Map());
  const [groupMap, setGroupMap] = useState<Map<string, string>>(new Map());

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      const text = e.target?.result;
      if (typeof text !== 'string') return;
      
      Papa.parse<Message>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Create new maps while preserving existing mappings
          const newUserMap = new Map(userMap);
          const newGroupMap = new Map(groupMap);
          
          // Get unique group_ids and assign sequential numbers starting at 1
          const uniqueGroups = Array.from(new Set(results.data.map(msg => msg.group_id)));
          uniqueGroups.forEach(groupId => {
            if (!newGroupMap.has(groupId)) {
              const nextGroupNum = (newGroupMap.size + 1).toString();
              newGroupMap.set(groupId, nextGroupNum);
            }
          });

          // Process the data and maintain mappings
          const processedMessages = results.data.map(({ id, group_id, session_id, sender_id, created_time, content }) => {
            // Get or generate username and UUID
            if (!newUserMap.has(sender_id)) {
              const rawUsername = generateUsername();
              const formattedUsername = formatUsername(rawUsername);
              const userId = generateUUID();
              newUserMap.set(sender_id, {
                username: formattedUsername,
                userId: userId
              });
            }
            const userInfo = newUserMap.get(sender_id)!;

            // Get mapped group number
            const mappedGroupId = newGroupMap.get(group_id)!;

            return {
              id,
              group_id: mappedGroupId,
              session_id,
              username: userInfo.username,
              user_id: userInfo.userId,
              created_time,
              content
            };
          });

          // Update the maps
          setUserMap(newUserMap);
          setGroupMap(newGroupMap);

          // Group messages by mapped group_id
          const grouped = _.groupBy(processedMessages, 'group_id');
          
          // Sort messages within each group by created_time
          const sortedGroups = _.mapValues(grouped, messages => 
            _.sortBy(messages, 'created_time')
          );
          
          // Sort groups by their first message's timestamp
          const sortedGroupIds = Object.keys(sortedGroups).sort((a, b) => {
            const aTime = sortedGroups[a][0]?.created_time;
            const bTime = sortedGroups[b][0]?.created_time;
            return new Date(aTime).getTime() - new Date(bTime).getTime();
          });
          
          // Create final sorted object
          const finalSorted: { [key: string]: ProcessedMessage[] } = {};
          sortedGroupIds.forEach(groupId => {
            finalSorted[groupId] = sortedGroups[groupId];
          });

          // Get session info
          const sessionId = processedMessages[0]?.session_id || '';
          const allTimes = processedMessages.map(msg => new Date(msg.created_time).getTime());
          const sessionStartTime = new Date(Math.min(...allTimes)).toISOString();
          
          // Create final session object
          const sessionData: SessionInfo = {
            session_id: sessionId,
            session_start_time: sessionStartTime,
            groups: finalSorted
          };
          
          setProcessedData(sessionData);
        }
      });
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };

    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!processedData || !fileName) return;

    try {
      const jsonString = JSON.stringify(processedData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_processed.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating download:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button className="relative pointer-events-none">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
              {processedData && (
                <Button onClick={handleDownload} variant="outline">
                  Download JSON
                </Button>
              )}
            </div>
            
            {fileName && (
              <p className="text-sm text-gray-500">
                File loaded: {fileName}
              </p>
            )}

            {processedData && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Preview:</h3>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(processedData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}