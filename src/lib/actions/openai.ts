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
      
      TASK: Extract key points from the discussion that contribute to understanding the topic.
      
      REQUIREMENTS:
      1. RELEVANCE: Points must relate to the discussion topic
      2. CLARITY: Capture ideas while preserving students' voices
      3. VALUE: Focus on points that add value to the discussion
      4. INCLUSIVITY: Include different perspectives shared in the discussion
      
      It's OK if points:
      - Build upon or extend existing ideas with new insights
      - Approach the topic from a different angle
      - Provide supporting examples for existing ideas
      - Express similar ideas in substantially different ways`
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