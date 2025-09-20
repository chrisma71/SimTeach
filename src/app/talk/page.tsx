'use client';

import { useState, useEffect } from 'react';
import { useProfiles } from '@/hooks/useProfiles';
import Link from 'next/link';

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

  useEffect(() => {
    if (activeProfile) {
      setMessages([{
        text: `Hi... I'm ${activeProfile.name}. My parents said you're going to help me with ${activeProfile.subject}...`,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [activeProfile]);

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
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Change Student
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col">
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
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
