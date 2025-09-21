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
  const { activeProfile, setActiveProfile } = useProfiles();
  
  // State management
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Auto-load the active profile from home page selection
  useEffect(() => {
    if (activeProfile && !selectedStudent) {
      setSelectedStudent(activeProfile);
    }
  }, [activeProfile, selectedStudent]);

  const handleEndCall = () => {
    setSelectedStudent(null);
    // Don't clear activeProfile - that's for student selection, not user profile
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
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Student</h2>
              <p className="text-gray-600">Choose a student to start your tutoring session</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => {
                const isAvailable = student.tavusConfig?.isAvailable;
                return (
                  <div
                    key={student.id}
                    className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${
                      isAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                    onClick={() => isAvailable && setSelectedStudent(student)}
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <img
                        src={student.thumbnail}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">Grade {student.grade} • {student.subject}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">{student.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {student.struggles.slice(0, 2).map((struggle, index) => (
                          <span key={index} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            {struggle}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {isAvailable ? (
                      <div className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-center font-medium transition-colors">
                        Start Session
                      </div>
                    ) : (
                      <div className="w-full bg-gray-300 text-gray-600 py-2 px-4 rounded-lg text-center font-medium">
                        Coming Soon
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
