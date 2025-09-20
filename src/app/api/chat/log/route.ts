import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ChatLog } from '@/types/chatLog';

export async function POST(request: NextRequest) {
  try {
    let data;
    
    // Handle both JSON and sendBeacon requests
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await request.json();
    } else {
      // Handle sendBeacon requests (text/plain)
      const text = await request.text();
      data = JSON.parse(text);
    }
    
    const { 
      userId, 
      studentId, 
      studentName, 
      studentSubject, 
      transcript, 
      conversationLength 
    } = data;

    if (!userId || !studentId || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify authentication for JSON requests (not for sendBeacon)
    if (contentType?.includes('application/json')) {
      const sessionCookie = request.cookies.get('auth0_session');
      
      if (!sessionCookie) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      try {
        const session = JSON.parse(sessionCookie.value);
        
        if (!session.user || !session.user.sub) {
          return NextResponse.json(
            { error: 'Invalid session' },
            { status: 401 }
          );
        }

        // Verify the userId matches the authenticated user
        if (session.user.sub !== userId) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid session format' },
          { status: 401 }
        );
      }
    }

    const db = await getDatabase();
    const chatLogsCollection = db.collection<ChatLog>('chatLogs');

    // Count previous conversations between this user and student
    const conversationCount = await chatLogsCollection.countDocuments({
      userId,
      studentId
    });

    const chatLog: Omit<ChatLog, '_id'> = {
      userId,
      studentId,
      studentName: studentName || 'Unknown Student',
      studentSubject: studentSubject || 'Unknown Subject',
      transcript,
      conversationCount: conversationCount + 1,
      conversationLength,
      createdAt: new Date(),
      endedAt: new Date()
    };

    const result = await chatLogsCollection.insertOne(chatLog);

    return NextResponse.json({ 
      success: true, 
      id: result.insertedId,
      conversationCount: conversationCount + 1
    });

  } catch (error) {
    console.error('Error logging chat session:', error);
    return NextResponse.json(
      { error: 'Failed to log chat session' },
      { status: 500 }
    );
  }
}
