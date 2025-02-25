import { MessageData } from '@/types'

export const getRecentMessages = (messages: MessageData[]) => {
  if (!messages.length) return [];

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Get latest message time
  const latestMessage = sortedMessages[sortedMessages.length - 1];
  const latestTime = new Date(latestMessage.created_at).getTime();
  const cutoffTime = latestTime - 20000; // 20 seconds

  // Filter messages within time window
  const recentMessages = sortedMessages.filter(message => {
    return new Date(message.created_at).getTime() > cutoffTime;
  });

  // Debug logging
  console.log('Time analysis:', {
    latestTime: new Date(latestTime).toISOString(),
    cutoffTime: new Date(cutoffTime).toISOString(),
    messageCount: messages.length,
    recentCount: recentMessages.length,
    timeWindow: '20 seconds'
  });

  return recentMessages;
}

export const formatTranscript = (messages: MessageData[]): string => {
  return messages
    .map((m, index) => {
      const messageNumber = index + 1;
      const timestamp = new Date(m.created_at).toLocaleTimeString();
      return `Message ${messageNumber} [${timestamp}] from ${m.username}:\n${m.content.trim()}`
    })
    .join('\n\n---\n\n');
}