'use client';

import { useState, useEffect } from 'react';
import { useAuth0 } from '@/contexts/Auth0Context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { students as allStudents } from '@/lib/students';

interface StudentSession {
  studentId: string;
  studentName: string;
  studentSubject: string;
  totalSessions: number;
  lastSessionDate: string;
  lastSessionSummary?: string;
  totalDuration: number;
  sessions: Array<{
    sessionId: string;
    timestamp: string;
    duration: number;
    messageCount: number;
  }>;
}

interface StudentSessionsResponse {
  students: StudentSession[];
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth0();
  const router = useRouter();
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStudentSessions();
    }
  }, [authLoading, user]);

  const fetchStudentSessions = async () => {
    try {
      setLoading(true);
      const userId = user?._id || 'demo-user-id';
      
      const response = await fetch(`/api/students/sessions?userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch student sessions: ${response.status}`);
      }
      
      const data: StudentSessionsResponse = await response.json();
      console.log('Fetched student sessions:', data.students);
      console.log('Sample student with summary:', data.students.find(s => s.lastSessionSummary));
      setStudents(data.students);
    } catch (err) {
      console.error('Error fetching student sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load student sessions');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) {
      return 'Unknown';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    
    const now = new Date();
    
    // Reset time to start of day for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sessionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today.getTime() - sessionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleContinueTutoring = (student: StudentSession) => {
    // Store the student info in sessionStorage for the talk page to use
    const studentData = {
      id: student.studentId,
      name: student.studentName,
      subject: student.studentSubject
    };
    
    sessionStorage.setItem('selectedStudent', JSON.stringify(studentData));
    
    // Navigate to the talk page
    router.push('/talk');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Dashboard...</h1>
          <p className="text-gray-600">Please wait while we load your student sessions.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to view your dashboard.</p>
          <Link 
            href="/api/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Login with Auth0
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchStudentSessions}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tutoring Dashboard</h1>
          <p className="text-gray-600">Continue tutoring your students or start a new session</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {students.reduce((sum, student) => sum + student.totalSessions, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(students.reduce((sum, student) => sum + student.totalDuration, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Yet</h3>
            <p className="text-gray-600 mb-6">Start your first tutoring session to see students here.</p>
            <Link
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Start Tutoring
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div key={student.studentId} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{student.studentName}</h3>
                      <p className="text-sm text-gray-600">{student.studentSubject}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{student.totalSessions}</div>
                      <div className="text-xs text-gray-500">sessions</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last session:</span>
                      <span className="text-gray-900">{formatDate(student.lastSessionDate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total time:</span>
                      <span className="text-gray-900">{formatDuration(student.totalDuration)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg. duration:</span>
                      <span className="text-gray-900">
                        {formatDuration(Math.round(student.totalDuration / student.totalSessions))}
                      </span>
                    </div>
                  </div>

                  {student.lastSessionSummary && (
                    <div className="mb-6">
                      <div className="text-sm font-medium text-gray-700 mb-2">Last session summary:</div>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">
                        "{student.lastSessionSummary}"
                      </div>
                    </div>
                  )}

                  {(() => {
                    const studentConfig = allStudents.find(s => s.id === student.studentId);
                    const isAvailable = studentConfig?.tavusConfig?.isAvailable;
                    
                    if (isAvailable) {
                      return (
                        <button
                          onClick={() => handleContinueTutoring(student)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                        >
                          Continue Tutoring
                        </button>
                      );
                    } else {
                      return (
                        <div className="w-full bg-gray-300 text-gray-600 py-2 px-4 rounded-lg text-center font-medium cursor-not-allowed">
                          Coming Soon
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
