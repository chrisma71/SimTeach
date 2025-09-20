'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface FeedbackData {
  engagement: {
    score: number;
    feedback: string;
  };
  understandability: {
    score: number;
    feedback: string;
  };
  studentLearning: {
    conceptsLearned: Array<{
      concept: string;
      description: string;
      evidence: string;
    }>;
    skillsDeveloped: Array<{
      skill: string;
      description: string;
      level: string;
    }>;
    progressMade: string;
  };
  teacherLearning: {
    pedagogicalInsights: Array<{
      insight: string;
      description: string;
      applicationExample: string;
    }>;
    studentUnderstanding: Array<{
      discovery: string;
      description: string;
      implications: string;
    }>;
    communicationLessons: Array<{
      lesson: string;
      description: string;
      improvement: string;
    }>;
  };
  areasForImprovement: Array<{
    area: string;
    currentLevel: string;
    targetLevel: string;
    strategies: string[];
  }>;
  overallFeedback: string;
  improvements: Array<{
    category: string;
    suggestion: string;
    rationale: string;
    implementation: string;
  }>;
}

interface FeedbackModalProps {
  isVisible: boolean;
  studentProfile: any;
  messages: Message[];
  lessonDuration: number;
  onClose: () => void;
}

export default function FeedbackModal({
  isVisible,
  studentProfile,
  messages,
  lessonDuration,
  onClose
}: FeedbackModalProps) {
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  // Generate feedback when modal becomes visible
  useEffect(() => {
    if (isVisible && !feedbackData && !isGeneratingFeedback) {
      generateFeedback();
    }
  }, [isVisible]);

  const generateFeedback = async () => {
    if (!studentProfile || !messages || messages.length === 0) return;

    setIsGeneratingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentProfile.id,
          messages: messages,
          lessonDuration: lessonDuration,
          subject: studentProfile.subject
        }),
      });

      if (response.ok) {
        const feedback = await response.json();
        setFeedbackData(feedback);
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const generateFeedbackVideo = async () => {
    if (!feedbackData || !studentProfile) return;

    setIsGeneratingVideo(true);
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackData,
          studentName: studentProfile.name,
          subject: studentProfile.subject
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setVideoId(data.videoId);
        
        // Poll for video completion
        pollVideoStatus(data.videoId);
      }
    } catch (error) {
      console.error('Error generating video:', error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const maxAttempts = 60; // 5 minutes max wait
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/video-status?videoId=${videoId}`);
        const status = await response.json();

        if (status.status === 'completed' && status.download_url) {
          setVideoUrl(status.download_url);
          return;
        } else if (status.status === 'failed') {
          console.error('Video generation failed');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        }
      } catch (error) {
        console.error('Error checking video status:', error);
      }
    };

    checkStatus();
  };

  const handleClose = () => {
    // Reset state when closing
    setFeedbackData(null);
    setIsGeneratingFeedback(false);
    setIsGeneratingVideo(false);
    setVideoUrl(null);
    setVideoId(null);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Lesson Feedback</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          {isGeneratingFeedback ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Generating your personalized feedback...</p>
            </div>
          ) : feedbackData ? (
            <div className="space-y-6">
              {/* Teaching Quality Scores */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Engagement Score</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {feedbackData.engagement.score}/10
                  </div>
                  <p className="text-sm">{feedbackData.engagement.feedback}</p>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Understandability Score</h3>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {feedbackData.understandability.score}/10
                  </div>
                  <p className="text-sm">{feedbackData.understandability.feedback}</p>
                </div>
              </div>

              {/* Student Learning Outcomes */}
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-4 text-green-700">📚 What {studentProfile.name} Learned</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Concepts Mastered:</h4>
                    {feedbackData.studentLearning.conceptsLearned.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded mb-2">
                        <div className="font-medium text-green-600">{item.concept}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.description}</div>
                        <div className="text-xs text-gray-500 italic mt-1">Evidence: "{item.evidence}"</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Skills Developed:</h4>
                    {feedbackData.studentLearning.skillsDeveloped.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded mb-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-600">{item.skill}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{item.level}</span>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.description}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded">
                    <h4 className="font-semibold mb-1">Overall Progress:</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{feedbackData.studentLearning.progressMade}</p>
                  </div>
                </div>
              </div>

              {/* Teacher Learning Insights */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-4 text-purple-700">🎓 What You Learned as a Teacher</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Teaching Insights:</h4>
                    {feedbackData.teacherLearning.pedagogicalInsights.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded mb-2">
                        <div className="font-medium text-purple-600">{item.insight}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.description}</div>
                        <div className="text-xs text-purple-600 italic mt-1">Try this: {item.applicationExample}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Student Understanding:</h4>
                    {feedbackData.teacherLearning.studentUnderstanding.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded mb-2">
                        <div className="font-medium text-indigo-600">{item.discovery}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.description}</div>
                        <div className="text-xs text-indigo-600 italic mt-1">Impact: {item.implications}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Communication Lessons:</h4>
                    {feedbackData.teacherLearning.communicationLessons.map((item, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded mb-2">
                        <div className="font-medium text-teal-600">{item.lesson}</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{item.description}</div>
                        <div className="text-xs text-teal-600 italic mt-1">Next time: {item.improvement}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Areas for Improvement */}
              <div>
                <h3 className="font-semibold mb-3 text-orange-600">⚠️ Areas to Revisit</h3>
                {feedbackData.areasForImprovement.map((area, index) => (
                  <div key={index} className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-3">
                    <div className="font-medium text-orange-700 mb-2">{area.area}</div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Current: </span>
                        <span className="text-gray-600">{area.currentLevel}</span>
                      </div>
                      <div>
                        <span className="font-medium">Target: </span>
                        <span className="text-gray-600">{area.targetLevel}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium text-sm">Strategies:</span>
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                        {area.strategies.map((strategy, i) => (
                          <li key={i}>{strategy}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Improvements */}
              <div>
                <h3 className="font-semibold mb-3">🚀 How to Improve Your Teaching</h3>
                {feedbackData.improvements.map((improvement, index) => (
                  <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-3">
                    <div className="flex items-start">
                      <span className="font-medium mr-2 text-yellow-600">{index + 1}.</span>
                      <div className="flex-1">
                        <div className="font-medium text-yellow-700 mb-1">
                          {improvement.category}: {improvement.suggestion}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{improvement.rationale}</div>
                        <div className="text-xs text-yellow-600 italic">How to: {improvement.implementation}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Feedback */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Overall Assessment</h3>
                <p className="text-sm">{feedbackData.overallFeedback}</p>
              </div>
            </div>
          ) : (
            <p>Failed to generate feedback. Please try again.</p>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            {feedbackData && !videoUrl && (
              <button
                onClick={generateFeedbackVideo}
                disabled={isGeneratingVideo}
                className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isGeneratingVideo ? 'Generating Video...' : 'Generate Video Feedback'}
              </button>
            )}
            
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
              >
                Watch Video Feedback
              </a>
            )}

            <Link
              href="/"
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
            >
              Select New Student
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Start New Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
