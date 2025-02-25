import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import OpenAI from 'openai'
import { RequestBody } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  let lockKey = ''
  let statusKey = ''

  try {
    const { groupId } = await context.params
    const { sessionId, messages, currentPoint }: RequestBody = await request.json()

    console.log('Received ethical analysis request:', {
      groupId,
      sessionId,
      messageCount: messages.length,
      currentPoint: currentPoint.content
    })

    lockKey = `ethical_analysis_lock:${groupId}_${sessionId}`
    statusKey = `ethical_analysis_status:${groupId}_${sessionId}`

    const acquired = await kv.set(lockKey, 'locked', { nx: true, ex: 30 })
    if (!acquired) {
      const status = await kv.get(statusKey)
      return NextResponse.json({ 
        success: false,
        status: 'in_progress',
        message: 'Ethical analysis already running',
        currentStatus: status
      })
    }

    await kv.set(statusKey, 'Starting ethical analysis...')

    if (!messages.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'No messages provided for analysis' 
      })
    }

    const transcript = messages
      .map(msg => `${msg.username}: ${msg.content}`)
      .join('\n')

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing classroom discussion messages to identify ethical perspectives.
          
          TASK: Identify statements that align strongly with these ethical frameworks:
          - Utilitarian: Focus on maximizing well-being/happiness for the greatest number
          - Deontological: Focus on moral rules, duties, and rights
          - Virtue Ethics: Focus on character traits and moral excellence
          - Care Ethics: Focus on relationships, empathy, and context-sensitive care
          
          For each perspective found, extract the relevant quote and explain how it aligns with that framework.`
        },
        {
          role: "user",
          content: `Analyze this discussion for ethical perspectives:
          
          Discussion Topic: ${currentPoint.content}
          
          Transcript:
          ${transcript}
          
          Return your analysis in this JSON format:
          {
            "perspectives": [
              {
                "framework": "string",
                "quote": "string",
                "explanation": "string",
                "username": "string"
              }
            ]
          }`
        }
      ],
      response_format: { type: "json_object" }
    })

    const analysis = completion.choices[0].message.content

    if (!analysis) {
      throw new Error('No analysis received from OpenAI')
    }

    // Parse and validate the analysis
    let parsedAnalysis: {
      perspectives: Array<{
        framework: string
        quote: string
        explanation: string
        username: string
      }>
    }

    try {
      parsedAnalysis = JSON.parse(analysis)
    } catch (e) {
      throw new Error(`Failed to parse analysis response: ${e}`)
    }

    // Store the analysis results
    const analysisKey = `ethical_analysis:${groupId}_${sessionId}_${currentPoint.index}`
    await kv.set(analysisKey, analysis)

    await kv.del(statusKey)
    return NextResponse.json({ 
      success: true,
      message: 'Ethical analysis completed',
      analysis: parsedAnalysis
    })

  } catch (error) {
    console.error('Ethical analysis error:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      message: 'Ethical analysis failed'
    }, { status: 500 })
  } finally {
    if (lockKey && statusKey) {
      await Promise.all([
        kv.del(lockKey),
        kv.del(statusKey)
      ]).catch(console.error)
    }
  }
}
