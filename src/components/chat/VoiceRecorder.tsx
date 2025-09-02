/**
 * Voice Recorder Component - WhatsApp-style voice notes
 * Records, plays, and sends voice messages
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Send, X, Trash2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

interface VoiceRecorderProps {
  onSend?: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  autoStart?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel, autoStart = false }) => {
  const { activeConversationId, updateRecording } = useChatStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { sendMessage } = useChatStore();

  // Auto-start recording if autoStart is true
  useEffect(() => {
    if (autoStart && !isRecording && !audioBlob) {
      const timer = setTimeout(() => {
        startRecording();
      }, 100); // Small delay to ensure component is mounted
      return () => clearTimeout(timer);
    }
  }, []); // Run only once on mount

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Emit recording start event
      if (activeConversationId) {
        updateRecording(activeConversationId, true);
      }
      
      // Set up audio analysis for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Check for supported mime types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      mimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        // Stream tracks are now stopped in stopRecording() to ensure immediate release
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start waveform animation
      updateWaveform();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const updateWaveform = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    // Sample the waveform data
    const samples = [];
    const sampleSize = Math.floor(dataArray.length / 50);
    for (let i = 0; i < 50; i++) {
      const sample = dataArray[i * sampleSize];
      samples.push(Math.abs(sample - 128) / 128);
    }
    
    setWaveformData(prev => [...prev.slice(-49), ...samples].slice(-50));
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Emit recording stop event
      if (activeConversationId) {
        updateRecording(activeConversationId, false);
      }
      
      // Stop all audio tracks immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioUrl && !isPlaying) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.play();
      setIsPlaying(true);
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSend = async () => {
    if (audioBlob) {
      // Ensure recording indicator is cleared
      if (activeConversationId) {
        updateRecording(activeConversationId, false);
      }
      
      // Convert to base64 for sending
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        // Send voice message
        await sendMessage(base64Audio, 'voice', {
          duration: recordingTime,
          mimeType: mimeTypeRef.current
        });
        
        if (onSend) {
          onSend(audioBlob, recordingTime);
        }
        
        resetRecorder();
      };
      reader.readAsDataURL(audioBlob);
    }
  };

  const resetRecorder = () => {
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setWaveformData([]);
    
    // Ensure all resources are cleaned up
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    stopRecording();
    resetRecorder();
    
    // Ensure recording indicator is cleared
    if (activeConversationId) {
      updateRecording(activeConversationId, false);
    }
    
    if (onCancel) onCancel();
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
      {!isRecording && !audioBlob && !autoStart && (
        <button
          onClick={startRecording}
          className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          title="Start recording"
        >
          <Mic className="w-5 h-5 text-white" />
        </button>
      )}

      {isRecording && (
        <>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
          
          <div className="flex-1 flex items-center gap-2">
            {/* Recording indicator */}
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            
            {/* Waveform visualization */}
            <div className="flex-1 flex items-center gap-[2px] h-8">
              {Array.from({ length: 50 }).map((_, i) => {
                const height = waveformData[i] || 0.1;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500 rounded-full transition-all duration-100"
                    style={{
                      '--wave-height': `${Math.max(4, height * 32)}px`,
                      '--wave-opacity': 0.5 + height * 0.5,
                      height: 'var(--wave-height)',
                      opacity: 'var(--wave-opacity)'
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
            
            {/* Timer */}
            <span className="text-sm font-mono text-gray-300">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          <button
            onClick={stopRecording}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            title="Stop recording"
          >
            <Square className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
          
          <button
            onClick={playAudio}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>
          
          <div className="flex-1 flex items-center gap-2">
            {/* Static waveform for recorded audio */}
            <div className="flex-1 flex items-center gap-[2px] h-8">
              {waveformData.map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-green-500 rounded-full"
                  style={{
                    '--wave-height': `${Math.max(4, height * 32)}px`,
                    '--wave-opacity': 0.5 + height * 0.5,
                    height: 'var(--wave-height)',
                    opacity: 'var(--wave-opacity)'
                  } as React.CSSProperties}
                />
              ))}
            </div>
            
            <span className="text-sm font-mono text-gray-300">
              {formatTime(recordingTime)}
            </span>
          </div>
          
          <button
            onClick={handleSend}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            title="Send voice message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;