import { MessageData } from '@/types'

export const getRecentMessages = (messages: MessageData[], timeWindow: number = 20000) => {
  const cutoffTime = new Date(Date.now() - timeWindow);
  return messages.filter(msg => new Date(msg.timestamp) > cutoffTime);
}

export const formatTranscript = (messages: MessageData[]): string => {
  return messages
    .map((m, index) => {
      const messageNumber = index + 1;
      const timestamp = new Date(m.timestamp).toLocaleTimeString();
      return `Message ${messageNumber} [${timestamp}] from ${m.username}:\n${m.content.trim()}`
    })
    .join('\n\n---\n\n');
}