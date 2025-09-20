import { NextRequest, NextResponse } from 'next/server';
import { students } from '@/lib/students';

// Function to generate personalized persona prompt based on student
function generatePersonaPrompt(student: any): string {
  return `You are ${student.name}, a ${student.age}-year-old student in grade ${student.grade}. You are currently in a tutoring session and need help with ${student.subject}. Your current average grade is ${student.averageGrade}.

Personality: ${student.personality}

You struggle with: ${student.struggles.join(', ')}.
Your strengths are: ${student.strengths.join(', ')}.

Respond as this student would - use age-appropriate language and show your personality. Be realistic about your knowledge level and don't be afraid to ask questions or express confusion when appropriate. Keep responses natural and conversational, suitable for video chat.`;
}

export async function POST(request: NextRequest) {
  console.log('Tavus API route called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { action, studentId, conversationId } = body;
    
    // Check environment variables
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
    const REPLICA_ID = process.env.REPLICA_ID || process.env.TAVUS_REPLICA_ID;
    const PERSONA_ID = process.env.PERSONA_ID;
    
    console.log('Environment check:', {
      hasApiKey: !!TAVUS_API_KEY,
      hasReplicaId: !!REPLICA_ID,
      hasPersonaId: !!PERSONA_ID
    });
    
    if (!TAVUS_API_KEY) {
      console.error('Missing TAVUS_API_KEY');
      return NextResponse.json(
        { error: 'Tavus API key not configured' },
        { status: 500 }
      );
    }

    if (!REPLICA_ID) {
      console.error('Missing REPLICA_ID');
      return NextResponse.json(
        { error: 'Replica ID not configured' },
        { status: 500 }
      );
    }

    const student = students.find(s => s.id === studentId);
    if (!student) {
      console.error('Student not found:', studentId);
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    console.log('Found student:', student.name);

    if (action === 'create') {
      console.log('Creating new conversation...');
      
      const requestBody = {
        replica_id: REPLICA_ID,
        ...(PERSONA_ID && { persona_id: PERSONA_ID }),
        conversational_context: generatePersonaPrompt(student),
        custom_greeting: `Hi there! I'm ${student.name}. I'm having some trouble with ${student.subject} and I heard you might be able to help me out?`,
        properties: {
          max_call_duration: 900,
          participant_absent_timeout: 60,
          participant_left_timeout: 60,
          enable_recording: false,
          enable_transcription: true,
          language: 'english'
        }
      };
      
      console.log('Tavus request body:', JSON.stringify(requestBody, null, 2));
      
      // Create new conversation
      const response = await fetch('https://tavusapi.com/v2/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TAVUS_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Tavus response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Tavus API Error:', errorData);
        
        // Try to parse as JSON for better error message
        let errorMessage = 'Failed to create conversation';
        try {
          const errorJson = JSON.parse(errorData);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch (e) {
          // Use raw text if not JSON
          errorMessage = errorData || errorMessage;
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('Tavus response data:', data);
      return NextResponse.json(data);
    }

    if (action === 'end' && conversationId) {
      console.log('Ending conversation:', conversationId);
      
      // End conversation
      const response = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': TAVUS_API_KEY,
        },
      });

      if (!response.ok) {
        console.error('Failed to end conversation, status:', response.status);
        const errorText = await response.text();
        console.error('End conversation error:', errorText);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in Tavus API route:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
