'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  SOCKET_STATES,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from '@/components/Discussion/audio/DeepgramContextProvider';
import { AudioInputProps } from "@/types"
import { updateMessageWithAudioAndPoint } from '@/lib/actions/discussion'
import { uploadAudioToSupabase } from "@/lib/actions/audioUpload"
import { pitchShiftAudio } from "@/components/Discussion/audio/components/handleAudioPitch"

const AudioInput: React.FC<AudioInputProps> = ({
  onMessageSubmit,
  userId,
  discussionId,
  disabled = false,
  isTimeUp
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const streamingRecorderRef = useRef<MediaRecorder | null>(null);
  const utteranceRecorderRef = useRef<MediaRecorder | null>(null);
  const sessionRecorderRef = useRef<MediaRecorder | null>(null);
  const utteranceChunksRef = useRef<Blob[]>([]);
  const sessionChunksRef = useRef<Blob[]>([]);
  
  const { 
    connection, 
    connectToDeepgram, 
    connectionState, 
    disconnectFromDeepgram,
    deepgramKey 
  } = useDeepgram();

  const createStreamingRecorder = (stream: MediaStream) => {
    console.log('Creating streaming MediaRecorder');
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && connection && connectionState === SOCKET_STATES.open) {
        connection.send(e.data);
      }
    };
    
    streamingRecorderRef.current = recorder;
    return recorder;
  };

  const createUtteranceRecorder = (stream: MediaStream) => {
    console.log('Creating utterance MediaRecorder');
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        utteranceChunksRef.current.push(e.data);
      }
    };
    
    utteranceRecorderRef.current = recorder;
    return recorder;
  };

  const createSessionRecorder = (stream: MediaStream) => {
    console.log('Creating session MediaRecorder');
    const recorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        sessionChunksRef.current.push(e.data);
      }
    };
    
    sessionRecorderRef.current = recorder;
    return recorder;
  };

  // Handle session end and upload
  useEffect(() => {
    const handleSessionEnd = async () => {
      if (isTimeUp && sessionRecorderRef.current?.state === 'recording') {
        console.log('Session ending, processing full recording...');
        sessionRecorderRef.current.stop();
        
        // Wait briefly for final chunks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (sessionChunksRef.current.length > 0) {
          const sessionBlob = new Blob(sessionChunksRef.current, {
            type: 'audio/webm;codecs=opus'
          });

          try {
            // Pitch shift the full session audio
            const pitchedSessionBlob = await pitchShiftAudio(sessionBlob);
            
            // Upload the full session recording
            const sessionUrl = await uploadAudioToSupabase(
              pitchedSessionBlob,
              discussionId,
              userId,
              'full_session'  
            );
            console.log('Full session upload completed:', sessionUrl);
          } catch (error) {
            console.log('Session upload error:', error);
          }
        }
      }
    };

    handleSessionEnd();
  }, [isTimeUp, discussionId, userId]);

  // Add effect to stop recording when discussion ends
  useEffect(() => {
    if (isTimeUp) {
      if (connectionState === SOCKET_STATES.open) {
        disconnectFromDeepgram();
        [streamingRecorderRef, utteranceRecorderRef, sessionRecorderRef].forEach(ref => {
          if (ref.current?.state === 'recording') {
            ref.current.stop();
          }
        });
        mediaStream?.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        utteranceChunksRef.current = [];
        sessionChunksRef.current = [];
      }
    }
  }, [isTimeUp]);

  useEffect(() => {
    const initializeAudio = async () => {
      if (!disabled && !mediaStream && deepgramKey) {
        try {
          console.log('Getting user media...');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression: true,
              echoCancellation: true,
            }
          });
          
          setMediaStream(stream);
          
          // Start session recording immediately
          const sessionRecorder = createSessionRecorder(stream);
          sessionRecorder.start();
          
          await connectToDeepgram({
            model: 'nova-2',
            interim_results: true,
            smart_format: true,
            filler_words: true,
            utterance_end_ms: 3000,
          });
          
        } catch (error) {
          console.log('Error initializing audio:', error);
        }
      }
    };

    initializeAudio();
  }, [disabled, deepgramKey]);

  useEffect(() => {
    if (!mediaStream || !connection) return;

    if (connectionState === SOCKET_STATES.open) {
      console.log('Starting new recording session');
      // Create and start both recorders
      const streamingRecorder = createStreamingRecorder(mediaStream);
      const utteranceRecorder = createUtteranceRecorder(mediaStream);
      
      streamingRecorder.start(250); // Smaller chunks for streaming
      utteranceRecorder.start(); // Don't specify timeslice for utterance recorder
    } else {
      // Stop both recorders
      if (streamingRecorderRef.current?.state === 'recording') {
        streamingRecorderRef.current.stop();
      }
      if (utteranceRecorderRef.current?.state === 'recording') {
        utteranceRecorderRef.current.stop();
      }
    }
  }, [connectionState, connection, mediaStream]);

  const onTranscript = async (data: LiveTranscriptionEvent) => {
    const { is_final: isFinal } = data;
    const transcript = data.channel.alternatives[0].transcript;
   
    if (isFinal && transcript && transcript.trim() !== '') {
      console.log('Processing final transcript:', transcript);
      setIsProcessing(true);
      
      try {
        // Stop current utterance recording
        if (utteranceRecorderRef.current?.state === 'recording') {
          utteranceRecorderRef.current.stop();
        }

        // Submit transcript
        await onMessageSubmit(transcript);
        
        // Wait a short moment for any final chunks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Process audio if we have chunks
        if (utteranceChunksRef.current.length > 0) {
          const audioBlob = new Blob(utteranceChunksRef.current, { 
            type: 'audio/webm;codecs=opus'
          });
   
          // Handle audio upload
          (async () => {
            try {
              // Pitch audio down
              const pitchedAudioBlob = await pitchShiftAudio(audioBlob);

              // Upload pitched down audio
              const pitchedUrl = await uploadAudioToSupabase(pitchedAudioBlob, discussionId, userId);
              console.log('Upload completed:', pitchedUrl);
              
              // Update message with audio URL
              await updateMessageWithAudioAndPoint(
                discussionId,
                userId,
                transcript,
                pitchedUrl
              );
            } catch (error) {
              console.log('Upload error:', error);
            }
          })();
        }

        // Clear chunks and start new utterance recording
        utteranceChunksRef.current = [];
        if (mediaStream) {
          const newUtteranceRecorder = createUtteranceRecorder(mediaStream);
          newUtteranceRecorder.start();
        }
      } catch (error) {
        console.log('Error in transcript handling:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  useEffect(() => {
    if (!connection) return;
    
    connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
    
    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
    };
  }, [connection]);

  const handleMicClick = async () => {
    if (disabled) return;
    
    try {
      if (connectionState === SOCKET_STATES.open) {
        disconnectFromDeepgram();
        // Stop both recorders
        if (streamingRecorderRef.current?.state === 'recording') {
          streamingRecorderRef.current.stop();
        }
        if (utteranceRecorderRef.current?.state === 'recording') {
          utteranceRecorderRef.current.stop();
        }
        if (sessionRecorderRef.current?.state === 'recording') {
          sessionRecorderRef.current.stop();
        }
        mediaStream?.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        utteranceChunksRef.current = [];
        sessionChunksRef.current = [];
        streamingRecorderRef.current = null;
        utteranceRecorderRef.current = null;
        sessionRecorderRef.current = null;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
          }
        });
        setMediaStream(stream);
        
        // Start session recording immediately
        const sessionRecorder = createSessionRecorder(stream);
        sessionRecorder.start();
        
        await connectToDeepgram({
          model: 'nova-2',
          interim_results: true,
          smart_format: true,
          filler_words: true,
          utterance_end_ms: 3000,
        });
      }
    } catch (error) {
      console.log('Error toggling microphone:', error);
    }
  };

  useEffect(() => {
    return () => {
      disconnectFromDeepgram();
      [streamingRecorderRef, utteranceRecorderRef, sessionRecorderRef].forEach(ref => {
        if (ref.current?.state === 'recording') {
          ref.current.stop();
        }
      });
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <Button
      onClick={handleMicClick}
      variant={connectionState === SOCKET_STATES.open ? "destructive" : "secondary"}
      size="icon"
      className={`flex-shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : connectionState === SOCKET_STATES.open ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
};

export default AudioInput;