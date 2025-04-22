'use server'

import { createClient } from '@/utils/supabase/server'
import stringSimilarity from 'string-similarity'

export async function updateCommonAnalysis(
  sessionId: string,
  analysisType: 'ethical_perspective' | 'group_answer',
  content: string,
  framework?: string,
) {
  const supabase = await createClient()
  
  try {
    // First, fetch existing entries of the same type
    const { data, error: fetchError } = await supabase
      .from('common_analysis')
      .select('*')
      .eq('session_id', sessionId)
      .eq('analysis_type', analysisType)
    
    if (fetchError) throw fetchError
    
    // Explicitly define the type of existingItems
    const existingItems: any[] = data || [];
    
    // Find the most similar item based on framework or content
    let bestMatch: any = null;
    let bestScore = 0;
    const similarityThreshold = 0.7;

    for (const item of existingItems) {
      let similarityScore = 0;
      
      // For ethical perspectives, compare frameworks
      if (analysisType === 'ethical_perspective' && framework && item.framework) {
        similarityScore = stringSimilarity.compareTwoStrings(
          framework.toLowerCase(),
          item.framework.toLowerCase()
        );
      } 
      // Otherwise compare content
      else {
        similarityScore = stringSimilarity.compareTwoStrings(
          content.toLowerCase(),
          item.content.toLowerCase()
        );
      }
      
      if (similarityScore > bestScore && similarityScore >= similarityThreshold) {
        bestScore = similarityScore;
        bestMatch = item;
      }
    }
    
    const now = new Date().toISOString();
    
    if (bestMatch) {
      // Found a similar item, update its frequencies
      // Use any to bypass TypeScript checking
      const currentFrequencies: any[] = bestMatch.frequencies || [];
      
      // Add the new frequency entry
      const newFrequencies = [
        ...currentFrequencies,
        { frequency: currentFrequencies.length + 1, timestamp: now }
      ];
      
      // Update the existing record
      const { error: updateError } = await supabase
        .from('common_analysis')
        .update({
          frequencies: newFrequencies,
          updated_at: now
        })
        .eq('id', bestMatch.id);
      
      if (updateError) throw updateError;
      
      return { id: bestMatch.id, isNew: false, error: null };
    } else {
      // No similar item found, create a new one
      const newItem = {
        session_id: sessionId,
        analysis_type: analysisType,
        content: content,
        framework: framework || null,
        frequencies: [{ frequency: 1, timestamp: now }]
      };
      
      const { data: newData, error: insertError } = await supabase
        .from('common_analysis')
        .insert(newItem)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Use optional chaining and type assertions to safely access properties
      const newId = newData ? (newData as any).id : null;
      
      return { id: newId, isNew: true, error: null };
    }
  } catch (error) {
    console.error('Error updating common analysis:', error);
    return { id: null, isNew: null, error };
  }
}

export async function getCommonAnalysisBySession(
  sessionId: string,
  analysisType?: 'ethical_perspective' | 'group_answer'
) {
  const supabase = await createClient();
  
  try {
    let query = supabase
      .from('common_analysis')
      .select('framework, frequencies, analysis_type, content')
      .eq('session_id', sessionId);
    
    if (analysisType) {
      query = query.eq('analysis_type', analysisType);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    // Define the FrequencyEntry interface
    interface FrequencyEntry {
      frequency: number;
      timestamp: string;
    }
    
    // Initialize structures with proper types
    const frameworks: Record<string, FrequencyEntry[]> = {};
    const groupAnswers: Record<string, FrequencyEntry[]> = {};
    
    // Process the data
    if (data && data.length > 0) {
      data.forEach((item: any) => {
        if (item.analysis_type === 'ethical_perspective' && item.framework) {
          // Add framework with its frequencies directly
          frameworks[item.framework] = item.frequencies;
        } 
        else if (item.analysis_type === 'group_answer') {
          // Use the truncated content as the key
          const truncatedContent = item.content.substring(0, 30) + (item.content.length > 30 ? '...' : '');
          groupAnswers[truncatedContent] = item.frequencies;
          
          // Also store using a special key format that includes the full text
          // Format: "truncated_text|FULL_TEXT_MARKER|full_text"
          const specialKey = truncatedContent + '|FULL_TEXT_MARKER|' + item.content;
          groupAnswers[specialKey] = []; 
        }
      });
    }
    
    // Return just the frameworks and frequencies
    return { 
      data: {
        frameworks,
        groupAnswers
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error fetching common analysis:', error);
    return { data: null, error };
  }
}