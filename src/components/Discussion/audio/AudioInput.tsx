'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from "@/utils/supabase/client";
import { 
  SOCKET_STATES,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from '@/components/Discussion/audio/DeepgramContextProvider';

import { AudioInputProps } from "@/types"

const AudioInput: React.FC<AudioInputProps> = ({
  onMessageSubmit,
  userId,
  discussionId,
  disabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const keepAliveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const { 
    connection, 
    connectToDeepgram, 
    connectionState, 
    disconnectFromDeepgram,
    deepgramKey 
  } = useDeepgram();

  const checkPermissions = async () => {
    try {
      // First check if permissions are already granted
      const permissions = await navigator.mediaDevices.enumerateDevices();
      const audioPermission = permissions.some(device => device.kind === 'audioinput' && device.label !== '');
      
      if (audioPermission) {
        setHasPermission(true);
        return true;
      }

      // If not already granted, request permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setHasPermission(true);
      return true;
    } catch (error) {
      console.log('Error checking permissions:', error);
      setHasPermission(false);
      return false;
    }
  };

  const setupMicrophone = async () => {
    try {
      if (!hasPermission) {
        const permitted = await checkPermissions();
        if (!permitted) {
          throw new Error('Microphone permission denied');
        }
      }

      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        }
      });
      
      setMediaStream(userMedia);
      
      const mic = new MediaRecorder(userMedia, {
        mimeType: 'audio/webm'
      });
      
      mic.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      setMicrophone(mic);
      return mic;
    } catch (error) {
      console.log('Error setting up microphone:', error);
      throw error;
    }
  };

  // Initialize permissions and setup on mount
  // Split initialization into two phases
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Phase 1: Get permissions as soon as component mounts
  useEffect(() => {
    const getInitialPermissions = async () => {
      if (!disabled && !permissionGranted) {
        try {
          const permitted = await checkPermissions();
          setPermissionGranted(permitted);
        } catch (error) {
          console.log('Error getting initial permissions:', error);
        }
      }
    };

    getInitialPermissions();
  }, [disabled]);

  // Phase 2: Setup microphone and connect to Deepgram once we have permissions and Deepgram is ready
  useEffect(() => {
    const initialize = async () => {
      console.log('Initialize called with states:', {
        disabled,
        isInitialized,
        permissionGranted,
        hasDeepgramKey: !!deepgramKey,
        connectionState
      });
      
      if (!disabled && !isInitialized && permissionGranted && deepgramKey && connectionState === SOCKET_STATES.closed) {
        try {
          const mic = await setupMicrophone();
          if (mic) {
            await connectToDeepgram({
              model: 'nova-2',
              interim_results: true,
              smart_format: true,
              filler_words: true,
              utterance_end_ms: 3000,
            });
            setIsInitialized(true);
          }
        } catch (error) {
          console.log('Error in initialization:', error);
          cleanup();
        }
      }
    };

    initialize();
  }, [disabled, deepgramKey, isInitialized, permissionGranted, connectionState]);

  useEffect(() => {
    if (!microphone || !connection) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0 && connectionState === SOCKET_STATES.open) {
        connection?.send(e.data);
      }
    };

    const onTranscript = async (data: LiveTranscriptionEvent) => {
      console.log('Received transcript:', data);
      const { is_final: isFinal } = data;
      const transcript = data.channel.alternatives[0].transcript;
    
      if (transcript !== '' && isFinal) {
        setIsProcessing(true);
        try {
          await onMessageSubmit(transcript);
    
          try {
            console.log('Audio chunks available:', audioChunksRef.current.length);
            
            if (audioChunksRef.current.length === 0) {
              console.log('No audio chunks available');
              return;
            }
    
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            console.log('Created audio blob:', audioBlob.size, 'bytes');
            
            const pitchedAudioBlob = await pitchShiftAudio(audioBlob);
            console.log('Created pitched audio blob:', pitchedAudioBlob.size, 'bytes');
            
            const pitchedUrl = await uploadToSupabase(pitchedAudioBlob, true);
            console.log('Pitched audio uploaded:', pitchedUrl);
    
            const supabase = await createClient();
            await supabase
              .from('messages')
              .update({ 
                audio_url: pitchedUrl 
              })
              .eq('content', transcript)
              .eq('user_id', userId)
              .eq('session_id', discussionId)
              .order('created_at', { ascending: false })
              .limit(1);
            
            console.log('Message updated with audio URLs');
          } catch (error) {
            console.log('Error processing and uploading audio:', error);
            if (error instanceof Error) {
              console.log('Error details:', error.message);
              console.log('Error stack:', error.stack);
            }
          }
        } finally {
          setIsProcessing(false);
          audioChunksRef.current = [];
        }
      }
    };

    if (connectionState === SOCKET_STATES.open) {
      console.log('Adding event listeners');
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener('dataavailable', onData);
      microphone.start(250);
    }

    return () => {
      console.log('Removing event listeners');
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener('dataavailable', onData);
    };
  }, [connectionState, connection, microphone]);

  useEffect(() => {
    if (!connection) return;
    if (microphone?.state === 'recording' && connectionState === SOCKET_STATES.open) {
      connection.keepAlive();
      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    }
    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    };
  }, [connectionState, connection, microphone]);

  const uploadToSupabase = async (audioBlob: Blob, isPitched: boolean = false) => {
    try {
      const timestamp = new Date().toISOString();
      const filename = `recordings/${discussionId}/${userId}_${timestamp}${isPitched ? '_pitched' : ''}.webm`;
      const supabase = await createClient();
      const { error } = await supabase.storage
        .from('audio-recordings')
        .upload(filename, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600'
        });
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename);
      return publicUrl;
    } catch (error) {
      console.log('Error uploading audio:', error);
      throw error;
    }
  };

  const pitchShiftAudio = async (audioBlob: Blob, pitchFactor: number = 0.8): Promise<Blob> => {
    const audioContext = new AudioContext();
    const audioBuffer = await audioBlob.arrayBuffer()
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = pitchFactor;
    
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    const mediaDest = new MediaStreamAudioDestinationNode(audioContext);
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = renderedBuffer;
    bufferSource.connect(mediaDest);
    bufferSource.start();

    return new Promise((resolve) => {
      const processedRecorder = new MediaRecorder(mediaDest.stream);
      const processedChunks: Blob[] = [];
      processedRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          processedChunks.push(e.data);
        }
      };
      processedRecorder.onstop = () => {
        const processedBlob = new Blob(processedChunks, { type: 'audio/webm' });
        resolve(processedBlob);
      };
      processedRecorder.start();
      setTimeout(() => processedRecorder.stop(), renderedBuffer.duration * 1000 + 100);
    });
  };

  const handleMicClick = async () => {
    if (disabled) return;
    
    try {
      if (connectionState === SOCKET_STATES.open) {
        disconnectFromDeepgram();
        microphone?.stop();
        mediaStream?.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setMicrophone(null);
        setIsInitialized(false);
      } else {
        await setupMicrophone();
        await connectToDeepgram({
          model: 'nova-2',
          interim_results: true,
          smart_format: true,
          filler_words: true,
          utterance_end_ms: 3000,
        });
        setIsInitialized(true);
      }
    } catch (error) {
      console.log('Error in handleMicClick:', error);
      cleanup();
    }
  };

  const cleanup = () => {
    disconnectFromDeepgram();
    if (microphone) {
      microphone.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    setMediaStream(null);
    setMicrophone(null);
    setIsInitialized(false);
    audioChunksRef.current = [];
    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
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