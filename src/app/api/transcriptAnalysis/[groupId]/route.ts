import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { RequestBody, BulletPoint } from '@/types'
import { getRecentMessages, formatTranscript } from '@/utils/transcriptAnalysis'
import { analyzeWithGPT } from '@/lib/actions/openai'
import { updateAnalysisAnswers } from '@/lib/actions/discussion'

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  let lockKey = ''
  let statusKey = ''

  try {
    const { groupId } = await context.params
    const { sessionId, messages, currentPoint, sharedAnswers }: RequestBody = await request.json()

    console.log('Received request with:', {
      groupId,
      sessionId,
      messageCount: messages.length,
      currentPoint: currentPoint.content,
      existingAnswersCount: Object.keys(sharedAnswers || {}).length
    })

    lockKey = `analysis_lock:${groupId}_${sessionId}`
    statusKey = `analysis_status:${groupId}_${sessionId}`

    const acquired = await kv.set(lockKey, 'locked', { nx: true, ex: 30 })
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

    const recentMessages = getRecentMessages(messages)
    console.log('Recent messages:', {
      total: messages.length,
      recent: recentMessages.length,
      timeWindow: '20 seconds'
    })

    if (!recentMessages.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'No new messages found in the last 20 seconds' 
      })
    }

    const currentPointKey = `point${currentPoint.index}`
    const currentBullets = (sharedAnswers[currentPointKey] as BulletPoint[]) || []
    const existingPoints = currentBullets
      .filter(bullet => bullet.content !== "(None)")
      .map(bullet => bullet.content)
    
    console.log('Analysis context:', {
      currentPointKey,
      existingPointsCount: existingPoints.length,
      existingPoints
    })

    const transcript = formatTranscript(recentMessages)
    console.log('Formatted transcript:', transcript)

    await kv.set(statusKey, 'Analyzing with GPT...')
    const content = await analyzeWithGPT(currentPoint, existingPoints, transcript)
    if (!content) throw new Error('No content received from OpenAI')

    console.log('GPT Response:', content)

    const aiResponse = JSON.parse(content)
    const newPoints = aiResponse.points || []

    console.log('Analysis results:', {
      newPointsFound: newPoints.length,
      newPoints
    })

    if (newPoints.length > 0) {
      await kv.set(statusKey, 'Saving results...')
      await updateAnalysisAnswers(
        sessionId,
        groupId,
        currentPointKey,
        sharedAnswers,
        currentBullets,
        newPoints
      )
      console.log('Saved new points to database')
    }

    await kv.del(statusKey)
    return NextResponse.json({ 
      success: true,
      message: 'Analysis completed successfully'
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        message: 'Analysis failed'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    if (lockKey && statusKey) {
      await Promise.all([
        kv.del(lockKey),
        kv.del(statusKey)
      ]).catch(console.error)
    }
  }
}