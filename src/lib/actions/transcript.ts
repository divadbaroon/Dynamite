"use server"

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { SharedAnswers, BulletPoint } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

import stringSimilarity from 'string-similarity';

function isTooSimilar(newPoint: string, existingPoints: string[], similarityThreshold: number = 0.7): boolean {
  return existingPoints.some(existing => {
    const similarity = stringSimilarity.compareTwoStrings(newPoint.toLowerCase(), existing.toLowerCase());
    return similarity >= similarityThreshold;
  });
}

export async function analyzeTranscript(sessionId: string, groupId: string) {
  const supabase = await createClient()

  try {
    // Fetch all data in parallel
    const [sessionResponse, messagesResponse, answersResponse] = await Promise.all([
      supabase
        .from('sessions')
        .select('discussion_points, current_point')
        .eq('id', sessionId)
        .maybeSingle(),
      
      supabase
        .from('messages')
        .select('content, created_at, current_point')  
        .eq('group_id', groupId)
        .order('created_at', { ascending: true }),
      
      supabase
        .from('shared_answers')
        .select('answers, last_updated')
        .eq('session_id', sessionId)
        .eq('group_id', groupId)
        .maybeSingle()
    ]);

    if (sessionResponse.error) {
      console.log('Session error:', sessionResponse.error)
      throw sessionResponse.error
    }

    const session = sessionResponse.data
    if (!session) {
      console.log('Session not found')
      return { 
        success: false, 
        error: 'Session not found or not initialized' 
      }
    }

    if (!session.discussion_points) {
      console.log('No discussion points available')
      return { 
        success: false, 
        error: 'No discussion points available yet' 
      }
    }

    if (!Array.isArray(session.discussion_points)) {
      console.log('Discussion points is not an array')
      return {
        success: false,
        error: 'Discussion points are not in the correct format'
      }
    }

    if (!session.discussion_points[session.current_point]) {
      console.log('Current discussion point not found')
      return {
        success: false,
        error: 'No current discussion point available'
      }
    }

    const currentDiscussionPoint = session.discussion_points[session.current_point]
    console.log("1.) Current Discussion Point", currentDiscussionPoint)

    // Filter messages by current point and last update time
    const lastUpdated = answersResponse.data?.last_updated
    const messages = messagesResponse.data?.filter(msg => {
      return msg.current_point === session.current_point && 
             (!lastUpdated || new Date(msg.created_at) > new Date(lastUpdated))
    }) || []
    
    console.log("2.) New messages since last update", messages)

    if (messagesResponse.error) {
      console.log('Messages error:', messagesResponse.error)
      throw messagesResponse.error
    }

    if (!messages?.length) {
      return { success: false, error: 'No new messages found since last update' }
    }

    let currentAnswers = answersResponse.data?.answers || {}
    const currentPointKey = `point${session.current_point}` as keyof SharedAnswers
    
    if (!answersResponse.data) {
      currentAnswers = {
        [currentPointKey]: []
      }

      const { error: initError } = await supabase
        .from('shared_answers')
        .insert({
          session_id: sessionId,
          group_id: groupId,
          answers: currentAnswers,
          last_updated: new Date().toISOString()
        });

      if (initError) {
        console.log('Error initializing shared answers:', initError)
        throw initError
      }

      console.log('Initialized shared answers:', currentAnswers)
    }

    const currentBullets = (currentAnswers[currentPointKey] as BulletPoint[]) || []
    const existingPoints = currentBullets
      .filter(bullet => bullet.content !== "(None)")
      .map(bullet => bullet.content);

    console.log("3.) All existing bullet points", existingPoints)

    const transcript = messages
      .map((m, index) => {
        const messageNumber = index + 1;
        const timestamp = new Date(m.created_at).toLocaleTimeString();
        return `Message ${messageNumber} [${timestamp}]:\n${m.content.trim()}`
      })
      .join('\n\n---\n\n');

    console.log("4.) Combined transcript of new messages", transcript)
     
    console.log("Starting gpt analysis")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing NEW messages from a classroom discussion transcript. 
          
          DISCUSSION TOPIC: "${currentDiscussionPoint}"
          
          TASK: Extract key points ONLY from the new messages that have been added since the last update.
          
          REQUIREMENTS:
          1. RELEVANCE: Only include points that directly connect to the discussion topic
          2. UNIQUENESS: Do not analyze or rephrase ANY existing points - focus ONLY on new content
          3. CONCISENESS: Capture the core idea while preserving student's voice
          4. FOCUS: Skip any off-topic or tangential points
          5. SYNTHESIS: Combine related ideas from the same student if they connect
          
          CRITICAL: You are ONLY analyzing new messages. The existing points are provided for context only - do NOT include them in your analysis or rephrase them. If no new unique points are found, return an empty array.
          
          EXAMPLES:
          Topic: "How does plastic affect ocean animals?"
          
          Input: "I think plastic is bad for the environment and also like we should use less paper and maybe turn off lights when we leave rooms"
          ✓ INCLUDE: "Plastic is bad for the environment" (on-topic)
          ✗ EXCLUDE: "Turn off lights when leaving rooms" (off-topic)
          
          Input: "The turtles get stuck in those plastic rings from soda cans and like they can't swim properly and stuff"
          ✓ INCLUDE: "Turtles get stuck in plastic rings and can't swim"
          
          OUTPUT FORMAT:
          Return response as JSON:
          {
            "points": [
              "point 1 from transcript",
              "point 2 from transcript"
            ]
          }`
        },
        {
          role: "user",
          content: `Current discussion topic: ${currentDiscussionPoint}
                  
          EXISTING POINTS (These are already captured - DO NOT analyze or rephrase these):
          ${existingPoints.length ? '\n' + existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
                  
          NEW MESSAGES TO ANALYZE (Messages since last update):
          ${transcript}
          
          IMPORTANT: Only analyze the new messages above. If you find no new unique points that aren't already in the existing points list, return an empty array.`
        }
      ],
      response_format: { type: "json_object" }
    })
    
    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    console.log("Received from gpt: ", content)

    const aiResponse = JSON.parse(content)
    console.log('AI response: ', aiResponse)

    // Filter out new points that are too similar to existing ones
    const newPoints = (aiResponse.points || []).filter((point: string) => 
      !isTooSimilar(point, existingPoints)
    )

    console.log("6.) new bullet points from GPT (after similarity check)", newPoints)
     
    const updatedAnswers = {
      ...currentAnswers
    }

    updatedAnswers[currentPointKey] = [
      ...currentBullets,
      ...newPoints.map((content: string) => ({ content, isDeleted: false }))
    ]

    console.log("7.) Final updated bullet points", updatedAnswers[currentPointKey])

    const { error: upsertError } = await supabase
      .from('shared_answers')
      .upsert({
        session_id: sessionId,
        group_id: groupId,
        answers: updatedAnswers,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'session_id,group_id',
        ignoreDuplicates: false
      });

    if (upsertError) throw upsertError

    return { success: true }
  } catch (error) {
    console.log('Error analyzing transcript:', error)
    return { success: false, error: String(error) }
  }
}