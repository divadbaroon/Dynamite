'use server'

import OpenAI from 'openai'
import { DiscussionPoint } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const analyzeWithGPT = async (
  currentPoint: DiscussionPoint,
  existingPoints: string[],
  transcript: string
) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are analyzing NEW messages from a classroom discussion transcript. Extract key points as JSON.
        
        DISCUSSION TOPIC: "${currentPoint.content}"
        
        TASK: Extract key points ONLY from the new messages that have been added since the last update.
        
        REQUIREMENTS:
        1. RELEVANCE: Only include points that directly connect to the discussion topic
        2. UNIQUENESS: Do not analyze or rephrase ANY existing points - focus ONLY on new content
        3. CONCISENESS: Capture the core idea while preserving student's voice
        4. FOCUS: Skip any off-topic or tangential points
        5. SYNTHESIS: Combine related ideas from the same student if they connect`
      },
      {
        role: "user",
        content: `Please analyze this discussion and return the points as JSON.
        
        Current discussion topic: ${currentPoint.content}
                
        EXISTING POINTS:
        ${existingPoints.length ? '\n' + existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
                
        NEW MESSAGES TO ANALYZE:
        ${transcript}
        
        Return your response in this exact JSON format:
        {
          "points": []
        }`
      }
    ],
    response_format: { type: "json_object" }
  });

  return completion.choices[0].message.content;
}