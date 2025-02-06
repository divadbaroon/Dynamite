"use server"

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { SharedAnswers } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzeTranscript(groupId: string, sessionId: string) {
  const supabase = await createClient()

  try {
    // Fetch all data in parallel
    const [sessionResponse, messagesResponse, answersResponse] = await Promise.all([
      supabase
        .from('sessions')
        .select('discussion_points, current_point')
        .eq('id', sessionId)
        .single(),
      
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
        .single()
    ]);

    console.log("1.) Session data", sessionResponse.data)

    if (sessionResponse.error) {
      console.log('Session error:', sessionResponse.error)
      throw sessionResponse.error
    }

    const session = sessionResponse.data
    if (!session?.discussion_points || !Array.isArray(session.discussion_points)) {
      throw new Error('Discussion points not found or invalid format')
    }

    const currentDiscussionPoint = session.discussion_points[session.current_point]

    console.log("2.) Current Discussion Point", currentDiscussionPoint)
    
    if (!currentDiscussionPoint) {
      throw new Error('Current discussion point not found')
    }

    const messages = messagesResponse.data?.filter(msg => msg.current_point === session.current_point) || []
    console.log("3.) All message from discussion point", messages)

    if (messagesResponse.error) {
      console.log('Messages error:', messagesResponse.error)
      throw messagesResponse.error
    }

    if (!messages?.length) {
      return { success: false, error: 'No messages found for current discussion point' }
    }

    if (answersResponse.error && answersResponse.error.code !== 'PGRST116') {
      console.log('Error fetching current answers:', answersResponse.error)
      throw answersResponse.error
    }

    // Get current point's bullets (including deleted ones)
    const currentPointKey = `point${session.current_point}` as keyof SharedAnswers
    const currentBullets = answersResponse.data?.answers ? 
      (answersResponse.data.answers as SharedAnswers)[currentPointKey] || [] : 
      [];

    // Get all points (including deleted ones) to show to GPT, just exclude "(None)"
    const existingPoints = currentBullets
      .filter(bullet => bullet.content !== "(None)")
      .map(bullet => bullet.content);

    console.log("4.) All existing bullet points", existingPoints)

    // Query GPT with the current discussion point and transcript
    const transcript = messages.map(m => m.content).join('\n')

    console.log("5.) Combined transcript", transcript)
     
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

    console.log("Recieved from gpt: ", content)

    // Parse the response and get new points
    const aiResponse = JSON.parse(content)

    console.log('AI response: ', aiResponse)

    const newPoints = aiResponse.points || []

    console.log("6.) new bullet points from GPT", newPoints)
     
    // Preserve all existing bullets and add new ones
    const updatedAnswers = {
      ...answersResponse.data?.answers
    }

    updatedAnswers[currentPointKey] = [
      ...currentBullets,  // Keep all existing bullets with their original state
      ...newPoints.map((content: string) => ({ content, isDeleted: false }))
    ]

    console.log("7.) Final updated bullet points", newPoints)

    // Update the shared answers in the database
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