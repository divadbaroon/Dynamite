'use server'

import OpenAI from 'openai'

export async function transcribeAudio(formData: FormData) {
  try {
    const audioFile = formData.get('audio') as Blob
    if (!audioFile) {
      throw new Error('No audio file provided')
    }

    // Log the audio file details for debugging
    console.log('Audio file type:', audioFile.type)
    console.log('Audio file size:', audioFile.size)

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Convert Blob to File object with a name and type
    const file = new File([audioFile], 'audio.webm', { type: audioFile.type })

    // Send to OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: file,
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["word"]
    })

    console.log('Whisper response:', JSON.stringify(transcription, null, 2))

    return {
      success: true,
      transcript: transcription.text || null,
      // Include additional data if needed
      segments: transcription.segments,
      words: transcription.words
    }
  } catch (error) {
    console.log('Full transcription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio'
    }
  }
}