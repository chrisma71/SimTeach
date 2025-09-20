'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChatLog, Feedback } from '@/types/chatLog';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

type TabType = 'transcript' | 'skill-analysis' | 'feedback';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<ChatLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  
  const caseId = params.caseId as string;

  useEffect(() => {
    const fetchCaseData = async () => {
      console.log('Review page - caseId:', caseId, 'type:', typeof caseId);
      console.log('Review page - params:', params);
      console.log('Review page - window.location:', window.location.href);
      
      if (!caseId || caseId === 'undefined') {
        console.log('Redirecting to review list due to invalid caseId');
        router.push('/review');
        return;
      }

      try {
        const response = await fetch(`/api/review/${caseId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch case data');
        }

        const data = await response.json();
        console.log('Case data received:', data.case);
        console.log('Audio URL:', data.case.audioUrl ? 'Present' : 'Missing');
        setCaseData(data.case);
      } catch (err) {
        console.error('Error fetching case data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseData();
  }, [caseId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Case...</h1>
          <p className="text-gray-600">Please wait while we load the conversation transcript.</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Case Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The requested case could not be found.'}</p>
          <div className="space-x-4">
            <Link 
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Go to Home
            </Link>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson Review</h1>
          <p className="text-gray-600">
            Lesson recorded at: {caseData && formatDate(caseData.createdAt)}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 px-6 py-4 text-sm font-medium text-center ${
                activeTab === 'transcript'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📄 Transcript
            </button>
            <button
              onClick={() => setActiveTab('skill-analysis')}
              className={`flex-1 px-6 py-4 text-sm font-medium text-center ${
                activeTab === 'skill-analysis'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Skill Analysis
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 px-6 py-4 text-sm font-medium text-center ${
                activeTab === 'feedback'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💬 Feedback
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Audio Player */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Session Recording</h4>
              {caseData?.audioUrl ? (
                <audio 
                  controls 
                  className="w-full"
                  preload="metadata"
                >
                  <source src={caseData.audioUrl} type="audio/webm" />
                  <source src={caseData.audioUrl} type="audio/mp4" />
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-2xl mb-2">🎤</div>
                  <p>No audio recording available for this session</p>
                  <p className="text-xs mt-1">Audio recording may not have been enabled or supported</p>
                </div>
              )}
            </div>

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Transcript</h3>
                
                {caseData && caseData.transcript.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages in this conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {caseData?.transcript.map((message) => (
                      <div key={message.id} className="space-y-2">
                        <div className="text-sm font-medium text-gray-800">
                          {message.isUser ? 'Teacher' : 'Student'}
                        </div>
                        <div className={`p-3 rounded-lg ${
                          message.isUser 
                            ? 'bg-blue-50 border border-blue-100' 
                            : 'bg-yellow-50 border border-yellow-100'
                        }`}>
                          <p className="text-gray-800">{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Skill Analysis Tab */}
            {activeTab === 'skill-analysis' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Skill Analysis</h3>
                
                {!caseData?.feedback ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-4">⏳</div>
                    <p>Skill analysis is being generated...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(caseData.feedback.specificInsights).map(([skill, score]) => (
                      <div key={skill} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="relative w-16 h-16 mx-auto mb-3">
                          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-gray-300"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="transparent"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-purple-600"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="transparent"
                              strokeLinecap="round"
                              strokeDasharray={`${score * 10}, 100`}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-700">{score}</span>
                          </div>
                        </div>
                        <h4 className="font-medium text-gray-800 capitalize">
                          {skill.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Feedback</h3>
                
                {!caseData?.feedback ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-4">⏳</div>
                    <p>Feedback is being generated...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {caseData.feedback.overallScore}/10
                      </div>
                      <p className="text-gray-700">{caseData.feedback.summary}</p>
                    </div>

                    {/* Strengths */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-3">✅ Strengths</h4>
                      <ul className="space-y-2">
                        {caseData.feedback.strengths.map((strength, index) => (
                          <li key={index} className="text-green-700">• {strength}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800 mb-3">🎯 Areas for Improvement</h4>
                      <ul className="space-y-2">
                        {caseData.feedback.areasForImprovement.map((area, index) => (
                          <li key={index} className="text-orange-700">• {area}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-3">💡 Recommendations</h4>
                      <ul className="space-y-2">
                        {caseData.feedback.recommendations.map((rec, index) => (
                          <li key={index} className="text-blue-700">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            href="/talk"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Start New Session
          </Link>
          <Link 
            href="/review"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            View All Sessions
          </Link>
        </div>
      </div>
    </div>
  );
}
