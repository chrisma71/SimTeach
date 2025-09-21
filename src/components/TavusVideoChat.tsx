'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@/contexts/Auth0Context';
import { Student } from '@/lib/students';

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUserJoined, setIsUserJoined] = useState(false); // Track if user has actually joined the call
  const [transcript, setTranscript] = useState<Array<{
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
  }>>([]);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTavusSpeaking, setIsTavusSpeaking] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(true); // Track whose turn it is
  const [isEndingCall, setIsEndingCall] = useState(false); // Track if call is being ended
  const [showListeningIndicator, setShowListeningIndicator] = useState(false); // Debounced listening state
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set()); // Track manually overridden messages
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const transcriptPollingRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const lastTranscriptTimeRef = useRef<number>(0);
  const tavusResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTavusResponseRef = useRef<string>('');
  const speechRestartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestartingRef = useRef<boolean>(false); // Track if we're currently restarting
  const restartAttemptsRef = useRef<number>(0); // Track restart attempts to prevent infinite loops

  // Timer for call duration - only start when user has joined
  useEffect(() => {
    if (isCallActive && isUserJoined) {
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
  }, [isCallActive, isUserJoined]);


  // Transcript polling effect
  useEffect(() => {
    if (isCallActive && conversationData?.conversation_id) {
      // Start polling for transcript data every 2 seconds
      transcriptPollingRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/tavus/transcript?conversation_id=${conversationData.conversation_id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.transcript_entries && data.transcript_entries.length > 0) {
              const newEntries = data.transcript_entries.map((entry: any) => ({
                id: entry.id || `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: entry.text || '',
                isUser: entry.isUser || false,
                timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
              }));
              
              setTranscript(prev => {
                // Only add new entries that don't already exist
                const existingIds = new Set(prev.map(item => item.id));
                const newUniqueEntries = newEntries.filter((entry: any) => !existingIds.has(entry.id));
                return [...prev, ...newUniqueEntries];
              });
            }
          }
        } catch (error) {
          console.error('Error polling transcript:', error);
        }
      }, 2000);
    } else {
      if (transcriptPollingRef.current) {
        clearInterval(transcriptPollingRef.current);
        transcriptPollingRef.current = null;
      }
    }

    return () => {
      if (transcriptPollingRef.current) {
        clearInterval(transcriptPollingRef.current);
      }
    };
  }, [isCallActive, conversationData?.conversation_id]);

  // Speech recognition effect - only start when user has actually joined the call
  useEffect(() => {
    if (isCallActive && isUserJoined && typeof window !== 'undefined') {
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        // Clear any existing recognition first
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch (error) {
            console.log('🎤 Error stopping existing recognition:', error);
          }
          speechRecognitionRef.current = null;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Make speech recognition more aggressive
        recognition.maxAlternatives = 1;
        recognition.serviceURI = '';
        
        // Try to make it more sensitive to pick up everything
        if ('webkitSpeechRecognition' in window) {
          // Webkit-specific settings for more aggressive recognition
          try {
            if ('SpeechGrammarList' in window) {
              (recognition as any).grammars = new (window as any).SpeechGrammarList();
            }
            (recognition as any).maxAlternatives = 3;
          } catch (error) {
            console.log('🎤 SpeechGrammarList not available, using basic settings');
          }
        }
        
        let isRecognitionActive = false;
        
        recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          setIsListening(true);
          isRecognitionActive = true;
          // Reset restart attempts counter on successful start
          restartAttemptsRef.current = 0;
        };
        
        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          const confidence = event.results[current][0].confidence;
          const isFinal = event.results[current].isFinal;
          
          // Log all results for debugging
          console.log(`🎤 Speech detected - Final: ${isFinal}, Confidence: ${confidence}, Text: "${transcript}"`);
          
          // Only log final results to reduce noise
          if (isFinal) {
            console.log(`🎤 Final speech detected - Confidence: ${confidence}, Text: "${transcript}"`);
          }
          
          // Only capture final results to avoid duplicate interim messages
          if (isFinal && transcript.trim()) {
            // Determine speaker based on current transcript length (index-based)
            setTranscript(prev => {
              const isUser = prev.length % 2 === 0; // Even index = User, Odd index = Tavus
              const speaker = isUser ? 'User' : 'Tavus';
              console.log(`🎤 ${speaker} speech detected (index ${prev.length}):`, transcript);
              
              const newEntry = {
                id: `${isUser ? 'user' : 'tavus'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: transcript.trim(),
                isUser: isUser,
                timestamp: new Date()
              };
              
              return [...prev, newEntry];
            });
            
            lastTranscriptTimeRef.current = Date.now();
          }
        };
        
        // Helper function to handle restart logic
        const attemptRestart = (reason: string) => {
          if (isCallActive && isUserJoined && !isRestartingRef.current && restartAttemptsRef.current < 5) {
            console.log(`🔄 ${reason} - restarting speech recognition... (attempt ${restartAttemptsRef.current + 1}/5)`);
            isRestartingRef.current = true;
            restartAttemptsRef.current += 1;
            setTimeout(() => {
              try {
                if (isCallActive && isUserJoined && !isRecognitionActive && !isRestartingRef.current) {
                  recognition.start();
                }
              } catch (error) {
                console.log('🎤 Speech recognition restart failed:', error);
              } finally {
                isRestartingRef.current = false;
              }
            }, 1500);
          } else if (restartAttemptsRef.current >= 5) {
            console.log('🎤 Max restart attempts reached, stopping speech recognition');
          } else {
            console.log('🎤 Not restarting - already restarting or call ended');
          }
        };

        recognition.onerror = (event: any) => {
          console.log('🎤 Speech recognition error:', event.error);
          setIsListening(false);
          isRecognitionActive = false;
          
          // Only restart for certain recoverable errors
          if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'aborted') {
            attemptRestart(`Recoverable error (${event.error})`);
          } else {
            console.log('🎤 Non-recoverable error, stopping speech recognition');
          }
        };
        
        recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          setIsListening(false);
          isRecognitionActive = false;
          
          // Only restart if we're not already restarting (to avoid double restarts)
          if (!isRestartingRef.current) {
            attemptRestart('Normal end');
          }
        };
        
        speechRecognitionRef.current = recognition;
        
        // Start speech recognition
        try {
          recognition.start();
        } catch (error) {
          console.error('🎤 Failed to start speech recognition:', error);
        }
      } else {
        console.warn('🎤 Speech recognition not supported in this browser');
      }
    } else {
      // Stop speech recognition when call ends
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          console.log('🎤 Error stopping speech recognition:', error);
        }
        speechRecognitionRef.current = null;
      }
      setIsListening(false);
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (error) {
          console.log('🎤 Error stopping speech recognition in cleanup:', error);
        }
        speechRecognitionRef.current = null;
      }
      // Clear any pending restart timeouts
      if (speechRestartTimeoutRef.current) {
        clearTimeout(speechRestartTimeoutRef.current);
        speechRestartTimeoutRef.current = null;
      }
      // Reset restart flag and attempts counter
      isRestartingRef.current = false;
      restartAttemptsRef.current = 0;
    };
  }, [isCallActive, isUserJoined]);

  // Debounced listening indicator to prevent rapid flashing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isListening) {
      // Show immediately when listening starts
      setShowListeningIndicator(true);
    } else {
      // Hide after a short delay when listening stops
      timeoutId = setTimeout(() => {
        setShowListeningIndicator(false);
      }, 500); // 500ms delay before hiding
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isListening]);



  // Simple function to start transcription after a delay
  const startTranscriptionAfterDelay = () => {
    console.log('🎬 Iframe loaded - will start transcription in 4 seconds');
    setTimeout(() => {
      console.log('🎤 Starting transcription after delay');
      setIsUserJoined(true);
    }, 4000); // Wait 4 seconds
  };

  // Simple function to manually switch turns
  const switchTurn = () => {
    setIsUserTurn(!isUserTurn);
    console.log(`🔄 Manually switched to ${!isUserTurn ? 'User' : 'Tavus'} turn`);
  };


  // Function to switch speaker of a specific message
  const switchMessageSpeaker = (messageId: string) => {
    setTranscript(prev => 
      prev.map(entry => 
        entry.id === messageId 
          ? { ...entry, isUser: !entry.isUser }
          : entry
      )
    );
    
    // Track this as a manual override
    setManualOverrides(prev => new Set([...prev, messageId]));
    
    console.log(`🔄 Switched speaker for message ${messageId}`);
  };

  // Function to calculate next speaker based on manual overrides
  const getNextSpeaker = () => {
    if (transcript.length === 0) return 'You';
    
    // Count how many messages have been manually switched
    const overrideCount = manualOverrides.size;
    
    // Calculate the expected next speaker
    // If we have an even number of overrides, the pattern continues normally
    // If we have an odd number of overrides, the pattern is flipped
    const baseIndex = transcript.length;
    const isUser = (baseIndex + overrideCount) % 2 === 0;
    
    return isUser ? 'You' : student.name;
  };

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
      
      // Handle specific error cases
      if (error instanceof Error && error.message.includes('Student not available')) {
        setError('This student is coming soon! We\'re working on setting up their avatar.');
      } else if (error instanceof Error && error.message.includes('configuration incomplete')) {
        setError('This student\'s avatar is not fully configured yet.');
      } else {
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
    }
  };

  const endCall = async () => {
    setIsEndingCall(true);
    setIsCallActive(false);
    
    console.log('🛑 Ending call...');
    console.log('⏱️ Call duration:', callDuration);
    console.log('📝 Transcript entries:', transcript.length);
    
    // Save transcript to chat log if we have entries
    let savedCaseId = null;
    if (transcript.length > 0 && user) {
      try {
        const response = await fetch('/api/chat/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user._id || user.email, // Use _id or email as fallback
            studentId: student.id,
            studentName: student.name,
            studentSubject: student.subject,
            transcript: transcript,
            conversationLength: callDuration,
            type: 'tavus_video_session',
            sessionId: sessionId,
            duration: callDuration
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          savedCaseId = result.sessionId;
          console.log('✅ Transcript saved to chat log with ID:', savedCaseId);
        }
      } catch (error) {
        console.error('❌ Error saving transcript:', error);
      }
    }
    
        // Reset state
        setConversationData(null);
        setCallDuration(0);
        setSessionId(null);
        setTranscript([]);
        setIsTranscriptVisible(false);
        setIsUserJoined(false);
        
    
    // Redirect to review page for this specific case
    if (savedCaseId) {
      console.log('🔄 Redirecting to review page:', `/review/${savedCaseId}`);
      router.push(`/review/${savedCaseId}`);
    } else {
      console.log('🔄 Redirecting to general review page');
      router.push('/review');
    }
    
    // Call onEnd after redirect
    setTimeout(() => {
      onEnd?.();
    }, 100);
  };

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
        {/* Single Video Call Interface - Adjust for transcript */}
        <div className={`w-screen h-screen relative transition-all duration-300 ${isTranscriptVisible ? 'mr-80' : ''}`}>
          {/* Main Video Area - Full screen Tavus call */}
        <iframe
          ref={iframeRef}
          src={conversationData.conversation_url}
            className={`w-screen h-screen border-0 absolute inset-0 transition-all duration-300`}
          allow="camera; microphone; fullscreen; speaker; display-capture"
            title={`Video call with ${student.name}`}
          style={{ 
              width: isTranscriptVisible ? 'calc(100vw - 20rem)' : '100vw',
              height: '100vh',
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 15
            }}
          onLoad={() => {
            console.log('🎬 Iframe loaded - ready for conversation');
            // Start transcription after a simple delay
            startTranscriptionAfterDelay();
          }}
          />
          
          {/* Student Info Overlay - Dark overlay like uploaded design */}
          <div className={`absolute bottom-20 left-4 bg-black bg-opacity-70 text-white text-sm px-4 py-3 rounded-lg z-30 transition-all duration-300 ${isTranscriptVisible ? 'right-80' : 'right-4'}`}>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="font-bold text-lg">{student.name}</div>
                <div className="text-sm opacity-75">Student – Practice Teaching</div>
              </div>
              
              {/* Status indicators moved to name bar */}
              <div className="flex items-center space-x-4">
                {/* Loading indicator */}
                {isConnecting && (
                  <div className="flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-1 rounded-lg">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-white font-medium">Connecting...</span>
                  </div>
                )}
                
                {/* Speech recognition indicator */}
                {showListeningIndicator && (
                  <div className="flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-1 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white font-medium">Listening...</span>
                  </div>
                )}
                
                {/* Call Duration */}
                <div className="bg-black bg-opacity-50 px-3 py-1 rounded-lg">
                  <div className="text-sm font-bold text-white">
                    {formatDuration(callDuration)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Panel - Side panel */}
          {isTranscriptVisible && (
            <div className="absolute top-0 right-0 w-80 h-full bg-black bg-opacity-95 text-white z-30 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-gray-600 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Transcript</h3>
                <button
                  onClick={() => setIsTranscriptVisible(false)}
                  className="text-gray-400 hover:text-white text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100vh-80px)]">
                {transcript.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="animate-pulse">
                      {!isUserJoined ? 'Starting transcription in 4 seconds...' : 'Waiting for conversation...'}
                    </div>
                    <div className="text-xs mt-2 opacity-75">
                      {!isUserJoined ? 'Speech recognition will start automatically' : 'Your speech will be transcribed automatically'}
                    </div>
                  </div>
                ) : (
                  transcript.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-xl shadow-lg ${
                        entry.isUser
                          ? 'bg-blue-600 ml-4 border-l-4 border-blue-400'
                          : 'bg-gray-700 mr-4 border-l-4 border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-bold flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${entry.isUser ? 'bg-blue-300' : 'bg-gray-400'}`}></span>
                          <span>{entry.isUser ? 'You' : student.name}</span>
                          {manualOverrides.has(entry.id) && (
                            <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full font-medium">
                              ✏️ Switched
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => switchMessageSpeaker(entry.id)}
                          className="text-xs bg-black bg-opacity-40 hover:bg-opacity-60 text-white px-3 py-1 rounded-lg transition-colors font-medium"
                          title="Switch speaker"
                        >
                          🔄 Switch
                        </button>
                      </div>
                      <div className="text-sm leading-relaxed mb-2">{entry.text}</div>
                      <div className="text-xs opacity-75 text-right">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Turn indicator */}
                {transcript.length > 0 && (
                  <div className="text-center text-gray-500 text-xs mt-4 p-2 bg-gray-800 rounded">
                    <div className="flex items-center justify-center space-x-2">
                      {(() => {
                        const nextSpeaker = getNextSpeaker();
                        const isUser = nextSpeaker === 'You';
                        return (
                          <>
                            <div className={`w-2 h-2 rounded-full ${isUser ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            <span>Next turn: {nextSpeaker}</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      {manualOverrides.size > 0 
                        ? `Adjusted for ${manualOverrides.size} manual switch${manualOverrides.size !== 1 ? 'es' : ''}`
                        : 'Auto-alternating based on message count'
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Loading overlay when ending call */}
        {isEndingCall && (
          <div className="absolute inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ending Call</h3>
              <p className="text-gray-600">Saving transcript and redirecting...</p>
            </div>
          </div>
        )}

        {/* Bottom Controls - Three-column layout */}
        <div className={`absolute bottom-0 left-0 right-0 z-30 ${isTranscriptVisible ? 'right-80' : ''}`}>
          <div className="flex items-center justify-between p-4 pb-0 pr-2">
            {/* Left side - Empty for spacing */}
            <div className="w-1/3"></div>
            
            {/* Center - Transcript Button */}
            <div className="flex justify-center w-1/3">
              {!isUserJoined ? (
                <div className="px-12 py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center space-x-4 shadow-xl bg-gray-500 text-white"
                  style={{ minWidth: '250px' }}
                >
                  <span className="text-xl">⏳</span>
                  <span>Starting in 4 seconds...</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                  className={`px-12 py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center space-x-4 shadow-xl ${
                    isTranscriptVisible 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-white bg-opacity-95 hover:bg-opacity-100 text-gray-800'
                  }`}
                  style={{ minWidth: '250px' }}
                >
                  <span className="text-xl">📝</span>
                  <span>Live Transcript</span>
                  {transcript.length > 0 && (
                    <span className="mb-0 bg-red-500 text-white text-sm px-3 rounded-full font-bold">
                      {transcript.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Right side - End Call Button */}
            <div className="flex justify-end w-1/3">
              <button
                onClick={endCall}
                disabled={isEndingCall}
                className={`px-16 py-4 rounded-xl font-bold text-xl transition-all duration-200 shadow-xl relative z-30 ${
                  isEndingCall 
                    ? 'bg-gray-500 cursor-not-allowed opacity-75' 
                    : 'bg-red-500 hover:bg-red-600 hover:shadow-2xl transform hover:scale-105'
                }`}
                style={{ minWidth: '300px' }}
              >
                {isEndingCall ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Ending Call...</span>
                  </div>
                ) : (
                  'End Call'
                )}
              </button>
            </div>
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