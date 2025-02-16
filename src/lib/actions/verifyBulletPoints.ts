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
        Your task is to verify each proposed bullet point meets ALL of the following criteria:

        CURRENT DISCUSSION TOPIC: "${currentPoint.content}"

        VERIFICATION CRITERIA:
        1. NOVELTY CHECK: The point must contain a new idea not present in existing points
        2. RELEVANCE CHECK: The point must directly relate to the current discussion topic
        3. REDUNDANCY CHECK: The point must not be a rephrasing of any existing point
        4. EVIDENCE CHECK: The point must be directly supported by content in the transcript
        
        For each point, return:
        - verified: boolean (true if point passes ALL checks)
        - reason: string (if not verified, explain why)
        
        BE STRICT IN YOUR VERIFICATION:
        - If there's any doubt, reject the point
        - Points must be explicitly supported by the discussion transcript
        - Reject any points that make claims beyond what was actually discussed`
      },
      {
        role: "user",
        content: `Please verify these proposed bullet points:
        
        CURRENT DISCUSSION TOPIC: ${currentPoint.content}
        
        EXISTING POINTS:
        ${existingPoints.length ? existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
        
        DISCUSSION TRANSCRIPT:
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