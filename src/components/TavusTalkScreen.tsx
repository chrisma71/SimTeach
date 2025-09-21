'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@/contexts/Auth0Context';
import { useProfiles } from '@/contexts/ProfileContext';
import { students, Student } from '@/lib/students';
import TavusVideoChat from './TavusVideoChat';

interface TavusTalkScreenProps {
  onEndCall?: () => void;
}

export default function TavusTalkScreen({ onEndCall }: TavusTalkScreenProps) {
  const { user, isLoading: authLoading } = useAuth0();
  const { activeProfile } = useProfiles();
  
  // State management
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Auto-load first student
  useEffect(() => {
    if (!selectedStudent && students.length > 0) {
      const defaultStudent = students[0];
      setSelectedStudent(defaultStudent);
    }
  }, [selectedStudent]);

  const handleEndCall = () => {
    setSelectedStudent(null);
    onEndCall?.();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please log in to continue</h1>
          <a href="/api/auth/login" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Tavus Tutoring Session</h1>
              {selectedStudent && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <span>{selectedStudent.name} • Grade {selectedStudent.grade}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {selectedStudent ? (
          <div className="h-[600px]">
            <TavusVideoChat 
              student={selectedStudent} 
              onEnd={handleEndCall}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Student Selected</h2>
            <p className="text-gray-600 mb-4">Please select a student to start the tutoring session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
