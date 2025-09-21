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
  
  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const transcriptPollingRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const lastTranscriptTimeRef = useRef<number>(0);
  const tavusResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTavusResponseRef = useRef<string>('');

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

  // Speech recognition effect
  useEffect(() => {
    if (isCallActive && typeof window !== 'undefined') {
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          setIsListening(true);
        };
        
        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          const isFinal = event.results[current].isFinal;
          
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
        
        recognition.onerror = (event: any) => {
          console.error('🎤 Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          setIsListening(false);
          
          // Restart recognition after a short delay
          if (isCallActive) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (error) {
                console.log('🎤 Speech recognition restart failed:', error);
              }
            }, 100);
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
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      setIsListening(false);
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, [isCallActive]);

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
    console.log(`🔄 Switched speaker for message ${messageId}`);
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
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
    }
  };

  const endCall = async () => {
    setIsCallActive(false);
    
    console.log('🛑 Ending call...');
    console.log('⏱️ Call duration:', callDuration);
    console.log('📝 Transcript entries:', transcript.length);
    
    // Save transcript to chat log if we have entries
    if (transcript.length > 0 && user) {
      try {
        await fetch('/api/chat/log', {
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
        console.log('✅ Transcript saved to chat log');
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
    
    onEnd?.();
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

          {/* Transcript Panel - Slide out from right */}
          {isTranscriptVisible && (
            <div className="absolute top-0 right-0 w-80 h-full bg-black bg-opacity-90 text-white z-30 overflow-hidden">
              <div className="p-4 border-b border-gray-600 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Live Transcript</h3>
                <button
                  onClick={() => setIsTranscriptVisible(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <div className="animate-pulse">Waiting for conversation...</div>
                    <div className="text-xs mt-2 opacity-75">
                      Your speech will be transcribed automatically
                    </div>
                  </div>
                ) : (
                  transcript.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg ${
                        entry.isUser
                          ? 'bg-blue-600 ml-8'
                          : 'bg-gray-700 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">
                          {entry.isUser ? 'You' : student.name}
                        </div>
                        <button
                          onClick={() => switchMessageSpeaker(entry.id)}
                          className="text-xs bg-black bg-opacity-30 hover:bg-opacity-50 text-white px-2 py-1 rounded transition-colors"
                          title="Switch speaker"
                        >
                          🔄
                        </button>
                      </div>
                      <div className="text-sm">{entry.text}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Turn indicator */}
                {transcript.length > 0 && (
                  <div className="text-center text-gray-500 text-xs mt-4 p-2 bg-gray-800 rounded">
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${transcript.length % 2 === 0 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                      <span>Next turn: {transcript.length % 2 === 0 ? 'You' : 'Tavus'}</span>
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      Auto-alternating based on message count
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                
                {/* Speech recognition indicator */}
                {isListening && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-300">Listening...</span>
                  </div>
                )}
                
                {/* Current turn indicator */}
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${transcript.length % 2 === 0 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <span className="text-sm text-gray-300">
                    {transcript.length % 2 === 0 ? 'Your turn' : 'Tavus turn'}
                  </span>
                </div>
                
                {/* Progress dots */}
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
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
                {/* Transcript Toggle Button */}
                <button
                  onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <span>📝</span>
                  <span>Transcript</span>
                  {transcript.length > 0 && (
                    <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">
                      {transcript.length}
                    </span>
                  )}
                </button>
                
                {/* Manual Tavus Response Button (for testing) */}
                <button
                  onClick={() => {
                    const testResponse = "This is a test response from Tavus. How can I help you today?";
                    const newEntry = {
                      id: `tavus_manual_${Date.now()}`,
                      text: testResponse,
                      isUser: false,
                      timestamp: new Date()
                    };
                    setTranscript(prev => [...prev, newEntry]);
                    console.log('🤖 Manual Tavus response added:', testResponse);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Tavus
                </button>
                
                {/* Switch Turn Button */}
                <button
                  onClick={switchTurn}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🔄 Switch
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