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
    // Get what current point the discussion is on, as well as the discussion points from the discussion
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('discussion_points, current_point')
      .eq('id', sessionId)
      .single()

    console.log("1.) Session data", session)

    if (sessionError) {
      console.log('Session error:', sessionError)
      throw sessionError
    }

    if (!session?.discussion_points || !Array.isArray(session.discussion_points)) {
      throw new Error('Discussion points not found or invalid format')
    }

    const currentDiscussionPoint = session.discussion_points[session.current_point]

    console.log("2.) Current Discussion Point", currentDiscussionPoint)
    
    if (!currentDiscussionPoint) {
      throw new Error('Current discussion point not found')
    }

    // Get all messages from the group and filter messages by discussion point
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('group_id', groupId)
      .eq('current_point', session.current_point)
      .order('created_at', { ascending: true })

    console.log("3.) All message from discussion point", messages)

    if (messagesError) {
      console.log('Messages error:', messagesError)
      throw messagesError
    }

    if (!messages?.length) {
      return { success: false, error: 'No messages found for current discussion point' }
    }

    // Get shared answers from session
    const { data: currentAnswers, error: answersError } = await supabase
      .from('shared_answers')
      .select('answers')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .single();

    if (answersError && answersError.code !== 'PGRST116') {
      console.log('Error fetching current answers:', answersError);
      throw answersError;
    }

     // Get current point's bullets (including deleted ones)
     const currentPointKey = `point${session.current_point}` as keyof SharedAnswers
     const currentBullets = currentAnswers?.answers ? 
       (currentAnswers.answers as SharedAnswers)[currentPointKey] || [] : 
       [];
 
     // Get all points (including deleted ones) to show to GPT, just exclude "(None)"
     const existingPoints = currentBullets
       .filter(bullet => bullet.content !== "(None)")
       .map(bullet => bullet.content);

    console.log("4.) All existing bullet points", existingPoints)

     // Query GPT with the current discussion point and transcript
     const transcript = messages.map(m => m.content).join('\n')

     console.log("5.) Combined transcript", transcript)
     
     const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing a live classroom discussion between 3-4 students. Your role is to create bullet points that capture the very gist of the conversation, while still mainting the original content from the students.
    
                    Current discussion point: "${currentDiscussionPoint}"
                    
                    Examples of capturing discussion points:
                    Original discussion:
                    Student 1: "Like, I think that, um, when we use too much plastic and stuff, it goes into the ocean"
                    Student 2: "Yeah and the fish eat it!"
                    Student 3: "It's like messing up everything in the ocean, the whole food chain"
                    Good point: "Plastic in oceans messes up the whole food chain"
                    Bad point: "Marine pollution impacts ecosystems" (too formal)
                    
                    Original discussion:
                    Student 1: "Maybe if we used paper bags?"
                    Student 2: "Or just bring our own bags"
                    Student 1: "Yeah that's so easy"
                    Student 3: "We could totally do that"
                    Good point: "Bringing our own bags is an easy fix"
                    Bad point: "Alternative solutions to plastic bags were discussed" (misses the key insight)
    
                    Key guidelines:
                    1. NEVER repeat or rephrase existing points
                    2. Focus on NEW ideas that emerge from the group discussion
                    3. Capture the collective insight, not individual comments
                    4. Keep the students' casual voice
                    5. Make each point clear and memorable
                    
                    Return the response as a JSON object with this structure:
                    {
                      "points": ["core point 1", "core point 2"]
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
 
     // Parse the response and get new points
     const aiResponse = JSON.parse(content)
     const newPoints = aiResponse.points || []

     console.log("6.) new bullet points from GPT", newPoints)
     
     // Preserve all existing bullets and add new ones
     const updatedAnswers = {
       ...currentAnswers?.answers
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