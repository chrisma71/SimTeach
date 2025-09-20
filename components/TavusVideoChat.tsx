'use client';

import { useState, useRef } from 'react';
import { Student } from '@/lib/students';

interface TavusVideoChatProps {
  student: Student;
  onCallEnd?: () => void;
}

export default function TavusVideoChat({ student, onCallEnd }: TavusVideoChatProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationData, setConversationData] = useState<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const startConversation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting conversation for student:', student.name);
      
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
      console.log('Conversation created:', data);
      setConversationData(data);
      
    } catch (error) {
      console.error('Error starting session:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    setConversationData(null);
    setError(null);
    onCallEnd?.();
  };

  // Show the embedded video call
  if (conversationData) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col">
        <div className="flex-1 relative">
          <iframe
            ref={iframeRef}
            src={conversationData.conversation_url}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; speaker; display-capture"
            title={`Video call with ${student.name}`}
          />
          
          {/* Control bar overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 rounded-lg px-4 py-2 flex items-center space-x-4">
            <div className="text-white text-sm">
              In call with {student.name}
            </div>
            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              End Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            {student.name.charAt(0)}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Ready to tutor {student.name}?
          </h1>
          <p className="text-gray-600 mb-6">
            {student.name} is a {student.age}-year-old grade {student.grade} student who needs help with {student.subject}.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-lg mb-3">Student Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <span className="font-medium text-gray-700">Subject:</span>
              <span className="ml-2 text-blue-600">{student.subject}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Current Average:</span>
              <span className="ml-2 text-green-600">{student.averageGrade}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <span className="font-medium text-gray-700">Personality:</span>
            <p className="text-gray-600 mt-1">{student.personality}</p>
          </div>
          
          <div className="mb-4">
            <span className="font-medium text-gray-700">Description:</span>
            <p className="text-gray-600 mt-1">{student.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">Struggles with:</span>
              <ul className="text-gray-600 mt-1 text-sm">
                {student.struggles?.map((struggle, index) => (
                  <li key={index}>• {struggle}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium text-gray-700">Strengths:</span>
              <ul className="text-gray-600 mt-1 text-sm">
                {student.strengths?.map((strength, index) => (
                  <li key={index}>• {strength}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-red-800 mb-2">Error starting session:</h4>
            <p className="text-red-600 mb-3">{error}</p>
            <details className="text-sm">
              <summary className="cursor-pointer text-red-700 hover:text-red-800">Technical details</summary>
              <p className="mt-2 text-red-600">Full error: {error}</p>
            </details>
            <button
              onClick={() => setError(null)}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={startConversation}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Starting Session...
              </div>
            ) : (
              `Start Video Call with ${student.name}`
            )}
          </button>
          
          <button
            onClick={handleEndCall}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
