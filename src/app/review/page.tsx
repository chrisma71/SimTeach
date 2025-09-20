'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatLog } from '@/types/chatLog';

export default function ReviewListPage() {
  const [cases, setCases] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await fetch('/api/review');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch cases');
        }

        const data = await response.json();
        setCases(data.cases || []);
      } catch (err) {
        console.error('Error fetching cases:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Cases...</h1>
          <p className="text-gray-600">Please wait while we load your conversation history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Review Cases</h1>
              <p className="text-gray-600 mt-2">Browse your conversation history</p>
            </div>
            <Link 
              href="/talk"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Start New Session
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Cases</h2>
            <p className="text-red-600">{error}</p>
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">No Cases Found</h2>
            <p className="text-gray-600 mb-6">
              You haven't had any conversations yet. Start your first session to see cases here.
            </p>
            <Link 
              href="/talk"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Start First Session
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((caseItem) => (
              <div
                key={caseItem._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {caseItem.studentName}
                        </h3>
                        <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                          {caseItem.studentSubject}
                        </span>
                        {caseItem.feedback && (
                          <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded font-semibold">
                            {caseItem.feedback.overallScore}/10
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-2">
                        <span>📅 {formatDate(caseItem.createdAt)}</span>
                        <span>⏱️ {formatTime(caseItem.conversationLength)}</span>
                        <span>💬 {caseItem.transcript.length} messages</span>
                        <span>#{caseItem.conversationCount}</span>
                      </div>
                      {caseItem.feedback && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {caseItem.feedback.summary}
                        </p>
                      )}
                      {!caseItem.feedback && (
                        <p className="text-sm text-yellow-600">
                          ⏳ Feedback being generated...
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/review/${caseItem._id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
