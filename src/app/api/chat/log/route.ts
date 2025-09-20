import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ChatLog, Feedback } from '@/types/chatLog';

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
      conversationLength,
      audioData
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
      audioUrl: audioData || undefined, // Store the base64 audio data
      createdAt: new Date(),
      endedAt: new Date()
    };

    const result = await chatLogsCollection.insertOne(chatLog);

    // Generate feedback for the session asynchronously
    try {
      const feedbackResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/feedback/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          studentName,
          studentSubject,
          conversationLength
        }),
      });

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        
        // Update the chat log with feedback
        await chatLogsCollection.updateOne(
          { _id: result.insertedId },
          { $set: { feedback: feedbackData.feedback } }
        );
        
        console.log('Feedback generated and stored successfully');
      } else {
        console.error('Failed to generate feedback');
      }
    } catch (feedbackError) {
      console.error('Error generating feedback:', feedbackError);
      // Don't fail the main request if feedback generation fails
    }

    return NextResponse.json({ 
      success: true, 
      id: result.insertedId.toString(),
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
