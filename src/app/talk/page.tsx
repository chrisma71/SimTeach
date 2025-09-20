'use client';

import { useState, useEffect, useRef } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import Link from 'next/link';
import VideoCall from '@/components/VideoCall';
import TavusStudentCall from '@/components/TavusStudentCall';
import FeedbackModal from '@/components/FeedbackModal';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function TalkPage() {
  const { activeProfile } = useProfiles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timer and lesson tracking
  const [lessonStartTime, setLessonStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lessonDuration] = useState(15 * 60); // 15 minutes in seconds
  const [isLessonActive, setIsLessonActive] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isTavusCallActive, setIsTavusCallActive] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeProfile) {
      setMessages([{
        text: `Hi... I'm ${activeProfile.name}. My parents said you're going to help me with ${activeProfile.subject}...`,
        isUser: false,
        timestamp: new Date()
      }]);
      
      // Start lesson timer
      setLessonStartTime(new Date());
      setIsLessonActive(true);
    }
  }, [activeProfile]);

  // Timer effect
  useEffect(() => {
    if (isLessonActive && lessonStartTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - lessonStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
        
        if (elapsed >= lessonDuration) {
          endLesson();
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLessonActive, lessonStartTime, lessonDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    return Math.max(0, lessonDuration - elapsedTime);
  };

  const endLesson = () => {
    setIsLessonActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Show feedback modal - it will handle its own feedback generation
    setShowFeedback(true);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeProfile) return;

    const userMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          studentId: activeProfile.id,
          conversationHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.response) {
        const aiMessage: Message = {
          text: data.response,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const startVideoCall = () => {
    setIsVideoCallActive(true);
  };

  const endVideoCall = () => {
    setIsVideoCallActive(false);
  };

  const startTavusCall = () => {
    setIsTavusCallActive(true);
  };

  const endTavusCall = () => {
    setIsTavusCallActive(false);
  };

  const closeFeedback = () => {
    setShowFeedback(false);
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Student Selected</h1>
          <p className="mb-4">Please select a student to begin tutoring.</p>
          <Link 
            href="/"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Select Student
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Tutoring Session with {activeProfile.name}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Grade {activeProfile.grade} {activeProfile.subject} • Average: {activeProfile.averageGrade}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-2xl font-mono ${getRemainingTime() < 60 ? 'text-red-600' : 'text-green-600'}`}>
                {formatTime(getRemainingTime())}
              </div>
              <div className="text-xs text-gray-500">Time Left</div>
            </div>
            {isLessonActive && (
              <>
                <button
                  onClick={startTavusCall}
                  disabled={isTavusCallActive}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
                >
                  {isTavusCallActive ? 'In AI Call' : 'Start AI Student Call'}
                </button>
                <button
                  onClick={endLesson}
                  className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 text-sm"
                >
                  Get Feedback Now
                </button>
                <button
                  onClick={endLesson}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  End Lesson
                </button>
              </>
            )}
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Change Student
            </Link>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${(elapsedTime / lessonDuration) * 100}%` }}
        ></div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col">
        {/* Video Call Indicator */}
        {isVideoCallActive && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Video call active with {activeProfile.name}
                </span>
              </div>
              <button
                onClick={endVideoCall}
                className="text-red-600 hover:text-red-800 text-sm underline"
              >
                End Call
              </button>
            </div>
          </div>
        )}

        {/* Tavus AI Student Call Indicator */}
        {isTavusCallActive && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-purple-700 dark:text-purple-300 font-medium">
                  🤖 AI tutoring session active with {activeProfile.name}
                </span>
              </div>
              <button
                onClick={endTavusCall}
                className="text-red-600 hover:text-red-800 text-sm underline"
              >
                End AI Call
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                <p>{message.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                <p>Thinking...</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            disabled={isLoading || !isLessonActive}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim() || !isLessonActive}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {/* Video Call Component */}
      <VideoCall 
        isActive={isVideoCallActive}
        onEndCall={endVideoCall}
        studentName={activeProfile.name}
      />

      {/* Tavus AI Student Call Component */}
      <TavusStudentCall 
        isActive={isTavusCallActive}
        onEndCall={endTavusCall}
        studentProfile={activeProfile}
        subject={activeProfile.subject}
      />

      {/* Feedback Modal Component - Now handles its own feedback generation */}
      <FeedbackModal
        isVisible={showFeedback}
        studentProfile={activeProfile}
        messages={messages}
        lessonDuration={elapsedTime}
        onClose={closeFeedback}
      />
    </div>
  );
}
