'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          await handleUserMessage(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser');
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Add welcome message
    setMessages([{
      id: '1',
      text: 'Hello! I\'m your AI assistant. Click the microphone to start talking to me.',
      isUser: false,
      timestamp: new Date()
    }]);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleUserMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Send to AI API with conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
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
      setError('Failed to get AI response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current) {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
      };
      
      synthRef.current.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearMessages = () => {
    setMessages([{
      id: '1',
      text: 'Hello! I\'m your AI assistant. Click the microphone to start talking to me.',
      isUser: false,
      timestamp: new Date()
    }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <h1 className="text-3xl font-bold text-center">Voice AI Chat</h1>
            <p className="text-center text-blue-100 mt-2">
              Talk to your AI assistant using your voice
            </p>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
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
                <div className="bg-gray-200 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-100 border-l-4 border-red-500 text-red-700">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Controls */}
          <div className="bg-gray-50 p-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={startListening}
                disabled={isListening || isProcessing || isSpeaking}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
                }`}
              >
                {isListening ? 'Listening...' : 'Start Talking'}
              </button>
              
              {isListening && (
                <button
                  onClick={stopListening}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full font-semibold transition-all duration-200"
                >
                  Stop
                </button>
              )}
              
              <button
                onClick={clearMessages}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-full font-semibold transition-all duration-200"
              >
                Clear Chat
              </button>
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center space-x-6 mt-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                <span>Listening</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>Speaking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                <span>Processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
