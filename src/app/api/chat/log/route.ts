import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ChatLog, Feedback } from '@/types/chatLog';
import OpenAI from 'openai';
import { ObjectId } from 'mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      audioData,
      type,
      sessionId,
      duration
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

    // Use original transcript - speaker identification is already handled correctly
    const processedTranscript = transcript;
    let transcriptSummary = '';
    let topicsCovered: string[] = [];

    console.log('Using original transcript with proper speaker identification:', {
      length: processedTranscript.length,
      messages: processedTranscript.map((msg: any) => ({ text: msg.text.substring(0, 50) + '...', isUser: msg.isUser }))
    });

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
      transcript: processedTranscript, // Use processed transcript
      conversationCount: conversationCount + 1,
      conversationLength: conversationLength || duration || 0,
      audioUrl: audioData || undefined, // Store the base64 audio data
      createdAt: new Date(),
      endedAt: new Date(),
      type: type || 'tavus_video_session',
      sessionId: sessionId || undefined,
      summary: transcriptSummary, // Add OpenAI-generated summary
      topicsCovered: topicsCovered // Add topics covered
    };

    const result = await chatLogsCollection.insertOne(chatLog);

    // Generate feedback for the session asynchronously
    try {
      console.log('Starting feedback generation...');
      const feedbackResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/feedback/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: processedTranscript, // Use processed transcript
          studentName,
          studentSubject,
          conversationLength
        }),
      });

      console.log('Feedback response status:', feedbackResponse.status);
      
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        console.log('Feedback data received:', feedbackData);
        
        // Update the chat log with feedback
        await chatLogsCollection.updateOne(
          { _id: result.insertedId },
          { $set: { feedback: feedbackData.feedback } }
        );
        
        console.log('Feedback generated and stored successfully');
      } else {
        const errorText = await feedbackResponse.text();
        console.error('Failed to generate feedback:', feedbackResponse.status, errorText);
      }
    } catch (feedbackError) {
      console.error('Error generating feedback:', feedbackError);
      // Don't fail the main request if feedback generation fails
    }

    // Generate session summary asynchronously (optional AI enhancement)
    console.log('Starting session summary generation for session:', result.insertedId.toString());
    generateSessionSummary(result.insertedId.toString(), processedTranscript, studentName, studentSubject)
      .catch(error => {
        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate_limit')) {
          console.log('OpenAI API quota exceeded, skipping session summary generation');
        } else {
          console.error('Failed to generate session summary:', error);
        }
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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing tutoring sessions. Write concise, student-perspective summaries in casual language."
        },
        {
          role: "user",
          content: summaryPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    let summary = completion.choices[0]?.message?.content || "Session completed - no summary generated";
    
    // Clean the response text by removing markdown code blocks if present
    if (summary && summary.trim().startsWith('```')) {
      summary = summary.trim().replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

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
