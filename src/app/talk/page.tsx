'use client';

import { useState, useEffect, useRef } from 'react';
import { useProfiles } from '@/contexts/ProfileContext';
import { useAuth0 } from '@/contexts/Auth0Context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cleanupAllAudioResources } from '@/lib/audio-cleanup';
import { ChatLog } from '@/types/chatLog';
import { students } from '@/lib/students';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function TalkPage() {
  const { activeProfile, isLoading, setActiveProfile } = useProfiles();
  const { user, isLoading: authLoading } = useAuth0();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [hasUserSpoken, setHasUserSpoken] = useState(false);
  const [userVideoStream, setUserVideoStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(() => new Array(8).fill(0));
  const [audioAnalysisWorking, setAudioAnalysisWorking] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechTimeout, setSpeechTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(3);
  const [hasLoggedSession, setHasLoggedSession] = useState(false);
  const [lastSpeechTime, setLastSpeechTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio analysis function
  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Check if we're getting any audio data
    const totalLevel = dataArray.reduce((sum, val) => sum + val, 0);
    const hasAudio = totalLevel > 0;
    
    if (hasAudio && !audioAnalysisWorking) {
      setAudioAnalysisWorking(true);
    }

    // Check for user speech activity to interrupt AI
    if (hasAudio && isSpeaking && micEnabled) {
      const currentTime = Date.now();
      setLastSpeechTime(currentTime);
      
      // If we detect audio while AI is speaking, interrupt it
      if (totalLevel > 50) { // Threshold for speech detection
        console.log('Audio detected while AI speaking - interrupting');
        stopAllSpeech();
      }
    }

    // Map frequency data to 8 bars with better frequency distribution
    const newLevels = new Array(8).fill(0);
    
    // Use logarithmic distribution for better frequency representation
    const freqBins = [0, 1, 2, 4, 8, 16, 32, 64]; // Frequency bin indices
    
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      let count = 0;
      
      // Sample from specific frequency ranges
      const startBin = Math.floor((freqBins[i] / 128) * bufferLength);
      const endBin = Math.floor((freqBins[i + 1] ? (freqBins[i + 1] / 128) : 1) * bufferLength);
      
      for (let j = startBin; j < endBin && j < bufferLength; j++) {
        sum += dataArray[j];
        count++;
      }
      
      if (count > 0) {
        // Normalize and apply some boost for better visibility
        newLevels[i] = Math.min((sum / count) / 255 * 3, 1);
      }
    }

    setAudioLevels(prevLevels => 
      prevLevels.map((prev, i) => 
        prev * 0.6 + newLevels[i] * 0.4 // More responsive smoothing
      )
    );

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  // Initialize audio context and analyser
  const initializeAudioAnalysis = async () => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    try {
      // Don't initialize if already running
      if (analyserRef.current && audioContextRef.current?.state === 'running') {
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream; // Store the stream for cleanup
      
      // Resume audio context if it's suspended, or create new one if closed/doesn't exist
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      } else if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.3; // Less smoothing for more responsive bars
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      
      microphoneRef.current.connect(analyserRef.current);
      
      // Start analysis
      analyzeAudio();
    } catch (err) {
      console.log('Audio analysis not available:', err);
    }
  };

  // Stop audio analysis
  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (microphoneRef.current) {
      try {
        microphoneRef.current.disconnect();
      } catch (err) {
        console.log('Microphone disconnect error:', err);
      }
      microphoneRef.current = null;
    }
    // Stop the microphone stream
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Microphone track stopped');
      });
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (err) {
        console.log('AudioContext close error:', err);
      }
      audioContextRef.current = null;
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
        setRetryCount(0); // Reset retry count on successful start
      };

      recognitionRef.current.onresult = async (event) => {
        console.log('Speech recognition result event:', event);
        
        // If AI is speaking, immediately stop speech recognition to prevent interference
        if (isSpeaking) {
          console.log('AI is speaking - ignoring speech recognition results');
          return;
        }
        
        // Check for interim results to detect interruption
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          console.log('Speech result:', result, 'isFinal:', result.isFinal, 'transcript:', transcript);
          
          if (!result.isFinal) {
            // User is speaking (interim result) - stop AI if it's speaking
            if (isSpeaking && transcript.trim().length > 0) {
              console.log('User interrupting AI - stopping speech synthesis');
              stopAllSpeech();
            }
            // Show interim transcript
            setInterimTranscript(transcript);
          } else {
            // Final result - process the message
            console.log('Final transcript:', transcript);
            if (transcript.trim()) {
              setHasUserSpoken(true);
              setInterimTranscript('');
              console.log('Calling handleUserMessage with:', transcript);
              await handleUserMessage(transcript);
            }
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different error types
        switch (event.error) {
          case 'network':
            setError('Network error: Please check your internet connection and try again.');
            break;
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone access and refresh the page.');
            break;
          case 'no-speech':
            setError('No speech detected. Please try speaking again.');
            break;
          case 'audio-capture':
            setError('No microphone found. Please connect a microphone and try again.');
            break;
          case 'service-not-allowed':
            setError('Speech recognition service not allowed. Please check your browser settings.');
            break;
          default:
            setError(`Speech recognition error: ${event.error}. Please try again.`);
        }
        
        setIsListening(false);
        
        // Try to restart recognition after a delay for recoverable errors
        if (['network', 'no-speech'].includes(event.error) && retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            if (micEnabled && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.log('Failed to restart speech recognition:', err);
              }
            }
          }, 2000 * (retryCount + 1)); // Exponential backoff
        } else if (retryCount >= maxRetries) {
          setError('Speech recognition failed after multiple attempts. Please refresh the page and try again.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Restart recognition if microphone is enabled and we're not processing/speaking
        if (micEnabled && !isProcessing && !isSpeaking) {
          setTimeout(() => {
            if (recognitionRef.current && micEnabled && !isListening) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.log('Speech recognition restart failed:', err);
              }
            }
          }, 100);
        }
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Start call timer
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);


    return () => {
      console.log('Component unmounting - cleaning up all resources');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      stopAllSpeech();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (speechTimeout) {
        clearTimeout(speechTimeout);
      }
      if (userVideoStream) {
        userVideoStream.getTracks().forEach(track => track.stop());
      }
      stopAudioAnalysis();
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (err) {
          console.log('AudioContext close error on unmount:', err);
        }
        audioContextRef.current = null;
      }
      // Clear all refs
      synthRef.current = null;
      analyserRef.current = null;
      microphoneRef.current = null;
      microphoneStreamRef.current = null;
    };
  }, []);

  // Dashboard student selection is now handled in ProfileContext to prevent race conditions

  // Profile is loaded, ready for conversation
  useEffect(() => {
    if (!isLoading && activeProfile) {
      console.log(`Profile loaded: ${activeProfile.name} - ${activeProfile.subject} - ID: ${activeProfile.id}`);
    }
  }, [activeProfile, isLoading]);

  // Handle page exit - log chat session before leaving
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('Before unload - cleaning up resources');
      // Stop all audio and speech immediately
      stopAllSpeech();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudioAnalysis();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Stop camera if active
      if (userVideoStream) {
        userVideoStream.getTracks().forEach(track => track.stop());
      }
      
      if (!hasLoggedSession && activeProfile && messages.length > 0 && user) {
        // Use sendBeacon for more reliable logging on page exit
        const data = JSON.stringify({
          userId: user._id,
          studentId: activeProfile.id,
          studentName: activeProfile.name,
          studentSubject: activeProfile.subject,
          transcript: messages,
          conversationLength: callDuration
        });
        
        navigator.sendBeacon('/api/chat/log', data);
      }
      
      // Global cleanup to ensure all audio resources are released
      cleanupAllAudioResources();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden - cleaning up audio resources');
        // Stop all audio and speech immediately
        stopAllSpeech();
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        stopAudioAnalysis();
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
            audioContextRef.current = null;
          } catch (err) {
            console.log('AudioContext close error:', err);
          }
        }
        if (userVideoStream) {
          userVideoStream.getTracks().forEach(track => track.stop());
        }
        
        if (!hasLoggedSession && activeProfile && messages.length > 0 && user) {
          logChatSession();
        }
        
        // Global cleanup to ensure all audio resources are released
        cleanupAllAudioResources();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasLoggedSession, activeProfile, messages, callDuration, user]);

  const toggleCamera = async () => {
    if (cameraEnabled) {
      // Turn off camera
      if (userVideoStream) {
        userVideoStream.getTracks().forEach(track => track.stop());
        setUserVideoStream(null);
      }
      setCameraEnabled(false);
      setWebcamError(null);
    } else {
      // Turn on camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 },
          audio: false 
        });
        setUserVideoStream(stream);
        setWebcamError(null);
        setCameraEnabled(true);
        
        // Set the video source once the stream is available
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.log('Webcam access denied or not available:', err);
        setWebcamError('Camera not available');
        setCameraEnabled(false);
      }
    }
  };

  // Update video source when stream changes
  useEffect(() => {
    if (videoRef.current && userVideoStream) {
      videoRef.current.srcObject = userVideoStream;
    }
  }, [userVideoStream]);

  // Debug microphone state changes
  useEffect(() => {
    console.log('Microphone state changed - micEnabled:', micEnabled, 'isListening:', isListening);
  }, [micEnabled, isListening]);

  const handleUserMessage = async (text: string) => {
    console.log('handleUserMessage called with text:', text);
    console.log('handleUserMessage - isLoading:', isLoading, 'activeProfile:', activeProfile);
    
    // Don't process messages while loading
    if (isLoading) {
      console.log('handleUserMessage: Still loading, ignoring message');
      return;
    }
    
    // Check if we have an active profile
    if (!activeProfile?.id) {
      console.log('handleUserMessage: No active profile, setting error');
      setError('No student profile selected. Please select a student profile first.');
      return;
    }
    
    console.log('handleUserMessage: Processing message for profile:', activeProfile.name);

    // Stop AI speech if it's currently speaking (user interruption)
    if (isSpeaking) {
      console.log('Stopping AI speech due to user interruption');
      stopAllSpeech();
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Turn off microphone immediately after user message is registered
    turnMicOff();
    
    setIsProcessing(true);
    
    // Ensure microphone stays off during processing and speaking
    if (micEnabled) {
      turnMicOff();
    }

    try {
      console.log('Sending request with studentId:', activeProfile.id);
      console.log('Current conversation history length:', messages.length);
      console.log('Sending last 10 messages:', messages.slice(-10));
      console.log('User ID for session history:', user?._id || 'demo-user-id');
      
      // Send to AI API with conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text,
          studentId: activeProfile.id,
          conversationHistory: messages.slice(-10), // Send last 10 messages for context
          userId: user?._id || 'demo-user-id' // Pass user ID for session history
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${errorData.error || 'Failed to get AI response'}`);
      }

      const data = await response.json();
      
      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the response
      speakText(data.response);
      
    } catch (err) {
      console.error('Error getting AI response:', err);
      setError(`Failed to get AI response: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopAllSpeech = () => {
    if (synthRef.current) {
      // Cancel all pending speech
      synthRef.current.cancel();
      // Force stop by pausing and resuming then canceling again
      synthRef.current.pause();
      synthRef.current.resume();
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current) {
      // Stop any existing speech before starting new one
      stopAllSpeech();
      
      setIsSpeaking(true);
      
      // ALWAYS turn off microphone when AI starts speaking to prevent feedback loop
      console.log('AI starting to speak - turning off microphone');
      turnMicOff();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => {
        console.log('AI started speaking - microphone should be muted');
        // Double-check microphone is off when AI actually starts speaking
        if (isListening) {
          console.log('Force stopping speech recognition during AI speech');
          turnMicOff();
        }
      };
      
      utterance.onend = () => {
        console.log('AI finished speaking');
        setIsSpeaking(false);
        // Add a small delay before turning microphone back on to prevent immediate feedback
        setTimeout(() => {
          console.log('AI finished speaking - turning microphone back on after delay');
          turnMicOn();
        }, 500); // 500ms delay
      };
      
      utterance.onerror = (event) => {
        // Don't log "interrupted" as an error since it's expected when user interrupts
        if (event.error !== 'interrupted') {
          console.error('Speech synthesis error:', event.error);
        }
        setIsSpeaking(false);
        // Add a small delay before turning microphone back on
        setTimeout(() => {
          console.log('AI speech error - turning microphone back on after delay');
          turnMicOn();
        }, 500); // 500ms delay
      };
      
      synthRef.current.speak(utterance);
    }
  };

  const turnMicOff = () => {
    console.log('turnMicOff called - disabling microphone');
    
    // Force stop speech recognition immediately
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped');
      } catch (err) {
        console.log('Error stopping speech recognition:', err);
      }
    }
    
    // Stop audio analysis
    stopAudioAnalysis();
    
    // Update state
    setMicEnabled(false);
    setIsListening(false);
    setAudioLevels(new Array(8).fill(0));
    setInterimTranscript(''); // Clear any interim transcript
    
    console.log('Microphone disabled - micEnabled set to false');
  };

  const turnMicOn = async () => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Don't turn on microphone if AI is currently speaking
    if (isSpeaking) {
      console.log('Cannot turn on microphone - AI is currently speaking');
      return;
    }
    
    console.log('turnMicOn called - enabling microphone');
    setMicEnabled(true);
    await initializeAudioAnalysis();
    
    // Start audio recording when first turning on mic (if not already recording)
    if (!isRecording) {
      await startAudioRecording();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Microphone enabled - micEnabled set to true');
      } catch (err) {
        console.log('Speech recognition start failed:', err);
      }
    }
  };

  const toggleMicrophone = async () => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    console.log('toggleMicrophone called, current micEnabled:', micEnabled);
    
    if (micEnabled) {
      // Turn off microphone
      console.log('Turning off microphone');
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      stopAudioAnalysis();
      setMicEnabled(false);
      setIsListening(false);
      setAudioLevels(new Array(8).fill(0));
      console.log('Microphone toggled OFF - micEnabled should be false');
    } else {
      // Turn on microphone
      console.log('Turning on microphone');
      setMicEnabled(true);
      await initializeAudioAnalysis();
      if (recognitionRef.current) {
        try {
          console.log('Starting speech recognition...');
          recognitionRef.current.start();
        } catch (err) {
          console.log('Speech recognition start failed:', err);
        }
      } else {
        console.log('recognitionRef.current is null');
      }
      console.log('Microphone toggled ON - micEnabled should be true');
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && micEnabled) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setHasUserSpoken(false);
    setCallDuration(0);
    setInterimTranscript('');
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      setSpeechTimeout(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startAudioRecording = async () => {
    try {
      console.log('Attempting to start audio recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        console.log('Audio data available, size:', event.data.size);
        if (event.data.size > 0) {
          setAudioChunks(prev => {
            const newChunks = [...prev, event.data];
            console.log('Total audio chunks:', newChunks.length);
            return newChunks;
          });
        }
      };
      
      recorder.onstart = () => {
        console.log('MediaRecorder started');
      };
      
      recorder.onstop = () => {
        console.log('MediaRecorder stopped');
      };
      
      recorder.start(1000); // Record in 1-second chunks
      setAudioRecorder(recorder);
      setIsRecording(true);
      console.log('Audio recording started successfully');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      setError('Could not start audio recording');
    }
  };

  const stopAudioRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (audioRecorder && audioRecorder.state !== 'inactive') {
        console.log('Stopping audio recording...');
        
        audioRecorder.onstop = () => {
          console.log('Audio recording stopped, total chunks:', audioChunks.length);
          audioRecorder.stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          resolve();
        };
        
        audioRecorder.stop();
      } else {
        setIsRecording(false);
        resolve();
      }
    });
  };

  const getAudioBlob = (): Blob | null => {
    if (audioChunks.length > 0) {
      return new Blob(audioChunks, { type: 'audio/webm' });
    }
    return null;
  };

  const logChatSession = async () => {
    if (hasLoggedSession || !activeProfile || messages.length === 0 || !user) {
      console.log('Early return from logChatSession:', { hasLoggedSession, activeProfile: !!activeProfile, messageCount: messages.length });
      return { success: false };
    }

    try {
      setHasLoggedSession(true);
      
      const response = await fetch('/api/chat/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user._id,
          studentId: activeProfile.id,
          studentName: activeProfile.name,
          studentSubject: activeProfile.subject,
          transcript: messages,
          conversationLength: callDuration
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Chat session logged successfully:', data);
        return { success: true, caseId: data.id }; // Return success status with case ID
      } else {
        console.error('Failed to log chat session');
        return { success: false };
      }
    } catch (error) {
      console.error('Error logging chat session:', error);
      return { success: false };
    }
  };

  const endCall = async () => {
    // Show loading state
    setIsProcessing(true);
    setError("Ending session and generating feedback...");
    
    // Prevent beforeunload handler from interfering
    setHasLoggedSession(true);
    
    // Stop all audio/speech immediately and clean up handlers
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Additional stop for speech synthesis
    }
    if (timerRef.current) {
      console.log('Clearing timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop audio analysis immediately (this now includes microphone stream cleanup)
    console.log('Stopping audio analysis and microphone stream');
    stopAudioAnalysis();
    await stopAudioRecording(); // Stop audio recording and wait for completion
    setIsListening(false);
    setIsSpeaking(false);
    setMicEnabled(false);
    setCameraEnabled(false);
    setAudioLevels(new Array(8).fill(0));
    setHasUserSpoken(false);
    setInterimTranscript('');
    setWebcamError(null);
    
    // Log the chat session manually since we bypassed logChatSession's early return
    if (!activeProfile || messages.length === 0) {
      console.log('No data to log, redirecting to home');
      setError(null);
      setIsProcessing(false);
      router.push('/');
      return;
    }

    try {
      setError("Saving conversation...");
      
      // Convert audio to base64 if available
      let audioData = null;
      const audioBlob = getAudioBlob();
      console.log('Audio blob:', audioBlob, 'Chunks:', audioChunks.length);
      if (audioBlob) {
        setError("Processing audio recording...");
        audioData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log('Audio data processed, size:', (reader.result as string).length);
            resolve(reader.result as string);
          };
          reader.readAsDataURL(audioBlob);
        });
      } else {
        console.log('No audio blob available');
      }
      
      const response = await fetch('/api/chat/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?._id,
          studentId: activeProfile.id,
          studentName: activeProfile.name,
          studentSubject: activeProfile.subject,
          transcript: messages,
          conversationLength: callDuration,
          audioData: audioData
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setError("Generating AI feedback...");
        console.log('Chat session logged successfully, redirecting to:', `/review/${data.sessionId}`);
        
        // Small delay to show the feedback generation message
        setTimeout(() => {
          router.push(`/review/${data.sessionId}`);
        }, 1000);
      } else {
        console.error('Failed to log chat session, redirecting to home');
        setError('Failed to save session');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Error logging chat session:', error);
      setError('Error saving session');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  };

  // Check authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600">Please wait while we load your session.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to start a tutoring session.</p>
          <div className="space-x-4">
            <Link 
              href="/api/auth/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Login with Auth0
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Profile...</h1>
          <p className="text-gray-600">Please wait while we load your student profile.</p>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Profile Selected</h1>
          <p className="text-gray-600 mb-6">Please select a student profile to start the voice chat session.</p>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Video Call Interface */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Video Panels */}
          <div className="relative h-[600px] bg-gray-200 flex">
            {/* AI Panel (Left) */}
            <div className="flex-1 m-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center relative">
              <div className="text-center text-white">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">AI Assistant</p>
                {(isSpeaking || isProcessing) && (
                  <div className="mt-2 flex justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>

            {/* User Panel (Right) */}
            <div className="flex-1 m-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden">
              {cameraEnabled && userVideoStream ? (
                <div className="w-full h-full relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute bottom-2 left-2 text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                    You
                  </div>
                  {micEnabled && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white">
                  <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium">You</p>
                  {micEnabled && (
                    <div className="mt-2 flex justify-center">
                      <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    </div>
                  )}
                  {interimTranscript && (
                    <div className="mt-2 text-sm text-white bg-black bg-opacity-30 px-2 py-1 rounded">
                      "{interimTranscript}"
                    </div>
                  )}
                </div>
              )}
            </div>



          </div>

        {/* Controls Bar */}
          <div className="bg-gray-50 p-6">
            <div className="flex items-center justify-between">
              {/* Left Side - Microphone and Camera */}
              <div className="flex items-center space-x-4 w-32">
                {/* Microphone Button */}
                <button
                  onClick={toggleMicrophone}
                  disabled={isLoading || isProcessing || isSpeaking}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                    micEnabled
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
                  }`}
                >
                  {micEnabled ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>

                {/* Camera Toggle Button */}
                <button
                  onClick={toggleCamera}
                  disabled={isLoading}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                    cameraEnabled
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
                  }`}
                >
                  {cameraEnabled ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 6h2l2-2h8l2 2h2c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2zm8 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 6h2l2-2h8l2 2h2c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2zm8 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>


              {/* Right Side - Timer and End Call */}
              <div className="flex items-center space-x-4 justify-end">
                {/* Call Timer */}
                <div className="w-24 h-12 rounded-full bg-gray-300 bg-opacity-50 text-black px-3 py-2.5 text-lg text-center flex items-center justify-center font-bold">
                  {formatTime(callDuration)}
                </div>

                {/* Clear Messages Button */}
                <button
                  onClick={clearMessages}
                  disabled={isLoading}
                  className="w-30 h-12 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-all duration-200 px-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Clear Chat
                </button>

                {/* End Call Button */}
                <button
                  onClick={endCall}
                  disabled={isLoading}
                  className="w-30 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-all duration-200 px-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  End lesson
                </button>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center space-x-8 mt-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-orange-500 animate-pulse' : (micEnabled ? 'bg-green-500' : 'bg-gray-300')}`}></div>
                <span>{isLoading ? 'Loading Profile...' : 'Microphone'}</span>
              </div>
              {!isLoading && (
                <>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <span>Speaking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                    <span>Processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${cameraEnabled ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                    <span>Camera</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span>Recording</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error/Status Message */}
          {error && (
            <div className={`px-6 py-3 border-l-4 ${
              error.includes('Ending session') || error.includes('Saving') || error.includes('Generating') 
                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                : 'bg-red-100 border-red-500 text-red-700'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {(error.includes('Ending session') || error.includes('Saving') || error.includes('Generating')) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  )}
                  <p className="text-sm">{error}</p>
                </div>
                {error.includes('Speech recognition') && retryCount < maxRetries && (
                  <button
                    onClick={() => {
                      setError(null);
                      setRetryCount(0);
                      if (micEnabled && recognitionRef.current) {
                        try {
                          recognitionRef.current.start();
                        } catch (err) {
                          console.log('Manual retry failed:', err);
                        }
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                      Retry
                    </button>
                  )}
                <button
                  onClick={() => setError(null)}
                  className="px-2 py-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Messages Log (Collapsible) */}
          {messages.length > 0 && (
            <div className="border-t border-gray-200">
              <details className="group">
                <summary className="px-6 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-200">
                  <span className="font-medium text-gray-700">View Conversation Log ({messages.length} messages)</span>
                </summary>
                <div className="max-h-64 overflow-y-auto p-6 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                        className={`max-w-xs px-4 py-2 rounded-2xl ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 max-w-xs px-4 py-2 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

