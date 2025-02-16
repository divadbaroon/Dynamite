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
        Your task is to verify each proposed bullet point meets the following criteria:

        CURRENT DISCUSSION TOPIC: "${currentPoint.content}"

        VERIFICATION CRITERIA:
        1. RELEVANCE: The point must clearly relate to the discussion topic and address some aspect of the question
        2. EVIDENCE: The point must be based on ideas expressed in the transcript
        3. UNIQUENESS: The point should not duplicate existing points, though it may build upon them
        4. COMPLETENESS: The point should express a complete thought or proposal
        
        For each point, verify:
        - Is it clearly related to the discussion topic?
        - Is it supported by the discussion transcript?
        - Is it different from existing points?
        - Does it express a complete idea?
        
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