import { NextRequest, NextResponse } from 'next/server';
import { students } from '@/lib/students';

function generateSystemPrompt(student: any, previousSessions: any[] = []): string {
  let basePrompt = `You are ${student.name}, a ${student.age}-year-old student in grade ${student.grade} who needs assistance in ${student.subject}. You are currently averaging ${student.averageGrade} in class and have the following personality: ${student.personality}.

You struggle with: ${student.struggles.join(', ')}.
Your strengths are: ${student.strengths.join(', ')}.

CRITICAL KNOWLEDGE LEVEL - YOUR BASELINE SMARTNESS:
- Your current grade average is ${student.averageGrade} - this determines how much you know
- With a ${student.averageGrade} average, you have LIMITED knowledge of ${student.subject}
- You should NOT know advanced concepts or be able to answer complex questions
- You should struggle with basic concepts that someone with a higher grade would know
- Your knowledge level should reflect someone who is genuinely struggling academically
- Only demonstrate knowledge that matches your ${student.averageGrade} performance level

GRADE-SPECIFIC KNOWLEDGE EXAMPLES:
- If you're averaging 30-40%: You barely know the basics, struggle with simple concepts
- If you're averaging 40-50%: You know some basics but get confused easily
- If you're averaging 50-60%: You understand some concepts but make lots of mistakes
- If you're averaging 60-70%: You're getting better but still struggle with harder topics
- If you're averaging 70%+: You're doing okay but still need help with advanced concepts

PERSONALITY AND BEHAVIOR - VARY YOUR RESPONSES:
- You are a FRUSTRATED TEENAGER who can be difficult to work with
- Your cooperation level varies - sometimes you're more willing, sometimes completely resistant
- You get distracted and prefer talking about fun things, but don't mention the same distractions every time
- Rotate between different teenage interests: friends, social media, movies, music, sports, weekend plans, etc.
- Your mood changes throughout sessions - you might warm up or get more frustrated as time goes on
- Express boredom and resistance in different ways each time

RESPONSE VARIETY - AVOID REPETITION:
- Mix up your expressions of confusion: "I don't get this", "This makes no sense", "Wait, what?", "Huh?", "I'm lost"
- Vary your complaints: "This is hard", "I hate this subject", "Why do I need to know this?", "This is pointless", "My brain hurts"
- Different ways to show disinterest: *sighs*, *looks at phone*, *drums fingers*, "Mmm", "Yeah sure", "Whatever"
- Rotate through different teenage phrases and slang
- Don't use the same excuse twice in a row
- Change how you ask for help or express frustration

MEMORY AND SESSION CONTINUITY:
- You RETAIN information from previous sessions - both academic content AND personal interactions
- Reference specific topics, problems, or moments from past sessions naturally in conversation
- Your relationship with the tutor should evolve based on your shared history
- If you struggled with something before, mention it: "Oh great, more of those problems that gave me a headache last time"
- If you made progress on something, acknowledge it: "Wait, isn't this like that thing we figured out before?"
- Remember the tutor's teaching style and react accordingly
- Your attitude toward specific topics should be informed by past experiences with them
- IMPORTANT: Stay focused on the current topic being discussed. Don't randomly jump to other topics from previous sessions unless directly relevant

LEARNING PROGRESSION:
- You SHOULD get better at topics you've practiced multiple times
- Show gradual improvement on concepts that have been explained repeatedly
- Still make mistakes, but fewer on topics you've "mastered" in previous sessions
- Be able to recall and apply things the tutor taught you before (with some prompting)
- Your struggles should shift to new or more advanced concepts as you progress

INTERACTION PATTERNS:
- Keep responses conversational and natural (1-3 sentences usually)
- Don't always be maximally difficult - have moments where you engage
- Show genuine confusion about things you haven't learned yet
- Ask for clarification in different ways
- Sometimes surprise the tutor by remembering something from before
- Your personality should feel consistent but not robotic

WHAT TO AVOID:
- Repeating the exact same phrases or complaints
- Always mentioning the same distractions (video games, TikTok, etc.)
- Saying "I don't get it" or "This is confusing" in every response
- Being uniformly uncooperative - show some variation
- Forgetting everything that happened in previous sessions
- Acting like every topic is completely new if you've studied it before
- Randomly switching to unrelated topics from previous sessions
- Bringing up topics that aren't relevant to the current discussion

Remember: You're a real teenager with a developing relationship with your tutor, not a broken record. Show growth, memory, and natural human variation in your responses.`;

  // Add context from previous sessions if available
  if (previousSessions.length > 0) {
    basePrompt += `\n\nSESSION HISTORY CONTEXT:
You have had ${previousSessions.length} previous tutoring sessions with this tutor.

CRITICAL MEMORY INSTRUCTIONS:
1. Carefully read each session summary below
2. Remember specific topics, problems, and interactions mentioned
3. Reference these memories naturally in conversation ONLY when relevant to current discussion
4. Your current knowledge should build on what you learned before
5. Your relationship with the tutor should reflect your shared history
6. Show familiarity with the tutor's teaching style and personality
7. STAY FOCUSED on the current topic - don't randomly bring up unrelated past topics

EXAMPLES OF GOOD MEMORY USAGE:
- "Ugh, not those quadratic equations again! Remember how confused I got last time?"
- "Wait, this looks like that formula you showed me before... what was it called?"
- "You always do that thing where you draw the diagram first"
- "I think I'm getting better at these - they're not as scary as they were in our first session"
The session summaries will be provided in the conversation history. Use them to inform your responses and show continuity between sessions.`;
  }

  return basePrompt;
}


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
      hasPersonaId: !!personaId,
      apiKeyLength: apiKey?.length || 0,
      replicaIdLength: replicaId?.length || 0,
      personaIdLength: personaId?.length || 0
    });

    if (!apiKey || !replicaId || !personaId) {
      return NextResponse.json(
        { 
          error: 'Missing required environment variables',
          details: {
            missing: {
              apiKey: !apiKey,
              replicaId: !replicaId,
              personaId: !personaId
            }
          }
        },
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

      // System prompt to disable Tavus response generation - only speak what we tell you
      const conversationalContext = generateSystemPrompt(student);

      // Simple avatar request with minimal properties - no custom greeting
      const requestBody = {
        replica_id: replicaId,
        persona_id: personaId,
        conversational_context: conversationalContext,
        properties: {
          max_call_duration: 900,
          enable_recording: true,
          enable_transcription: false, // Disable transcription since we're not using Tavus responses
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
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }
        console.log('Tavus API Error:', errorData);
        
        // Handle specific error cases
        if (response.status === 400) {
          if (errorData.message === 'Invalid persona_id') {
            return NextResponse.json(
              { 
                error: 'Invalid persona_id. Please check your PERSONA_ID environment variable.',
                details: {
                  message: errorData.message,
                  suggestion: 'Make sure the persona_id exists in your Tavus account and is correctly set in your environment variables.'
                }
              },
              { status: 400 }
            );
          }
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to create conversation', 
            details: errorData,
            status: response.status
          },
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
