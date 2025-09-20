import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameter for now - in production, this should come from auth
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user-id';
    
    const db = await getDatabase();
    const chatLogsCollection = db.collection('chatLogs');

    // Get all chat sessions for this user
    console.log('Querying sessions for userId:', userId);
    const sessions = await chatLogsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log('Found sessions:', sessions.length);
    if (sessions.length > 0) {
      console.log('Sample session:', {
        _id: sessions[0]._id,
        userId: sessions[0].userId,
        studentId: sessions[0].studentId,
        studentName: sessions[0].studentName,
        createdAt: sessions[0].createdAt,
        conversationLength: sessions[0].conversationLength
      });
    }

    // Group sessions by student
    const studentSessions = new Map();
    
    for (const session of sessions) {
      const studentId = session.studentId;
      const studentName = session.studentName;
      const studentSubject = session.studentSubject;
      
      if (!studentSessions.has(studentId)) {
        studentSessions.set(studentId, {
          studentId,
          studentName,
          studentSubject,
          totalSessions: 0,
          lastSessionDate: null,
          lastSessionSummary: null,
          totalDuration: 0,
          sessions: []
        });
      }
      
      const studentData = studentSessions.get(studentId);
      studentData.totalSessions += 1;
      studentData.totalDuration += session.conversationLength || 0;
      // Convert MongoDB Date objects to ISO strings for proper serialization
      const sessionDate = session.createdAt || session.endedAt;
      const sessionDateString = sessionDate ? new Date(sessionDate).toISOString() : null;
      
      studentData.sessions.push({
        sessionId: session._id,
        timestamp: sessionDateString,
        duration: session.conversationLength || 0,
        messageCount: session.transcript?.length || 0
      });
      
      // Update last session date and summary
      if (sessionDateString && (!studentData.lastSessionDate || new Date(sessionDateString) > new Date(studentData.lastSessionDate))) {
        studentData.lastSessionDate = sessionDateString;
        studentData.lastSessionSummary = session.summary || null;
      }
    }

    // Convert map to array and sort by last session date
    const students = Array.from(studentSessions.values()).sort((a, b) => 
      new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime()
    );

    // Debug logging
    console.log('Sessions found:', sessions.length);
    console.log('Students processed:', students.length);
    console.log('Sample student data:', students[0]);

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error fetching student sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student sessions' },
      { status: 500 }
    );
  }
}
