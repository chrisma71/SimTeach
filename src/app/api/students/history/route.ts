import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user-id';
    const studentId = searchParams.get('studentId');
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const chatLogsCollection = db.collection('chatLogs');

    // Get all chat sessions for this specific student
    const sessions = await chatLogsCollection
      .find({ 
        userId: userId,
        studentId: studentId 
      })
      .sort({ createdAt: 1 }) // Sort by createdAt ascending to get chronological order
      .toArray();

    // Combine all transcripts into a single conversation history
    const conversationHistory = [];
    
    for (const session of sessions) {
      if (session.transcript && Array.isArray(session.transcript)) {
        // Add session separator
        conversationHistory.push({
          type: 'session_separator',
          timestamp: session.createdAt || session.endedAt,
          sessionId: session._id,
          duration: session.conversationLength || 0
        });
        
        // Add all messages from this session
        conversationHistory.push(...session.transcript.map(msg => ({
          ...msg,
          sessionId: session._id,
          sessionTimestamp: session.createdAt || session.endedAt
        })));
      }
    }

    // Get student info from the first session
    const studentInfo = sessions.length > 0 ? {
      studentId: sessions[0].studentId,
      studentName: sessions[0].studentName,
      studentSubject: sessions[0].studentSubject
    } : null;

    return NextResponse.json({ 
      studentInfo,
      conversationHistory,
      totalSessions: sessions.length
    });
  } catch (error) {
    console.error('Error fetching student history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student history' },
      { status: 500 }
    );
  }
}
