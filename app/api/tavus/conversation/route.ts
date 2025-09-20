import { NextRequest, NextResponse } from 'next/server';
import { students } from '@/lib/students';

export async function POST(request: NextRequest) {
  try {
    console.log('Tavus API route called');
    
    const body = await request.json();
    console.log('Request body:', body);

    const { action, studentId } = body;

    // Environment variables check
    const apiKey = process.env.TAVUS_API_KEY;
    const replicaId = process.env.TAVUS_REPLICA_ID;
    const personaId = process.env.PERSONA_ID;

    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      hasReplicaId: !!replicaId,
      hasPersonaId: !!personaId
    });

    if (!apiKey || !replicaId || !personaId) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    if (action === 'create') {
      const student = students.find(s => s.id === studentId);
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      console.log('Found student:', student.name);
      console.log('Creating new conversation...');

      const conversationalContext = `You are ${student.name}, a ${student.age}-year-old student in grade ${student.grade}. You are currently in a tutoring session and need help with ${student.subject}. Your current average grade is ${student.averageGrade}.

Personality: ${student.personality}

You struggle with: ${student.struggles.join(', ')}.
Your strengths are: ${student.strengths.join(', ')}.

Respond as this student would - use age-appropriate language and show your personality. Be realistic about your knowledge level and don't be afraid to ask questions or express confusion when appropriate. Keep responses natural and conversational, suitable for video chat.`;

      const requestBody = {
        replica_id: replicaId,
        persona_id: personaId,
        conversational_context: conversationalContext,
        custom_greeting: `Hi there! I'm ${student.name}. I'm having some trouble with ${student.subject} and I heard you might be able to help me out?`,
        properties: {
          max_call_duration: 900,
          participant_absent_timeout: 60,
          participant_left_timeout: 60,
          enable_recording: false,
          enable_transcription: true,
          language: "english"
        }
      };

      console.log('Tavus request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://tavusapi.com/v2/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Tavus response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.log('Tavus API Error:', errorData);
        return NextResponse.json(
          { error: 'Failed to create conversation', details: errorData },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('Tavus API Success:', data);

      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Tavus API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
