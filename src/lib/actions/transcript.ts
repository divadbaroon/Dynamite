"use server"

import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { SharedAnswers, BulletPoint } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzeTranscript(groupId: string, sessionId: string) {
  const supabase = await createClient()

  try {
    // Fetch current answers and locked points
    const { data: currentAnswers, error: answersError } = await supabase
      .from('shared_answers')
      .select('answers')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .single();

    if (answersError && answersError.code !== 'PGRST116') {
      console.error('Error fetching current answers:', answersError);
      throw answersError;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('group_id', groupId)
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Messages error:', messagesError)
      throw messagesError
    }

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('discussion_points')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('Session error:', sessionError)
      throw sessionError
    }

    if (!session?.discussion_points || !Array.isArray(session.discussion_points)) {
      throw new Error('Discussion points not found or invalid format')
    }

    if (!messages?.length) {
      return { success: false, error: 'No recent messages found' }
    }

    const transcript = messages.map(m => m.content).join('\n')
    
    // Format current points and discussion points, filtering out deleted items
    const numberedPoints = session.discussion_points
      .map((point, index) => {
        const pointKey = `point${index}` as keyof SharedAnswers;
        const currentBullets = currentAnswers?.answers ? 
          (currentAnswers.answers as SharedAnswers)[pointKey] || [] : 
          [];
          
        // Convert and filter bullets
        const bulletPoints = currentBullets
          .map(bullet => {
            if (typeof bullet === 'string') {
              return `  • ${bullet}`;
            }
            // Only include non-deleted bullets
            if (!bullet.isDeleted) {
              return `  • ${bullet.content}`;
            }
            return null;
          })
          .filter(Boolean) // Remove null values
          .join('\n');
          
        return `${index + 1}. ${point}\nCurrent bullet points:\n${bulletPoints || '  (None)'}`
      })
      .join('\n\n');

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are analyzing a group discussion transcript. Your task is to:
      
          1. ALWAYS KEEP ALL EXISTING BULLET POINTS EXACTLY AS THEY ARE - DO NOT MODIFY OR REMOVE ANY EXISTING POINTS.
          2. For each discussion point, only analyze the new conversation transcript to identify additional points.
          3. In your JSON response:
            - First, copy all existing bullet points exactly as shown, maintaining their order
            - Then add any new bullet points from the recent discussion
            - Only add points that represent truly new insights
            - Keep all bullet points clear and under 100 characters
            - If no new points are found for a topic, just return the existing points
      
          For example, if you see:
          "1. Topic A
          Current bullet points:
            • Existing point 1
            • Existing point 2"
      
          Your response should be:
          {
            "point0": ["Existing point 1", "Existing point 2", "Any new point from transcript"]
          }
      
          IMPORTANT: The existing bullet points MUST appear first and exactly as shown in the current points.`
          },
          {
            role: "user",
            content: `Current Discussion Points and Bullets:\n${numberedPoints}\n\nRecent Transcript:\n${transcript}\n\nKeep ALL existing bullet points exactly as they are and add new ones only from the recent discussion.`
          }
        ],
        response_format: { type: "json_object" }
      })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Parse the response and preserve existing bullet point structure
    const aiResponse = JSON.parse(content)
    const newBulletPoints: SharedAnswers = {}

    // Process each point and preserve existing structure
    session.discussion_points.forEach((_, index) => {
      const key = `point${index}`;
      const currentPoints = currentAnswers?.answers?.[key] || [];
      const aiPoints = aiResponse[key] || [];
      
      newBulletPoints[key] = [];

      // First, add existing points with their original structure
      currentPoints.forEach((point: string | BulletPoint) => {
        if (typeof point === 'string') {
          newBulletPoints[key].push({ content: point, isDeleted: false });
        } else {
          newBulletPoints[key].push(point);
        }
      });

      // Then add new points from AI as BulletPoint objects
      aiPoints.slice(currentPoints.length).forEach((point: string) => {
        newBulletPoints[key].push({ content: point, isDeleted: false });
      });
    });

    const { error: upsertError } = await supabase
      .from('shared_answers')
      .upsert({
        session_id: sessionId,
        group_id: groupId,
        answers: newBulletPoints,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'session_id,group_id',
        ignoreDuplicates: false
      });

    if (upsertError) throw upsertError

    return { success: true }
  } catch (error) {
    console.error('Error analyzing transcript:', error)
    return { success: false, error: String(error) }
  }
}


