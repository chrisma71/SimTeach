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
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [currentSkillIndex, setCurrentSkillIndex] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [isCollapsing, setIsCollapsing] = useState<boolean>(false);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState<number>(0);
  
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



  const getSkillExplanation = (skill: string, score: number) => {
    const explanations: Record<string, (score: number) => { description: string; reasoning: string }> = {
      rapport: (score) => ({
        description: "Rapport measures how well you connected with the student and built a positive relationship.",
        reasoning: score >= 8 
          ? "Excellent rapport building! You created a comfortable, supportive environment that encouraged student participation."
          : score >= 6 
          ? "Good rapport overall. You maintained a friendly tone and showed interest in the student's learning."
          : score >= 4
          ? "Some rapport established, but there's room to be more engaging and show greater interest in the student's perspective."
          : "Limited rapport building. Focus on being more personable, asking about the student's interests, and creating a welcoming atmosphere."
      }),
      questioningTechnique: (score) => ({
        description: "Questioning technique evaluates your use of open-ended questions, scaffolding, and probing for deeper understanding.",
        reasoning: score >= 8
          ? "Outstanding questioning! You used a variety of open-ended questions and effectively guided the student's thinking."
          : score >= 6
          ? "Good questioning skills. You asked relevant questions and provided appropriate guidance."
          : score >= 4
          ? "Basic questioning technique. Try using more open-ended questions and allowing more time for student responses."
          : "Needs improvement in questioning. Focus on asking 'why' and 'how' questions rather than yes/no questions, and give students time to think."
      }),
      patience: (score) => ({
        description: "Patience measures your ability to give students time to think and respond without rushing them.",
        reasoning: score >= 8
          ? "Excellent patience! You gave students adequate time to process and respond, creating a comfortable learning pace."
          : score >= 6
          ? "Good patience overall. You generally allowed appropriate response time."
          : score >= 4
          ? "Some patience shown, but try to wait longer for responses and avoid interrupting student thinking."
          : "Limited patience demonstrated. Practice waiting 3-5 seconds after asking questions and avoid rushing to provide answers."
      }),
      adaptability: (score) => ({
        description: "Adaptability assesses how well you adjusted your teaching approach based on the student's needs and responses.",
        reasoning: score >= 8
          ? "Highly adaptable! You seamlessly adjusted your approach based on student understanding and engagement."
          : score >= 6
          ? "Good adaptability. You made some adjustments to better meet the student's needs."
          : score >= 4
          ? "Some adaptability shown. Try to be more responsive to student confusion or disengagement."
          : "Limited adaptability. Focus on observing student cues and being willing to change your approach when something isn't working."
      }),
      subjectKnowledge: (score) => ({
        description: "Subject knowledge evaluates your accuracy, depth, and ability to explain concepts clearly.",
        reasoning: score >= 8
          ? "Excellent subject knowledge! You demonstrated deep understanding and explained concepts clearly and accurately."
          : score >= 6
          ? "Good subject knowledge. You showed solid understanding and provided accurate explanations."
          : score >= 4
          ? "Adequate subject knowledge, but consider reviewing key concepts to provide more accurate and detailed explanations."
          : "Subject knowledge needs strengthening. Review the material thoroughly and practice explaining concepts in simple terms."
      })
    };

    return explanations[skill]?.(score) || {
      description: "This skill measures an important aspect of effective tutoring.",
      reasoning: `Based on the session, this skill received a score of ${score}/10.`
    };
  };


  const handleSkillClick = (skill: string) => {
    if (!caseData?.feedback || isAnimating) return;
    
    const skillKeys = Object.keys(caseData.feedback.specificInsights);
    const skillIndex = skillKeys.indexOf(skill);
    
    setIsExpanding(true);
    setIsAnimating(true);
    
    // Small delay to allow expand animation to start
    setTimeout(() => {
      setExpandedSkill(skill);
      setCurrentSkillIndex(skillIndex);
      
      // Reset animation state after animation completes
      setTimeout(() => {
        setIsExpanding(false);
        setIsAnimating(false);
      }, 300);
    }, 50);
  };

  const navigateToSkill = (direction: 'prev' | 'next') => {
    if (!caseData?.feedback || isAnimating) return;
    
    const skillKeys = Object.keys(caseData.feedback.specificInsights);
    let newIndex = currentSkillIndex;
    
    if (direction === 'prev') {
      newIndex = currentSkillIndex > 0 ? currentSkillIndex - 1 : skillKeys.length - 1;
    } else {
      newIndex = currentSkillIndex < skillKeys.length - 1 ? currentSkillIndex + 1 : 0;
    }
    
    setIsAnimating(true);
    
    // Start flip animation
    setTimeout(() => {
      setCurrentSkillIndex(newIndex);
      setExpandedSkill(skillKeys[newIndex]);
      
      // Reset animation state after flip completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 600);
    }, 300);
  };

  const collapseSkill = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsCollapsing(true);
    
    // Start collapse animation with fade out
    setTimeout(() => {
      setExpandedSkill(null);
      setCurrentSkillIndex(0);
      
      // Reset animation state after collapse completes
      setTimeout(() => {
        setIsAnimating(false);
        setIsCollapsing(false);
      }, 300);
    }, 200);
  };

  const handleFeedbackClick = (feedbackType: string) => {
    if (isAnimating) return;
    
    const feedbackTypes = ['strengths', 'areasForImprovement', 'recommendations'];
    const feedbackIndex = feedbackTypes.indexOf(feedbackType);
    
    setIsAnimating(true);
    setIsExpanding(true);
    
    // Small delay to allow expand animation to start
    setTimeout(() => {
      setExpandedFeedback(feedbackType);
      setCurrentFeedbackIndex(feedbackIndex);
      
      // Reset animation state after animation completes
      setTimeout(() => {
        setIsExpanding(false);
        setIsAnimating(false);
      }, 300);
    }, 50);
  };

  const navigateToFeedback = (direction: 'prev' | 'next') => {
    if (isAnimating) return;
    
    const feedbackTypes = ['strengths', 'areasForImprovement', 'recommendations'];
    let newIndex = currentFeedbackIndex;
    
    if (direction === 'prev') {
      newIndex = currentFeedbackIndex > 0 ? currentFeedbackIndex - 1 : feedbackTypes.length - 1;
    } else {
      newIndex = currentFeedbackIndex < feedbackTypes.length - 1 ? currentFeedbackIndex + 1 : 0;
    }
    
    setIsAnimating(true);
    
    // Start flip animation
    setTimeout(() => {
      setCurrentFeedbackIndex(newIndex);
      setExpandedFeedback(feedbackTypes[newIndex]);
      
      // Reset animation state after flip completes
      setTimeout(() => {
        setIsAnimating(false);
      }, 600);
    }, 300);
  };

  const collapseFeedback = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsCollapsing(true);
    
    // Start collapse animation with fade out
    setTimeout(() => {
      setExpandedFeedback(null);
      setCurrentFeedbackIndex(0);
      
      // Reset animation state after collapse completes
      setTimeout(() => {
        setIsAnimating(false);
        setIsCollapsing(false);
      }, 300);
    }, 200);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Action Buttons - Top Priority */}
      <div className="bg-blue-600 text-white py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center space-x-4">
            <Link 
              href="/talk"
              className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Start New Session
            </Link>
            <Link 
              href="/review"
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              View All Sessions
            </Link>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes cardFlip {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(90deg); }
          100% { transform: rotateY(0deg); }
        }
        
        @keyframes fadeInScale {
          0% { 
            opacity: 0; 
            transform: scale(0.8); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
        
        @keyframes fadeOutScale {
          0% { 
            opacity: 1; 
            transform: scale(1); 
          }
          100% { 
            opacity: 0; 
            transform: scale(0.8); 
          }
        }
        
        .card-flip {
          animation: cardFlip 0.6s ease-in-out;
        }
        
        .fade-in-scale {
          animation: fadeInScale 0.3s ease-out;
        }
        
        .fade-out-scale {
          animation: fadeOutScale 0.3s ease-in;
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  📚 Lesson Review
                </h1>
                <p className="text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Lesson recorded at: {caseData && formatDate(caseData.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Session Duration</div>
                <div className="text-lg font-semibold text-gray-700">
                  {caseData && formatTime(caseData.conversationLength)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200/50">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-all duration-300 relative ${
                activeTab === 'transcript'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📄</span>
                <span>Transcript</span>
              </div>

            </button>
            <button
              onClick={() => setActiveTab('skill-analysis')}
              className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-all duration-300 relative ${
                activeTab === 'skill-analysis'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">📊</span>
                <span>Skill Analysis</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex-1 px-6 py-4 text-sm font-medium text-center transition-all duration-300 relative ${
                activeTab === 'feedback'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">💬</span>
                <span>Feedback</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">

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
                ) : expandedSkill ? (
                  // Expanded Skill View
                  <div className={`bg-white rounded-lg shadow-lg p-8 min-h-[500px] transition-all duration-300 ease-in-out ${
                    isExpanding ? 'fade-in-scale' : ''
                  } ${isAnimating && !isExpanding && !isCollapsing ? 'card-flip' : ''} ${
                    isCollapsing ? 'fade-out-scale' : ''
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={collapseSkill}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <h2 className="text-2xl font-bold text-gray-800 capitalize">
                          {expandedSkill.replace(/([A-Z])/g, ' $1').trim()}
                        </h2>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigateToSkill('prev')}
                          disabled={isAnimating}
                          className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 ${
                            isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                          }`}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className={`text-sm text-gray-500 px-3 transition-all duration-300 ${
                          isAnimating ? 'opacity-50' : ''
                        }`}>
                          {currentSkillIndex + 1} of {Object.keys(caseData.feedback.specificInsights).length}
                        </span>
                        <button
                          onClick={() => navigateToSkill('next')}
                          disabled={isAnimating}
                          className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 ${
                            isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                          }`}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-600 ease-in-out ${
                      isAnimating ? 'transform rotateY-180' : ''
                    }`}>
                      {/* Left side - Score and Overview */}
                      <div className={`space-y-6 transition-all duration-300 ${
                        isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
                      }`}>
                        <div className="text-center">
                          <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
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
                                strokeDasharray={`${Math.min(((caseData.feedback.specificInsights as any)[expandedSkill] || 0) * 10, 100)}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-3xl font-bold text-gray-700">
                                {Math.min(((caseData.feedback.specificInsights as any)[expandedSkill] || 0), 10)}
                              </span>
                            </div>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-800">Score: {Math.min(((caseData.feedback.specificInsights as any)[expandedSkill] || 0), 10)}/10</h3>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-800 mb-2">What is this skill?</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {getSkillExplanation(expandedSkill, (caseData.feedback.specificInsights as any)[expandedSkill]).description}
                          </p>
                        </div>
                      </div>

                      {/* Right side - Detailed Analysis */}
                      <div className={`space-y-6 transition-all duration-300 ${
                        isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
                      }`}>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Areas for Improvement
                          </h4>
                          <p className="text-red-700 text-sm leading-relaxed">
                            {getSkillExplanation(expandedSkill, (caseData.feedback.specificInsights as any)[expandedSkill]).reasoning}
                          </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Specific Recommendations
                          </h4>
                          <ul className="text-blue-700 text-sm space-y-1">
                            {(() => {
                              // Use AI-generated skill-specific recommendations if available
                              const skillRecs = caseData.feedback.skillRecommendations?.[expandedSkill as keyof typeof caseData.feedback.skillRecommendations];
                              
                              if (skillRecs && skillRecs.length > 0) {
                                return skillRecs.map((rec, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-blue-500 mr-2">•</span>
                                    {rec}
                                  </li>
                                ));
                              }
                              
                              // Fallback to general recommendations if no skill-specific ones
                              return caseData.feedback.recommendations.slice(0, 3).map((rec, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-blue-500 mr-2">•</span>
                                  {rec}
                                </li>
                              ));
                            })()}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Grid View
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(caseData.feedback.specificInsights).map(([skill, score]) => {
                      console.log(`Skill: ${skill}, Score: ${score}, Type: ${typeof score}`);
                      
                      const getScoreColor = (score: number) => {
                        if (score >= 8) return 'from-green-500 to-emerald-500';
                        if (score >= 6) return 'from-yellow-500 to-orange-500';
                        if (score >= 4) return 'from-orange-500 to-red-500';
                        return 'from-red-500 to-red-600';
                      };
                      
                      // Ensure score is a number and handle edge cases
                      const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;
                      const displayScore = Math.min(Math.max(numericScore, 0), 10); // Clamp between 0-10
                      const progressPercentage = (displayScore / 10) * 100;
                      
                      console.log(`Grid - Skill: ${skill}, Original: ${score}, Numeric: ${numericScore}, Display: ${displayScore}, Progress: ${progressPercentage}%`);
                      console.log(`Grid - strokeDasharray will be: "${progressPercentage}, 100"`);
                      console.log(`Grid - style strokeDasharray will be: "${progressPercentage}, 100"`);
                      
                      return (
                        <div 
                          key={skill} 
                          className="relative group cursor-pointer"
                          onClick={() => handleSkillClick(skill)}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                            <div className="text-center">
                              <div className="relative w-20 h-20 mx-auto mb-4">
                                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                                  <path
                                    className="text-gray-200"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="transparent"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path
                                    className={`text-${displayScore >= 8 ? 'green' : displayScore >= 6 ? 'yellow' : displayScore >= 4 ? 'orange' : 'red'}-500`}
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    fill="transparent"
                                    strokeLinecap="round"
                                    strokeDasharray={`${progressPercentage}, 100`}
                                    style={{ 
                                      strokeDasharray: `${progressPercentage}, 100`,
                                      stroke: displayScore >= 8 ? '#10b981' : displayScore >= 6 ? '#eab308' : displayScore >= 4 ? '#f97316' : '#ef4444'
                                    }}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xl font-bold text-gray-700">{displayScore}</span>
                                </div>
                              </div>
                              <h4 className="font-semibold text-gray-800 capitalize text-lg mb-2">
                                {skill.replace(/([A-Z])/g, ' $1').trim()}
                              </h4>
                              <div className="flex items-center justify-center text-sm text-gray-500 group-hover:text-purple-600 transition-colors duration-200">
                                <span className="mr-1">Click to expand</span>
                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6 flex items-center">
                  <span className="text-3xl mr-3">💬</span>
                  AI Feedback Analysis
                </h3>
                
                {!caseData?.feedback ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-lg">AI is analyzing your session...</p>
                    <p className="text-sm text-gray-400 mt-2">This usually takes 30-60 seconds</p>
                  </div>
                ) : expandedFeedback ? (
                  // Expanded Feedback View with Overall Performance
                  <div className="space-y-6">
                    {/* Overall Performance Card - Always Visible */}
                    <div className="bg-white rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
                      <div className="text-center">
                        <div className="relative inline-block mb-4">
                          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-2xl font-bold text-white">
                              {caseData.feedback.overallScore}
                            </span>
                          </div>
                          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                            /10
                          </div>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Overall Performance</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{caseData.feedback.summary}</p>
                      </div>
                    </div>

                    {/* Expanded Feedback Card */}
                    <div className={`bg-white rounded-2xl p-8 shadow-xl border border-gray-200 transition-all duration-300 ease-in-out ${
                      isExpanding ? 'fade-in-scale' : ''
                    } ${isAnimating && !isExpanding && !isCollapsing ? 'card-flip' : ''} ${
                      isCollapsing ? 'fade-out-scale' : ''
                    }`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={collapseFeedback}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <h2 className="text-2xl font-bold text-gray-800 capitalize flex items-center">
                            {expandedFeedback === 'strengths' && <span className="text-3xl mr-3">✅</span>}
                            {expandedFeedback === 'areasForImprovement' && <span className="text-3xl mr-3">🎯</span>}
                            {expandedFeedback === 'recommendations' && <span className="text-3xl mr-3">💡</span>}
                            {expandedFeedback.replace(/([A-Z])/g, ' $1').trim()}
                          </h2>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigateToFeedback('prev')}
                            disabled={isAnimating}
                            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 ${
                              isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                            }`}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <span className={`text-sm text-gray-500 px-3 transition-all duration-300 ${
                            isAnimating ? 'opacity-50' : ''
                          }`}>
                            {currentFeedbackIndex + 1} of 3
                          </span>
                          <button
                            onClick={() => navigateToFeedback('next')}
                            disabled={isAnimating}
                            className={`p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 ${
                              isAnimating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
                            }`}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className={`space-y-4 transition-all duration-600 ease-in-out ${
                        isAnimating ? 'transform rotateY-180' : ''
                      }`}>
                        {expandedFeedback === 'strengths' && (
                          <ul className="space-y-4">
                            {caseData.feedback.strengths.map((strength, index) => (
                              <li key={index} className="flex items-start group/item">
                                <div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-4 flex-shrink-0 group-hover/item:scale-125 transition-transform duration-200"></div>
                                <span className="text-green-700 leading-relaxed text-lg">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {expandedFeedback === 'areasForImprovement' && (
                          <ul className="space-y-4">
                            {caseData.feedback.areasForImprovement.map((area, index) => (
                              <li key={index} className="flex items-start group/item">
                                <div className="w-3 h-3 bg-orange-500 rounded-full mt-2 mr-4 flex-shrink-0 group-hover/item:scale-125 transition-transform duration-200"></div>
                                <span className="text-orange-700 leading-relaxed text-lg">{area}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {expandedFeedback === 'recommendations' && (
                          <ul className="space-y-4">
                            {caseData.feedback.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start group/item">
                                <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-4 flex-shrink-0 group-hover/item:scale-125 transition-transform duration-200"></div>
                                <span className="text-blue-700 leading-relaxed text-lg">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Overall Score Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
                        <div className="text-center">
                          <div className="relative inline-block mb-4">
                            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-3xl font-bold text-white">
                                {caseData.feedback.overallScore}
                              </span>
                            </div>
                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
                              /10
                            </div>
                          </div>
                          <h4 className="text-xl font-semibold text-gray-800 mb-3">Overall Performance</h4>
                          <p className="text-gray-600 leading-relaxed">{caseData.feedback.summary}</p>
                        </div>
                      </div>

                    {/* Feedback Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Strengths Card */}
                      <div 
                        className="group cursor-pointer"
                        onClick={() => handleFeedbackClick('strengths')}
                      >
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200/50 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <span className="text-white text-2xl">✅</span>
                            </div>
                            <h4 className="text-xl font-bold text-green-800 mb-2">Strengths</h4>
                            <p className="text-green-600 text-sm mb-4">
                              {caseData.feedback?.strengths?.length || 0} strength{(caseData.feedback?.strengths?.length || 0) !== 1 ? 's' : ''} identified
                            </p>
                            <div className="flex items-center justify-center text-sm text-green-500 group-hover:text-green-600 transition-colors duration-200">
                              <span className="mr-1">Click to expand</span>
                              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Areas for Improvement Card */}
                      <div 
                        className="group cursor-pointer"
                        onClick={() => handleFeedbackClick('areasForImprovement')}
                      >
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200/50 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <span className="text-white text-2xl">🎯</span>
                            </div>
                            <h4 className="text-xl font-bold text-orange-800 mb-2">Areas for Improvement</h4>
                            <p className="text-orange-600 text-sm mb-4">
                              {caseData.feedback?.areasForImprovement?.length || 0} area{(caseData.feedback?.areasForImprovement?.length || 0) !== 1 ? 's' : ''} to focus on
                            </p>
                            <div className="flex items-center justify-center text-sm text-orange-500 group-hover:text-orange-600 transition-colors duration-200">
                              <span className="mr-1">Click to expand</span>
                              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations Card */}
                      <div 
                        className="group cursor-pointer"
                        onClick={() => handleFeedbackClick('recommendations')}
                      >
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200/50 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                              <span className="text-white text-2xl">💡</span>
                            </div>
                            <h4 className="text-xl font-bold text-blue-800 mb-2">Recommendations</h4>
                            <p className="text-blue-600 text-sm mb-4">
                              {caseData.feedback?.recommendations?.length || 0} recommendation{(caseData.feedback?.recommendations?.length || 0) !== 1 ? 's' : ''} provided
                            </p>
                            <div className="flex items-center justify-center text-sm text-blue-500 group-hover:text-blue-600 transition-colors duration-200">
                              <span className="mr-1">Click to expand</span>
                              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
