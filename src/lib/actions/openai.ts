'use server'

import OpenAI from 'openai'
import { DiscussionPoint } from '@/types'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const analyzeWithGPT = async (
  currentPoint: DiscussionPoint,
  existingPoints: string[],
  transcript: string
) => {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system" as const,
      content: `You are analyzing messages from a classroom discussion transcript regarding the following discussion topic:
      
      DISCUSSION TOPIC: "${currentPoint.content}"
      
      TASK: Extract ONLY NEW key points from messages that introduce ideas not previously mentioned.
      
      REQUIREMENTS:
      1. NOVELTY: Only extract points that present completely new ideas not covered in existing points
      2. UNIQUENESS: Do not rephrase, reword, or expand on ANY existing points
      3. INDEPENDENCE: Each point must stand alone as a new contribution
      4. RELEVANCE: Points must directly relate to the discussion topic
      5. CLARITY: Capture the core new idea while preserving student's voice

      IMPORTANT: If a new message repeats or merely elaborates on an existing point, skip it entirely.`
    },
    {
      role: "user" as const,
      content: `Please analyze this discussion and return ONLY NEW points as JSON.
      
      Current discussion topic: ${currentPoint.content}
              
      EXISTING POINTS (DO NOT REPEAT OR REPHRASE THESE):
      ${existingPoints.length ? '\n' + existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
              
      NEW MESSAGES TO ANALYZE FOR UNIQUE IDEAS:
      ${transcript}
      
      Return your response in this exact JSON format:
      {
        "points": []  
      }`
    }
  ]

  // Log the complete prompt for debugging
  console.log('\n=== GPT Analysis Prompt ===')
  console.log('Discussion Topic:', currentPoint.content)
  console.log('\nExisting Points:', existingPoints.length ? existingPoints : '(none)')
  console.log('\nSystem Message:', messages[0].content)
  console.log('\nUser Message:', messages[1].content)
  console.log('\nTranscript Length:', transcript.length, 'characters')
  console.log('=== End Prompt ===\n')

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    response_format: { type: "json_object" }
  });

  // Log the API response
  console.log('\n=== GPT Response ===')
  console.log('Response:', completion.choices[0].message.content)
  console.log('Usage:', completion.usage)
  console.log('=== End Response ===\n')

  return completion.choices[0].message.content;
}