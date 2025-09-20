'use client';

import { useState, useEffect } from 'react';
import { useProfiles } from '@/contexts/ProfileContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TavusVideoChat from '@/components/TavusVideoChat';

export default function TalkPage() {
  const { activeProfile, isLoading } = useProfiles();
  const router = useRouter();
  const [callDuration, setCallDuration] = useState(0);
  const [isInCall, setIsInCall] = useState(false);
  const timerRef = useState<NodeJS.Timeout | null>(null);

  // Start call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isInCall]);

  const handleCallStart = () => {
    setIsInCall(true);
    setCallDuration(0);
  };

  const handleCallEnd = () => {
    setIsInCall(false);
    // Could add session logging here if needed
    router.push('/');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          <p className="text-gray-600 mb-6">Please select a student profile to start the tutoring session.</p>
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
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-xl p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {activeProfile.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Tutoring Session with {activeProfile.name}
                </h1>
                <p className="text-gray-600">
                  Grade {activeProfile.grade} • {activeProfile.subject} • Average: {activeProfile.averageGrade}
                </p>
              </div>
            </div>
            
            {isInCall && (
              <div className="flex items-center space-x-4">
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-medium">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span>Live • {formatTime(callDuration)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Chat Interface */}
        <div className="bg-white rounded-b-2xl shadow-xl overflow-hidden">
          <div className="h-[600px]">
            <TavusVideoChat
              student={activeProfile}
              onCallStart={handleCallStart}
              onCallEnd={handleCallEnd}
            />
          </div>
        </div>

        {/* Student Information Panel */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Student Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Struggles</h3>
              <ul className="space-y-1">
                {activeProfile.struggles.map((struggle, index) => (
                  <li key={index} className="text-red-600 text-sm flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    {struggle}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Strengths</h3>
              <ul className="space-y-1">
                {activeProfile.strengths.map((strength, index) => (
                  <li key={index} className="text-green-600 text-sm flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Personality</h3>
            <p className="text-gray-600 text-sm">{activeProfile.personality}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

