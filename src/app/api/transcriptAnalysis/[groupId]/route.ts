import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { RequestBody, BulletPoint } from '@/types'
import { getRecentMessages, formatTranscript } from '@/utils/transcriptAnalysis'
import { analyzeWithGPT } from '@/lib/actions/openai'
import { verifyBulletPoints } from '@/lib/actions/verifyBulletPoints'
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

    // Initial analysis
    await kv.set(statusKey, 'Analyzing with GPT...')
    const content = await analyzeWithGPT(currentPoint, existingPoints, transcript)
    if (!content) throw new Error('No content received from OpenAI')

    console.log('Initial GPT Response:', content)

    const aiResponse = JSON.parse(content)
    const proposedPoints = aiResponse.points || []

    console.log('Initial analysis results:', {
      proposedPointsFound: proposedPoints.length,
      proposedPoints
    })

    if (proposedPoints.length > 0) {
      // Verify the proposed points
      await kv.set(statusKey, 'Verifying points...')
      const verificationResult = await verifyBulletPoints(
        proposedPoints,
        currentPoint,
        existingPoints,
        transcript
      )

      if (!verificationResult) {
        throw new Error('No verification result received from OpenAI')
      }

      // At this point, TypeScript knows verificationResult is a string
      const verificationResponse = JSON.parse(verificationResult)
      interface VerificationPoint {
        point: string;
        verified: boolean;
        reason: string;
      }

      const verifiedPoints = verificationResponse.verifiedPoints
        .filter((point: VerificationPoint) => point.verified)
        .map((point: VerificationPoint) => point.point)

      console.log('Verification results:', {
        totalProposed: proposedPoints.length,
        verified: verifiedPoints.length,
        rejectedCount: proposedPoints.length - verifiedPoints.length,
        verifiedPoints
      })

      if (verifiedPoints.length > 0) {
        await kv.set(statusKey, 'Saving verified points...')
        await updateAnalysisAnswers(
          sessionId,
          groupId,
          currentPointKey,
          sharedAnswers,
          currentBullets,
          verifiedPoints
        )
        console.log('Saved verified points to database')
      } else {
        console.log('No points passed verification')
      }
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