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
  feedback?: Feedback; // AI-generated feedback for the tutoring session
  audioUrl?: string; // URL to recorded audio file
  createdAt: Date;
  endedAt: Date;
}
