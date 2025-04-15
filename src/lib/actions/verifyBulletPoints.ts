import OpenAI from 'openai'
import { DiscussionPoint } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const verifyBulletPoints = async (
  proposedPoints: string[],
  currentPoint: DiscussionPoint,
  existingPoints: string[],
  transcript: string
): Promise<string | null> => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a verification system for classroom discussion bullet points.
        Your task is to verify each proposed bullet point with a balanced approach:

        CURRENT DISCUSSION TOPIC: "${currentPoint.content}"

        VERIFICATION CRITERIA:
        1. RELEVANCE: The point should relate to the discussion topic
        2. EVIDENCE: The point should be based on ideas mentioned in the transcript
        3. VALUE: The point should contribute something worthwhile to the discussion
        
        Be inclusive and generous in your verification:
        - Accept points that build upon existing ideas with new insights
        - Accept points that rephrase an idea if it adds clarity
        - Accept points that provide examples or context for existing ideas
        - Accept points that represent different perspectives on the topic
        
        Only reject points that are:
        - Completely unrelated to the topic
        - Not supported by any part of the transcript
        - Exact duplicates of existing points without any new information
        
        Return for each point:
        - verified: boolean (true if meets criteria)
        - reason: string (explain verification decision)
        
        Note: Points should be meaningful contributions that advance the discussion, but don't need to be perfectly polished.`
      },
      {
        role: "user",
        content: `Verify these proposed bullet points:
        
        DISCUSSION TOPIC: ${currentPoint.content}
        
        EXISTING POINTS:
        ${existingPoints.length ? existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
        
        TRANSCRIPT:
        ${transcript}
        
        POINTS TO VERIFY:
        ${proposedPoints.map(p => `- ${p}`).join('\n')}
        
        Return your response in this exact JSON format:
        {
          "verifiedPoints": [
            {
              "point": "string",
              "verified": boolean,
              "reason": "string"
            }
          ]
        }`
      }
    ],
    response_format: { type: "json_object" }
  });

  return completion.choices[0].message.content;
}