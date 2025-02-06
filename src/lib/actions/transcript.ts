"use server"

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { SharedAnswers } from '@/types'

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
        .select('answers')
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

    const messages = messagesResponse.data?.filter(msg => msg.current_point === session.current_point) || []
    console.log("2.) All message from discussion point", messages)

    if (messagesResponse.error) {
      console.log('Messages error:', messagesResponse.error)
      throw messagesResponse.error
    }

    if (!messages?.length) {
      return { success: false, error: 'No messages found for current discussion point' }
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

    const currentBullets = (currentAnswers[currentPointKey] as any[]) || []
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

    console.log("4.) Combined transcript", transcript)
     
    console.log("Starting gpt analysis")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing a classroom discussion transcript. Your role is to extract points that directly relate to this discussion topic:

          "${currentDiscussionPoint}"

          Requirements (You must follow these when generating points):
          1. Only include points that directly connect to the discussion topic
          2. Do not include points that have already been mentioned
          3. Keep the students' natural speaking style
          4. Skip any points that aren't clearly related to the topic
          5. Combine related ideas from the same thread if they connect to the topic

          Example:
          Discussion Topic: "How does plastic affect ocean animals?"

          Original student comment: "I think plastic is bad for the environment and also like we should use less paper and maybe turn off lights when we leave rooms"
          Good point: "Plastic is bad for the environment" (related to topic)
          Skip: "Turn off lights when leaving rooms" (off-topic)

          Original student comment: "The turtles get stuck in those plastic rings from soda cans and like they can't swim properly and stuff"
          Good point: "Turtles get stuck in plastic rings and can't swim"

          Return the response as a JSON object:
          {
            "points": ["point 1 from transcript", "point 2 from transcript"]
          }`
        },
        {
          role: "user",
          content: `Current discussion topic: ${currentDiscussionPoint}
                  
          Existing points (DO NOT duplicate or rephrase these): 
          ${existingPoints.length ? '\n' + existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
                  
          Discussion transcript:
          ${transcript}`
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