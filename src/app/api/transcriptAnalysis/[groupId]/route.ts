import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import stringSimilarity from 'string-similarity'
import { SharedAnswers, BulletPoint, MessageData, RequestBody } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function isTooSimilar(newPoint: string, existingPoints: string[], similarityThreshold: number = 0.7): boolean {
  return existingPoints.some(existing => {
    const similarity = stringSimilarity.compareTwoStrings(newPoint.toLowerCase(), existing.toLowerCase());
    return similarity >= similarityThreshold;
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  let lockKey = ''
  let statusKey = ''

  try {
    const { groupId } = await context.params
    const { sessionId, messages }: RequestBody = await request.json()
    
    // Create lock keys
    lockKey = `analysis_lock:${groupId}_${sessionId}`
    statusKey = `analysis_status:${groupId}_${sessionId}`

    // Try to acquire lock
    const acquired = await kv.set(lockKey, 'locked', { 
      nx: true,
      ex: 30
    })

    if (!acquired) {
      const status = await kv.get(statusKey)
      return NextResponse.json({ 
        success: false,
        status: 'in_progress',
        message: 'Analysis already running',
        currentStatus: status
      })
    }

    await kv.set(statusKey, 'Starting analysis...')

    const supabase = await createClient()

    // Fetch session and answers data
    const [sessionResponse, answersResponse] = await Promise.all([
      supabase
        .from('sessions')
        .select('discussion_points, current_point')
        .eq('id', sessionId)
        .maybeSingle(),
      
      supabase
        .from('shared_answers')
        .select('answers, last_updated')
        .eq('session_id', sessionId)
        .eq('group_id', groupId)
        .maybeSingle()
    ]);

    if (sessionResponse.error) {
      throw new Error(`Session fetch error: ${sessionResponse.error.message}`)
    }

    const session = sessionResponse.data
    if (!session || !session.discussion_points || !Array.isArray(session.discussion_points)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found or invalid format' 
      })
    }

    const currentDiscussionPoint = session.discussion_points[session.current_point]
    if (!currentDiscussionPoint) {
      return NextResponse.json({
        success: false,
        error: 'No current discussion point available'
      })
    }

    // Get current time and calculate cutoff time (20 seconds ago)
    const now = new Date()
    const cutoffTime = new Date(now.getTime() - 20000)

    // Filter messages from last 20 seconds
    const recentMessages = messages.filter((msg: MessageData) => {
      const messageTime = new Date(msg.timestamp)
      return messageTime > cutoffTime
    })

    if (!recentMessages.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'No new messages found in the last 20 seconds' 
      })
    }

    let currentAnswers = answersResponse.data?.answers || {}
    const currentPointKey = `point${session.current_point}` as keyof SharedAnswers
    
    if (!answersResponse.data) {
      currentAnswers = {
        [currentPointKey]: []
      }

      await kv.set(statusKey, 'Initializing shared answers...')

      const { error: initError } = await supabase
        .from('shared_answers')
        .insert({
          session_id: sessionId,
          group_id: groupId,
          answers: currentAnswers,
          last_updated: new Date().toISOString()
        });

      if (initError) {
        throw new Error(`Failed to initialize answers: ${initError.message}`)
      }
    }

    const currentBullets = (currentAnswers[currentPointKey] as BulletPoint[]) || []
    const existingPoints = currentBullets
      .filter(bullet => bullet.content !== "(None)")
      .map(bullet => bullet.content);

    const transcript = recentMessages
      .map((m: MessageData, index: number) => {
        const messageNumber = index + 1;
        const timestamp = new Date(m.timestamp).toLocaleTimeString();
        return `Message ${messageNumber} [${timestamp}] from ${m.username}:\n${m.content.trim()}`
      })
      .join('\n\n---\n\n');

    await kv.set(statusKey, 'Analyzing with GPT...')

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are analyzing NEW messages from a classroom discussion transcript. Extract key points as JSON.
            
            DISCUSSION TOPIC: "${currentDiscussionPoint}"
            
            TASK: Extract key points ONLY from the new messages that have been added since the last update.
            
            REQUIREMENTS:
            1. RELEVANCE: Only include points that directly connect to the discussion topic
            2. UNIQUENESS: Do not analyze or rephrase ANY existing points - focus ONLY on new content
            3. CONCISENESS: Capture the core idea while preserving student's voice
            4. FOCUS: Skip any off-topic or tangential points
            5. SYNTHESIS: Combine related ideas from the same student if they connect
            
            OUTPUT FORMAT:
            Return a JSON response with an array of points like this:
            {
              "points": [
                "First key point from discussion",
                "Second key point from discussion"
              ]
            }`
          },
          {
            role: "user",
            content: `Please analyze this discussion and return the points as JSON.
            
            Current discussion topic: ${currentDiscussionPoint}
                    
            EXISTING POINTS (These are already captured - DO NOT analyze or rephrase these):
            ${existingPoints.length ? '\n' + existingPoints.map(p => `- ${p}`).join('\n') : '(none)'}
                    
            NEW MESSAGES TO ANALYZE:
            ${transcript}
            
            IMPORTANT: Only analyze the new messages above. If you find no new unique points that aren't already in the existing points list, return an empty array.
            
            Return your response in this exact JSON format:
            {
              "points": []
            }`
          }
        ],
        response_format: { type: "json_object" }
      })

      const content = completion.choices[0].message.content
      if (!content) {
        throw new Error('No content received from OpenAI')
      }

      try {
        const aiResponse = JSON.parse(content)
        const newPoints = (aiResponse.points || []).filter((point: string) => 
          !isTooSimilar(point, existingPoints)
        )

        await kv.set(statusKey, 'Saving results...')
        
        const updatedAnswers = {
          ...currentAnswers,
          [currentPointKey]: [
            ...currentBullets,
            ...newPoints.map((content: string) => ({ content, isDeleted: false }))
          ]
        }

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

        if (upsertError) {
          throw new Error(`Failed to save answers: ${upsertError.message}`)
        }

        await kv.del(statusKey)

        return NextResponse.json({ 
          success: true,
          message: 'Analysis completed successfully'
        })

      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error 
          ? parseError.message 
          : 'Unknown error during parsing';
        throw new Error(`Failed to parse OpenAI response: ${errorMessage}. Content: ${content}`)
      }
      
      } catch (openaiError: unknown) {
        const errorMessage = openaiError instanceof Error 
          ? openaiError.message 
          : 'Unknown OpenAI API error';
        throw new Error(`OpenAI API error: ${errorMessage}`)
      }

  } catch (error) {
    console.error('Analysis error:', error)
    // Ensure we're returning a proper JSON response even in error cases
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        message: 'Analysis failed'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } finally {
    // Only try to clear the lock if the keys were set
    if (lockKey && statusKey) {
      await Promise.all([
        kv.del(lockKey),
        kv.del(statusKey)
      ]).catch(console.error)
    }
  }
}