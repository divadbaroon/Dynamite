'use server'

import { createClient } from '@/utils/supabase/server';

export async function uploadAudioToSupabase(
  audioBlob: Blob,
  discussionId: string,
  userId: string
): Promise<string> {
  try {

    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error('Invalid audio blob: empty or null');
    }
    if (!discussionId || !userId) {
      throw new Error('Missing required parameters');
    }

    const supabase = await createClient()
    
    // Get session server-side
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication required');
    }

    const timestamp = new Date().toISOString();
    const filename = `recordings/${discussionId}/${userId}_${timestamp}.webm`;

    // Convert Blob to Buffer for server-side upload
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(filename, buffer, {
        contentType: 'audio/webm',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.log('Upload error details:', uploadError);
      throw uploadError;
    }

    if (!uploadData) {
      throw new Error('Upload succeeded but no data returned');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('audio-recordings')
      .getPublicUrl(filename);

    if (!publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return publicUrl;
  } catch (error) {
    console.log('Audio upload error:', error);
    throw error;
  }
}