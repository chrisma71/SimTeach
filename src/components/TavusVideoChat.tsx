'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@/contexts/Auth0Context';
import { Student } from '@/lib/students';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface TavusVideoChatProps {
  student: Student;
  onEnd?: () => void;
}

export default function TavusVideoChat({ student, onEnd }: TavusVideoChatProps) {
  const router = useRouter();
  const { user } = useAuth0();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [lastInterimTranscript, setLastInterimTranscript] = useState<string>('');
  const [isTavusSpeaking, setIsTavusSpeaking] = useState(false);
  const [fullTranscript, setFullTranscript] = useState<string>('');
  
  // NEW: Video context capture state
  const [videoContext, setVideoContext] = useState<string>('');
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [frameCaptureCount, setFrameCaptureCount] = useState(0);
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  // NEW: Video capture refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for call duration
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  // Initialize speech recognition
  useEffect(() => {
    console.log('🎤 ===== INITIALIZING SPEECH RECOGNITION =====');
    console.log('🎤 Window available:', typeof window !== 'undefined');
    console.log('🎤 WebkitSpeechRecognition available:', 'webkitSpeechRecognition' in window);
    console.log('🎤 SpeechRecognition available:', 'SpeechRecognition' in window);
    
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      console.log('🎤 SpeechRecognition constructor:', SpeechRecognition);
      const recognition = new SpeechRecognition();
      console.log('🎤 Recognition object created:', recognition);
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      recognition.serviceURI = '';
      
      // Simple blob capture - just accumulate everything
      let fullText = '';
      
      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        setIsListening(true);
        fullText = '';
        setFullTranscript('');
      };
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Accumulate everything into one big blob
        if (finalTranscript) {
          fullText += finalTranscript;
          console.log('🎤 Captured:', finalTranscript);
          setFullTranscript(fullText);
        }
        
        if (interimTranscript) {
          setLastInterimTranscript(interimTranscript.trim());
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('🎤 Speech error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          console.error('🎤 Microphone access denied');
          return;
        }
        
        // Retry on recoverable errors
        if (event.error === 'no-speech' || event.error === 'audio-capture') {
          setTimeout(() => {
            if (isCallActive && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.log('🔄 Retry failed');
              }
            }
          }, 3000);
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        setIsListening(false);
        
        // Restart if call is still active
        if (isCallActive && recognitionRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log('🔄 Auto-restart failed');
            }
          }, 1000);
        }
      };
      
      setRecognition(recognition);
      recognitionRef.current = recognition;
    } else {
      console.log('🎤 Speech recognition not supported');
    }
  }, []);

  // Start/stop speech recognition and audio recording when call is active
  useEffect(() => {
    console.log('🔄 ===== CALL ACTIVE STATE CHANGED =====');
    console.log('🔄 Call active:', isCallActive);
    console.log('🔄 Recognition ref exists:', !!recognitionRef.current);
    
    if (isCallActive) {
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          console.log('🎤 ===== STARTING SPEECH RECOGNITION =====');
          recognitionRef.current.start();
          console.log('🎤 Speech recognition started successfully');
        } catch (error) {
          console.error('🎤 ===== SPEECH RECOGNITION START FAILED =====');
          console.error('🎤 Error:', error);
        }
      } else {
        console.error('🎤 ===== NO RECOGNITION REF AVAILABLE =====');
      }

      // Start audio recording
      console.log('🎵 Starting audio recording...');
      startAudioRecording();
    } else {
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log('🎤 Stopping speech recognition');
        } catch (error) {
          console.log('🎤 Could not stop speech recognition:', error);
        }
      }

      // Stop audio recording
      console.log('🎵 Stopping audio recording...');
      stopAudioRecording();
    }
  }, [isCallActive]);

  // Audio recording functions
  const startAudioRecording = async () => {
    try {
      console.log('🎵 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      audioStreamRef.current = stream;
      console.log('🎵 Microphone access granted, stream:', stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('🎵 Audio data chunk received:', event.data.size, 'bytes');
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setAudioChunks(prev => {
          const newChunks = [...prev, audioBlob];
          console.log('🎵 Total audio chunks:', newChunks.length);
          return newChunks;
        });
        console.log('🎵 Audio chunk recorded:', audioBlob.size, 'bytes');
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('🎵 MediaRecorder error:', event);
      };
      
      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      console.log('🎵 Audio recording started with MediaRecorder');
    } catch (error) {
      console.error('🎵 Could not start audio recording:', error);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    console.log('🎵 Audio recording stopped');
  };

  // Periodic transcript capture as fallback
  useEffect(() => {
    if (isCallActive && iframeRef.current) {
      const captureTranscript = () => {
        try {
          // Try to capture transcript from iframe
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
              type: 'get_transcript'
            }, '*');
          }
        } catch (error) {
          console.log('Could not capture transcript from iframe:', error);
        }
      };

      // Capture transcript every 5 seconds
      const transcriptInterval = setInterval(captureTranscript, 5000);
      
      return () => clearInterval(transcriptInterval);
    }
  }, [isCallActive]);

  const startConversation = async () => {
    setIsLoading(true);
    setError(null);
    setIsConnecting(true);

    try {
      console.log('Starting avatar conversation for student:', student.name);
      
      const response = await fetch('/api/tavus/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          studentId: student.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create conversation');
      }

      const data = await response.json();
      console.log('Avatar conversation created:', data);
      setConversationData(data);
      setIsCallActive(true);
      setSessionId(`tavus-${Date.now()}`);
      
      console.log('👋 Session started');
      
    } catch (error) {
      console.error('Error starting avatar session:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
    }
  };

  // Listen for messages from Tavus iframe (user speech + Tavus speech confirmation)
  useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    console.log('🔍 Tavus message:', event.data?.type);
    
    // Handle user speech from iframe
    if (event.data.type === 'transcript' && event.data.text) {
      console.log('📝 User transcript:', event.data.text);
      sendToTavus(event.data.text);
    } else if (event.data.type === 'user_speech' && event.data.transcript) {
      console.log('🎤 User speech:', event.data.transcript);
      sendToTavus(event.data.transcript);
    } 
    // Handle Tavus responses
    else if (event.data.type === 'tavus_response' || event.data.type === 'student_response' || event.data.type === 'avatar_response') {
      console.log('🎭 Tavus responded:', event.data.text || event.data.message);
      
      // Add Tavus response to transcript
      const tavusMessage: Message = {
        id: Date.now().toString(),
        text: event.data.text || event.data.message || 'Tavus responded',
        isUser: false, // Tavus is the student
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, tavusMessage]);
    }
    // Handle Tavus speech events
    else if (event.data.type === 'speaking_started' || event.data.type === 'speech_started') {
      console.log('🎭 Tavus started speaking');
      setIsTavusSpeaking(true);
    }
    else if (event.data.type === 'speak_response' || event.data.type === 'speech_complete' || event.data.type === 'speaking_finished') {
      console.log('🎭 Tavus finished speaking');
      setIsTavusSpeaking(false);
    }
  };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);


  // Simple function to send message to Tavus (no transcript splitting)
  const sendToTavus = async (text: string) => {
    console.log('📤 Sending to Tavus:', text);
    
    if (iframeRef.current) {
      const messageToSend = {
        type: 'user_message',
        text: text.trim(),
        timestamp: new Date().toISOString()
      };
      
      try {
        iframeRef.current.contentWindow?.postMessage(messageToSend, '*');
        console.log('📤 Message sent');
      } catch (error) {
        console.error('❌ Send failed:', error);
      }
    } else {
      console.error('❌ Iframe not available');
    }
  };

  // NEW: Video context capture functions
  const toggleCamera = async () => {
    console.log('📹 ===== TOGGLING CAMERA =====');
    console.log('📹 Current camera state:', cameraEnabled);
    
    if (cameraEnabled) {
      // Turn off camera
      console.log('📹 Turning off camera...');
      if (videoStream) {
        videoStream.getTracks().forEach(track => {
          console.log('📹 Stopping video track:', track.kind);
          track.stop();
        });
        setVideoStream(null);
      }
      setCameraEnabled(false);
      setVideoContext('');
      setIsAnalyzingVideo(false);
      
      // Clear frame capture interval
      if (frameCaptureIntervalRef.current) {
        clearInterval(frameCaptureIntervalRef.current);
        frameCaptureIntervalRef.current = null;
        console.log('📹 Frame capture interval cleared');
      }
      
      console.log('📹 Camera turned off successfully');
    } else {
      // Turn on camera
      console.log('📹 Turning on camera...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 },
          audio: false 
        });
        console.log('📹 Camera stream obtained:', stream);
        console.log('📹 Video tracks:', stream.getVideoTracks().length);
        console.log('📹 Audio tracks:', stream.getAudioTracks().length);
        
        setVideoStream(stream);
        setCameraEnabled(true);
        setFrameCaptureCount(0);
        
        // Set video source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('📹 Video source set');
        }
        
        console.log('📹 Camera turned on successfully');
      } catch (err) {
        console.error('📹 Camera access failed:', err);
        setError('Camera not available');
        setCameraEnabled(false);
      }
    }
  };

  const captureVideoFrame = async (): Promise<string | null> => {
    console.log('📸 ===== CAPTURING VIDEO FRAME =====');
    
    if (!videoRef.current || !cameraEnabled) {
      console.log('📸 No video element or camera disabled');
      return null;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('📸 Could not get canvas context');
        return null;
      }
      
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      console.log('📸 Video dimensions:', {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      
      // Draw video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      console.log('📸 Frame captured successfully');
      console.log('📸 Image data length:', imageData.length);
      console.log('📸 Image data preview:', imageData.substring(0, 50) + '...');
      
      return imageData;
    } catch (error) {
      console.error('📸 Frame capture failed:', error);
      return null;
    }
  };

  const analyzeVideoFrame = async (imageData: string) => {
    console.log('🔍 ===== ANALYZING VIDEO FRAME =====');
    console.log('🔍 Image data length:', imageData.length);
    
    setIsAnalyzingVideo(true);
    setFrameCaptureCount(prev => prev + 1);
    
    try {
      console.log('🔍 Calling video context API...');
      
      // Call our new video context API
      const response = await fetch('/api/chat/video-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData,
          sessionId: sessionId || 'test-session',
          studentId: student.id,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔍 API Error:', errorData);
        throw new Error(`API Error: ${errorData.error || 'Failed to analyze video'}`);
      }
      
      const result = await response.json();
      console.log('🔍 API Response:', result);
      
      if (result.success && result.description) {
        setVideoContext(result.description);
        console.log('🔍 Video context updated:', result.description);
        console.log('🔍 Confidence:', result.confidence);
        console.log('🔍 Objects detected:', result.objects);
        console.log('🔍 Actions detected:', result.actions);
      } else {
        console.error('🔍 Invalid API response:', result);
        setVideoContext('Analysis failed - invalid response');
      }
      
    } catch (error) {
      console.error('🔍 Video analysis failed:', error);
      setVideoContext('Analysis failed - ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzingVideo(false);
      console.log('🔍 Analysis complete');
    }
  };

  // Start frame capture when camera is enabled
  useEffect(() => {
    if (cameraEnabled && videoStream) {
      console.log('📹 Starting frame capture interval...');
      
      frameCaptureIntervalRef.current = setInterval(async () => {
        console.log('📹 Frame capture interval triggered');
        const frame = await captureVideoFrame();
        if (frame) {
          await analyzeVideoFrame(frame);
        }
      }, 3000); // Capture every 3 seconds
      
      console.log('📹 Frame capture interval started');
    } else {
      // Clear interval when camera is disabled
      if (frameCaptureIntervalRef.current) {
        clearInterval(frameCaptureIntervalRef.current);
        frameCaptureIntervalRef.current = null;
        console.log('📹 Frame capture interval cleared');
      }
    }
    
    return () => {
      if (frameCaptureIntervalRef.current) {
        clearInterval(frameCaptureIntervalRef.current);
        frameCaptureIntervalRef.current = null;
      }
    };
  }, [cameraEnabled, videoStream]);

  // Update video source when stream changes
  useEffect(() => {
    if (videoRef.current && videoStream) {
      console.log('📹 Setting video source');
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Function to split and label transcript using OpenAI with 3 epochs
  const formatTranscriptWithOpenAI = async (fullText: string) => {
    try {
      console.log('🧹 Splitting transcript through 3 epochs...');
      
      const response = await fetch('/api/chat/process-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullText: fullText,
          studentName: student.name
        }),
      });

      if (response.ok) {
        const formattedData = await response.json();
        console.log('🧹 Transcript split and labeled successfully');
        return formattedData.transcript;
      } else {
        console.error('❌ 3-epoch splitting failed, using fallback');
        return [{
          id: Date.now().toString(),
          text: fullText,
          isUser: true,
          timestamp: new Date().toISOString()
        }];
      }
    } catch (error) {
      console.error('❌ 3-epoch splitting error:', error);
      return [{
        id: Date.now().toString(),
        text: fullText,
        isUser: true,
        timestamp: new Date().toISOString()
      }];
    }
  };

  const endCall = async () => {
    setIsCallActive(false);
    
    console.log('🛑 Ending call...');
    console.log('📊 Current messages count:', messages.length);
    console.log('📝 Current messages:', messages);
    console.log('⏱️ Call duration:', callDuration);
    
    // Capture any pending interim transcript before ending
    if (recognitionRef.current && recognitionRef.current.state === 'listening') {
      try {
        console.log('🎤 Capturing final interim transcript before ending call...');
        recognitionRef.current.stop();
        
        // Wait a moment for any final processing
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log('🎤 Error stopping recognition:', error);
      }
    }
    
    try {
    // Use the big blob transcript we've been accumulating
    let finalTranscript = fullTranscript;
    
    // Add any remaining interim transcript
    if (lastInterimTranscript && lastInterimTranscript.split(' ').length > 2) {
      console.log('🎤 Adding final interim transcript:', lastInterimTranscript);
      finalTranscript += ' ' + lastInterimTranscript;
    }
    
    console.log('📋 Final transcript length:', finalTranscript.length);
    
    // Split and label the big blob using OpenAI with 3 epochs
    let formattedTranscript;
    try {
      console.log('🔄 Starting 3-epoch splitting...');
      formattedTranscript = await formatTranscriptWithOpenAI(finalTranscript);
      console.log('📋 3-epoch splitting complete:', formattedTranscript.length, 'messages');
    } catch (formatError) {
      console.error('❌ 3-epoch splitting failed, using fallback');
      formattedTranscript = [{
        id: Date.now().toString(),
        text: finalTranscript,
        isUser: true,
        timestamp: new Date().toISOString()
      }];
    }
      // If no transcript captured, create a minimal one
      if (formattedTranscript.length === 0) {
        console.log('⚠️ No conversation captured, creating minimal transcript');
        formattedTranscript = [{
          id: 'session_started',
          text: 'Session started - no conversation captured',
          isUser: false,
          timestamp: new Date().toISOString()
        }];
      }

      console.log('📋 Final formatted transcript:', formattedTranscript);

      // Create audio URL from recorded chunks
      let audioUrl = '';
      console.log('🎵 Audio chunks count:', audioChunks.length);
      console.log('🎵 Audio chunks details:', audioChunks.map((chunk, i) => ({ index: i, size: chunk.size, type: chunk.type })));
      
      if (audioChunks.length > 0) {
        try {
          const finalAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          console.log('🎵 Final audio blob size:', finalAudioBlob.size, 'bytes');
          console.log('🎵 Final audio blob type:', finalAudioBlob.type);
          
          // Convert blob to data URL synchronously
          const reader = new FileReader();
          const audioDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              console.log('🎵 FileReader onload triggered');
              resolve(reader.result as string);
            };
            reader.onerror = (error) => {
              console.error('🎵 FileReader error:', error);
              reject(new Error('Failed to read audio blob'));
            };
            reader.readAsDataURL(finalAudioBlob);
          });
          
          audioUrl = audioDataUrl;
          console.log('🎵 Audio URL created successfully, length:', audioUrl.length);
          console.log('🎵 Audio URL preview:', audioUrl.substring(0, 100) + '...');
        } catch (error) {
          console.error('🎵 Error creating audio URL:', error);
          audioUrl = `data:audio/wav;base64,${btoa('Audio recording failed')}`;
        }
      } else {
        console.log('🎵 No audio chunks recorded - creating placeholder');
        audioUrl = `data:audio/wav;base64,${btoa('No audio recorded')}`;
      }

      // Create session data matching your database structure
      const sessionData = {
        userId: user?._id || (user as any)?.sub || 'demo-user-id',
        studentId: student.id,
        studentName: student.name,
        studentSubject: student.subject,
        transcript: formattedTranscript,
        conversationCount: formattedTranscript.length,
        conversationLength: callDuration,
        audioUrl: audioUrl,
        createdAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        type: 'tavus_video_session',
        sessionId: sessionId,
        duration: callDuration
      };

      console.log('💾 Uploading session data:', sessionData);

      // Upload to database
      const response = await fetch('/api/chat/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Session data uploaded successfully to database');
        console.log('📊 Session ID:', result.sessionId);
        console.log('📊 Full response:', result);
        
        // Redirect to review page using the MongoDB sessionId
        const reviewSessionId = result.sessionId || sessionId;
        console.log('🔄 Redirecting to review page:', `/review/${reviewSessionId}`);
        router.push(`/review/${reviewSessionId}`);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to upload session data:', response.status, errorText);
        // Still redirect to review page even if upload fails, using local sessionId
        console.log('🔄 Redirecting to review page (fallback):', `/review/${sessionId}`);
        router.push(`/review/${sessionId}`);
      }
    } catch (error) {
      console.error('❌ Error uploading session data:', error);
      // Still redirect to review page even if upload fails, using local sessionId
      console.log('🔄 Redirecting to review page (error fallback):', `/review/${sessionId}`);
      router.push(`/review/${sessionId}`);
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Could not stop speech recognition:', error);
      }
    }

    // Reset state
    setConversationData(null);
    setMessages([]);
    setCallDuration(0);
    setSessionId(null);
    setIsListening(false);
    
    onEnd?.();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log('Could not stop speech recognition on unmount:', error);
        }
      }
    };
  }, []);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show the call screen with the uploaded design - Single call interface
  if (conversationData) {
    return (
      <div className="fixed inset-0 bg-black z-50 overflow-hidden">
        <style jsx>{`
          iframe {
            width: 100vw !important;
            height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 1 !important;
            border: none !important;
          }
        `}</style>
        {/* Single Video Call Interface - True full screen */}
        <div className="w-screen h-screen relative">
          {/* Main Video Area - Full screen Tavus call */}
        <iframe
          ref={iframeRef}
          src={conversationData.conversation_url}
            className="w-screen h-screen border-0 absolute inset-0"
          allow="camera; microphone; fullscreen; speaker; display-capture"
            title={`Video call with ${student.name}`}
          style={{ 
              width: '100vw',
              height: '100vh',
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 1
            }}
          onLoad={() => {
            console.log('🎬 Iframe loaded - ready for conversation');
          }}
          />
          
          {/* Student Info Overlay - Dark overlay like uploaded design */}
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-sm px-3 py-2 rounded-lg z-20">
            <div className="text-center">
              <div className="font-bold text-base">{student.name}</div>
              <div className="text-xs opacity-75">Student – Practice Teaching</div>
            </div>
          </div>

          {/* NEW: Video Context Display */}
          {videoContext && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white text-sm px-3 py-2 rounded-lg z-20 max-w-xs">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">Video Context</span>
              </div>
              <div className="text-xs opacity-90">{videoContext}</div>
            </div>
          )}

          {/* NEW: Hidden video element for frame capture */}
          {cameraEnabled && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
              style={{ width: '320px', height: '240px' }}
            />
          )}

          {/* Bottom Controls - Fixed layout */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            {/* Top row - Status indicators */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                {/* Loading indicator */}
                {isConnecting && (
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-300">Connecting...</span>
                  </div>
                )}
                
                {/* Progress dots */}
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>

                {/* Debug: Show message count */}
                <div className="text-xs text-gray-300">
                  Messages: {messages.length}
                </div>

                {/* Debug: Show full transcript */}
                <div className="text-xs text-gray-300">
                  Full Transcript: {fullTranscript.length} chars
                </div>

                {/* Speech recognition status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-300">
                    {isListening ? 'Listening' : 'Not listening'}
                  </span>
                </div>

                {/* Audio recording status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-xs text-gray-300">
                    {isRecording ? 'Recording' : 'Not recording'}
                  </span>
                </div>

                {/* Tavus speaking status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isTavusSpeaking ? 'bg-purple-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-xs text-gray-300">
                    {isTavusSpeaking ? 'Student speaking' : 'Student quiet'}
                  </span>
                </div>

                {/* NEW: Video context status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isAnalyzingVideo ? 'bg-yellow-500 animate-pulse' : (videoContext ? 'bg-green-500' : 'bg-gray-500')}`}></div>
                  <span className="text-xs text-gray-300">
                    {isAnalyzingVideo ? 'Analyzing video...' : (videoContext ? 'Video context active' : 'No video context')}
                  </span>
                </div>

                {/* NEW: Frame capture count */}
                <div className="text-xs text-gray-300">
                  Frames: {frameCaptureCount}
                </div>

              </div>

              {/* Call Duration */}
              <div className="text-sm text-white">
                {formatDuration(callDuration)}
              </div>
            </div>

            {/* Bottom row - Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Manual transcript input for testing */}
                <button
                  onClick={() => {
                    const testMessage: Message = {
                      id: Date.now().toString(),
                      text: 'This is a test message to verify transcript capture',
                      isUser: true,
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, testMessage]);
                    console.log('🧪 Added test message:', testMessage);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                >
                  Test
                </button>

                {/* Test transcript formatting */}
                <button
                  onClick={async () => {
                    console.log('🧪 Testing transcript formatting...');
                    const testText = "Hello there how are you doing today I'm doing great thanks for asking what can I help you with";
                    console.log('🧪 Original test text:', testText);
                    try {
                      const formatted = await formatTranscriptWithOpenAI(testText);
                      console.log('🧪 Test result:', formatted);
                      console.log('🧪 Preserved text:', formatted.map((msg: any) => msg.text).join(' '));
                    } catch (error) {
                      console.error('🧪 Test failed:', error);
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                >
                  Test Format
                </button>

                {/* Test current transcript formatting */}
                <button
                  onClick={async () => {
                    console.log('🧪 Testing current transcript...');
                    console.log('🧪 Original text:', fullTranscript);
                    try {
                      const formatted = await formatTranscriptWithOpenAI(fullTranscript);
                      console.log('🧪 Current result:', formatted);
                      console.log('🧪 Preserved text:', formatted.map((msg: any) => msg.text).join(' '));
                    } catch (error) {
                      console.error('🧪 Current test failed:', error);
                    }
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs"
                >
                  Format Current
                </button>

                {/* Direct API test */}
                <button
                  onClick={async () => {
                    console.log('🧪 ===== TESTING DIRECT API CALL =====');
                    try {
                      const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          message: 'I need help with algebra',
                          studentId: student.id,
                          userId: (user as any)?.sub,
                          conversationHistory: []
                        })
                      });
                      
                      const data = await response.json();
                      console.log('🧪 Direct API response:', data);
                      console.log('🧪 Response text:', data.response);
                    } catch (error) {
                      console.error('🧪 Direct API test failed:', error);
                    }
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                >
                  Test API
                </button>

                {/* Manual speech recognition toggle */}
                <button
                  onClick={() => {
                    if (recognitionRef.current) {
                      if (isListening) {
                        recognitionRef.current.stop();
                      } else {
                        recognitionRef.current.start();
                      }
                    }
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                >
                  {isListening ? 'Stop Mic' : 'Start Mic'}
                </button>

                {/* Audio recording test */}
                <button
                  onClick={async () => {
                    console.log('🎵 Audio chunks count:', audioChunks.length);
                    console.log('🎵 Audio chunks:', audioChunks);
                    console.log('🎵 Recording state:', isRecording);
                    console.log('🎵 MediaRecorder state:', mediaRecorderRef.current?.state);
                    console.log('🎵 Audio stream:', audioStreamRef.current);
                    console.log('🎵 Call active:', isCallActive);
                    
                    // Test manual audio recording
                    if (!isRecording) {
                      console.log('🎵 Testing manual audio recording...');
                      await startAudioRecording();
                    } else {
                      console.log('🎵 Testing manual audio stop...');
                      stopAudioRecording();
                    }
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs"
                >
                  Audio Debug
                </button>


                {/* Test sendToTavus directly */}
                <button
                  onClick={() => {
                    console.log('🧪 Testing Tavus...');
                    sendToTavus('Hello, can you help me with math?');
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                >
                  Test Tavus
                </button>

                {/* NEW: Camera toggle button */}
                <button
                  onClick={toggleCamera}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    cameraEnabled 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                  }`}
                >
                  {cameraEnabled ? '📹 Camera On' : '📹 Camera Off'}
                </button>

                {/* NEW: Manual frame capture test */}
                <button
                  onClick={async () => {
                    console.log('🧪 Testing manual frame capture...');
                    const frame = await captureVideoFrame();
                    if (frame) {
                      console.log('🧪 Frame captured, analyzing...');
                      await analyzeVideoFrame(frame);
                    } else {
                      console.log('🧪 No frame captured');
                    }
                  }}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs"
                >
                  📸 Capture Frame
                </button>
        </div>
        
              {/* End Call Button - Pink like uploaded design */}
          <button
                onClick={endCall}
                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
                End Call
          </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading or error state
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-2xl">
      <div className="text-center text-gray-800">
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Loading {student.name}...</p>
            <p className="text-sm opacity-75">Setting up practice session</p>
          </>
        ) : error ? (
          <>
            <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">Error Loading Video Call</p>
            <p className="text-sm opacity-75 mb-4">{error}</p>
            <button
              onClick={startConversation}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">{student.name.charAt(0)}</span>
            </div>
            <p className="text-lg font-medium">{student.name}</p>
            <p className="text-sm opacity-75">Ready to practice teaching</p>
            <button
              onClick={startConversation}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Start Practice Session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
