export interface ChatLog {
  _id?: string;
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
  createdAt: Date;
  endedAt: Date;
}
