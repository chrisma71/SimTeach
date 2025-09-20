'use client';

import { useEffect, useRef, useState } from 'react';
import { Student } from '@/lib/students';

interface TavusVideoChatProps {
  student: Student;
  onCallEnd: () => void;
  onCallStart: () => void;
}

export default function TavusVideoChat({ student, onCallEnd, onCallStart }: TavusVideoChatProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [detailedError, setDetailedError] = useState<string | null>(null);

  const startConversation = async () => {
    if (!student?.id) {
      setError('No student selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDetailedError(null);
    setCallStatus('connecting');

    try {
      console.log('Starting conversation for student:', student.id);
      
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

      console.log('API response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create conversation`);
      }

      const data = await response.json();
      console.log('Conversation created:', data);
      
      if (!data.conversation_url) {
        throw new Error('No conversation URL received from Tavus API');
      }

      setConversationUrl(data.conversation_url);
      setConversationId(data.conversation_id);
      setCallStatus('connected');
      onCallStart();
    } catch (err) {
      console.error('Error starting conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
      setError(errorMessage);
      setDetailedError(`Full error: ${err instanceof Error ? err.stack : JSON.stringify(err)}`);
      setCallStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = async () => {
    if (conversationId) {
      try {
        await fetch('/api/tavus/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'end',
            conversationId,
          }),
        });
      } catch (err) {
        console.error('Error ending conversation:', err);
      }
    }

    setConversationUrl(null);
    setConversationId(null);
    setCallStatus('ended');
    onCallEnd();
  };

  // Listen for messages from Tavus iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow messages from Tavus domains
      if (!event.origin.includes('tavus')) {
        return;
      }
      
      console.log('Received message from Tavus:', event.data);
      
      const { type, data } = event.data;
      
      switch (type) {
        case 'conversation_started':
          setCallStatus('connected');
          break;
        case 'conversation_ended':
          endConversation();
          break;
        case 'participant_joined':
          console.log('Participant joined:', data);
          break;
        case 'participant_left':
          console.log('Participant left:', data);
          break;
        default:
          console.log('Tavus message:', type, data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [conversationId]);

  if (callStatus === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Ready to tutor {student.name}?
          </h2>
          <p className="text-gray-600 mb-4">
            Grade {student.grade} • {student.subject} • Average: {student.averageGrade}
          </p>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            {student.description}
          </p>
        </div>

        <button
          onClick={startConversation}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </div>
          ) : (
            'Start Tutoring Session'
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm max-w-md">
            <p className="font-medium mb-2">Error starting session:</p>
            <p>{error}</p>
            {detailedError && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs opacity-75">Technical details</summary>
                <pre className="text-xs mt-1 p-2 bg-red-50 rounded overflow-auto">
                  {detailedError}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                setError(null);
                setDetailedError(null);
              }}
              className="mt-2 text-xs underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        <button
          onClick={onCallEnd}
          className="mt-4 text-gray-500 hover:text-gray-700 underline"
        >
          Back to Student Selection
        </button>
      </div>
    );
  }

  if (callStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Connecting to {student.name}...
          </h2>
          <p className="text-gray-600">Please wait while we set up your session</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      {conversationUrl && (
        <iframe
          ref={iframeRef}
          src={conversationUrl}
          className="w-full h-full border-0"
          allow="camera; microphone; display-capture"
          allowFullScreen
        />
      )}
      
      {/* End Call Button Overlay */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={endConversation}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-medium transition-colors duration-200 shadow-lg"
        >
          End Session
        </button>
      </div>

      {/* Student Info Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
        <p className="font-medium">{student.name}</p>
        <p className="text-sm opacity-90">Grade {student.grade} • {student.subject}</p>
      </div>
    </div>
  );
}
