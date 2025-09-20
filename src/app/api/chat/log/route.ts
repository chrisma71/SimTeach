import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ChatLog } from '@/types/chatLog';
import OpenAI from 'openai';
import { ObjectId } from 'mongodb';

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

    // Generate session summary asynchronously
    console.log('Starting session summary generation for session:', result.insertedId.toString());
    generateSessionSummary(result.insertedId.toString(), transcript, studentName, studentSubject)
      .catch(error => {
        console.error('Failed to generate session summary:', error);
      });

    return NextResponse.json({ 
      success: true, 
      sessionId: result.insertedId,
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

// Function to generate session summary asynchronously
async function generateSessionSummary(sessionId: string, transcript: any[], studentName: string, studentSubject: string) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a summary prompt that focuses on what was accomplished and how the student felt
    const summaryPrompt = `You are analyzing a tutoring session between a tutor and ${studentName}, a student studying ${studentSubject || 'Physics'}.

Based on the conversation transcript below, create a concise summary (2-3 sentences) that includes:
1. What topics or problems were worked on
2. How much progress was made (or lack thereof)
3. How the student felt about the session (frustrated, engaged, confused, etc.)
4. Any specific challenges or breakthroughs

BE STRICT WITH THE SUMMARY AND ONLY INCLUDE THE INFORMATION THAT IS PROVIDED IN THE TRANSCRIPT. DO NOT MAKE UP ANY INFORMATION. IF NOTHING WAS DONE THEN SAY SO.

Write this from the student's perspective, as if the student is reflecting on the session. Use casual, teenage language.

Conversation transcript:
${transcript.map((msg: any) => `${msg.isUser ? 'Tutor' : studentName}: ${msg.text}`).join('\n')}

Summary:`;

    console.log('=== GENERATING SESSION SUMMARY ===');
    console.log('Session ID:', sessionId);
    console.log('Student:', studentName);
    console.log('Transcript length:', transcript.length, 'messages');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing tutoring sessions and creating concise, insightful summaries from the student's perspective. Focus on what was accomplished, how the student felt, and any key challenges or breakthroughs."
        },
        {
          role: "user",
          content: summaryPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content || "Session completed - no summary generated";

    console.log('Generated summary:', summary);

    // Update the chat log with the summary
    const db = await getDatabase();
    const chatLogsCollection = db.collection('chatLogs');
    
    console.log('Attempting to update session with ID:', sessionId);
    
    const updateResult = await chatLogsCollection.updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { summary: summary } }
    );

    console.log('Update result:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });
    
    if (updateResult.modifiedCount > 0) {
      console.log('Summary update result: Success');
    } else {
      console.log('Summary update result: Failed - no documents modified');
    }
    
    console.log('=== END SESSION SUMMARY GENERATION ===\n');

  } catch (error) {
    console.error('Error generating session summary:', error);
  }
}
