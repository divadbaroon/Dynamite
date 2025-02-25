import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import OpenAI from 'openai'
import { RequestBody } from '@/types'
import { saveEthicalPerspectives } from '@/lib/actions/ethical-perspectives'

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

    await kv.set(statusKey, 'Analyzing ethical perspectives...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are analyzing classroom discussion messages to identify ethical perspectives.
        
          TASK: Identify statements that clearly demonstrate one of these ethical frameworks ONLY when the student genuinely invokes ethical principles (not just mentions topics):
          
          - Utilitarian: Arguments based on maximizing benefits or minimizing harm for all affected parties (e.g., "AI training on all content creates greater overall value for society than restricting it")
          
          - Deontological/Rights-based: Arguments based on moral duties, rules, or rights (e.g., "Artists have an inherent right to control how their work is used, regardless of societal benefit")
          
          - Justice/Fairness: Arguments about fair distribution of benefits and burdens (e.g., "AI companies profit from artists' work without compensation, creating an unfair power imbalance")
          
          - Virtue Ethics: Arguments about character traits, intentions, and moral excellence (e.g., "Responsible AI developers should voluntarily obtain consent before using others' work")
          
          IMPORTANT CRITERIA - Only identify perspectives that:
          1. Clearly align with a specific ethical framework
          2. Represent substantive ethical reasoning (not just factual statements)
          3. Are directly stated by the student (not implied)
          4. Are specifically related to copyright and generative AI ethics
          
          If a statement is ambiguous or only tangentially related to ethics, DO NOT include it.`
        },
        {
          role: "user",
          content: `Analyze this classroom discussion for substantive ethical perspectives on generative AI and copyright:
          
          Discussion Topic: ${currentPoint.content}
          
          Transcript:
          ${transcript}
          
          Return ONLY clear ethical perspectives in this JSON format:
          {
            "perspectives": [
              {
                "framework": "string (one of: Utilitarian, Deontological, Justice, Virtue Ethics)",
                "quote": "string (exact quote from student)",
                "explanation": "string (explain how this demonstrates the ethical framework)",
              }
            ]
          }
          
          If no clear ethical perspectives are present, return an empty array for perspectives.`
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
      }>
    }

    try {
      parsedAnalysis = JSON.parse(analysis)
    } catch (e) {
      throw new Error(`Failed to parse analysis response: ${e}`)
    }
    
    // Add username information to perspectives by matching quotes
    const perspectivesWithUsernames = parsedAnalysis.perspectives.map(perspective => {
      // Find the message that contains this quote
      const matchingMessage = messages.find(msg => 
        perspective.quote.includes(msg.content) || 
        msg.content.includes(perspective.quote)
      );
      
      return {
        ...perspective,
        username: matchingMessage?.username || 'Unknown'
      };
    });
    
    // Only proceed with storage if there are actually perspectives found
    if (perspectivesWithUsernames.length > 0) {
      // Store in KV for immediate access
      const analysisKey = `ethical_analysis:${groupId}_${sessionId}_${currentPoint.index}`
      await kv.set(analysisKey, JSON.stringify({ perspectives: perspectivesWithUsernames }))
    
      // Save to database only if there are perspectives
      await kv.set(statusKey, 'Saving ethical perspectives to database...')
      await saveEthicalPerspectives(
        sessionId,
        groupId,
        currentPoint.index,
        perspectivesWithUsernames
      )
    } else {
      console.log('No ethical perspectives found in the analysis, skipping database save')
    }

    await kv.del(statusKey)
    return NextResponse.json({ 
      success: true,
      message: 'Ethical analysis completed',
      analysis: { perspectives: perspectivesWithUsernames }
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