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
    model: "o1",
    messages: [
      {
        role: "system",
        content: `You are analyzing a classroom discussion transcript. Your role is to capture key points while keeping the students' authentic voice:
  
                  "${currentDiscussionPoint}"
                  
                  Key Requirements:
                  1. Summarize ideas coherently while keeping student language style
                  2. Do not repeat/ rephrase points already present
                  3. Only include points clearly present in the transcript
                  4. Keep the casual, natural way students express themselves
                  5. Never add points similar to existing ones
                  6. Combine related ideas from the same discussion thread
                  
                  Guidelines for point creation:
                  - Light summarization is okay to make points clearer
                  - Keep student phrases and vocabulary when combining ideas
                  - Each point should sound like something a student would say
                  - Avoid formal or academic language
                  - Keep points under 100 characters
                  - Skip points similar to existing ones
                  
                  Examples of good summarization:
                  Original: "Like, I think that, um, when we use too much plastic and stuff, it goes into the ocean and then, you know, the fish eat it and that's really bad for them"
                  Good point: "Plastic in oceans is bad cause fish eat it and get hurt"
                  Bad point: "Marine ecosystem degradation due to plastic pollution" (too formal)
                  
                  Original: "I was thinking maybe if we, like, used paper bags instead of plastic ones, and then also like brought our own bags to the store, that would help a lot with the plastic problem"
                  Good point: "Using paper bags and bringing our own bags helps with plastic"
                  Bad point: "Implementation of sustainable shopping practices" (not student voice)
                  
                  Remember:
                  1. Check all existing points to avoid duplicates
                  2. Only combine ideas that are clearly related
                  3. Keep the natural flow of student speech
                  4. Make it sound like students talking to other students
                  
                  Return the response as a JSON object with this structure:
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