export interface Feedback {
  overallScore: number; // 1-10 scale
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  specificInsights: {
    rapport: number; // 1-10
    questioningTechnique: number; // 1-10
    patience: number; // 1-10
    adaptability: number; // 1-10
    subjectKnowledge: number; // 1-10
  };
  recommendations: string[];
  skillRecommendations?: {
    rapport: string[];
    questioningTechnique: string[];
    patience: string[];
    adaptability: string[];
    subjectKnowledge: string[];
  };
  studentEngagement: number; // 1-10
  keyMoments: Array<{
    timestamp: string;
    description: string;
    type: 'strength' | 'improvement' | 'breakthrough' | 'challenge';
  }>;
}

import { ObjectId } from 'mongodb';

export interface ChatLog {
  _id?: ObjectId;
  userId: string;
  studentId: string;
  studentName: string;
  studentSubject: string;
  transcript: Array<{
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
  }>;
  conversationCount: number; // Number of conversations this user has had with this student
  conversationLength: number; // Duration in seconds
  summary?: string; // AI-generated summary of what was accomplished and how the student felt
  feedback?: Feedback; // AI-generated feedback for the tutoring session
  type?: string; // Type of session (e.g., 'tavus_video_session')
  sessionId?: string; // Custom session identifier
  topicsCovered?: string[]; // Topics discussed in the session
  createdAt: Date;
  endedAt: Date;
}
