import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { students } from '@/lib/students';
import { getDatabase } from '@/lib/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate personalized system prompt based on student
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

// Function to fetch previous session histories for a student
async function fetchPreviousSessionHistories(userId: string, studentId: string): Promise<any[]> {
  try {
    console.log(`fetchPreviousSessionHistories called with userId: ${userId}, studentId: ${studentId}`);
    
    const db = await getDatabase();
    const chatLogsCollection = db.collection('chatLogs');

    // Get all previous sessions for this student (excluding the current one)
    const sessions = await chatLogsCollection
      .find({ 
        userId: userId,
        studentId: studentId 
      })
      .sort({ createdAt: 1 }) // Chronological order
      .toArray();

    console.log(`Found ${sessions.length} previous sessions for student ${studentId}`);
    
    if (sessions.length > 0) {
      console.log('Sample session data:', {
        sessionId: sessions[0]._id,
        studentId: sessions[0].studentId,
        studentName: sessions[0].studentName,
        transcriptLength: sessions[0].transcript?.length || 0,
        createdAt: sessions[0].createdAt
      });
    }

    // Combine all session summaries into a single conversation history
    const conversationHistory = [];
    
    for (const session of sessions) {
      console.log(`Processing session ${session._id}`);
      
      // Use summary if available, otherwise fall back to transcript
      if (session.summary) {
        console.log(`Using summary for session ${session._id}: ${session.summary.substring(0, 100)}...`);
        
        // Add session summary as a single message
        conversationHistory.push({
          type: 'session_summary',
          text: `Previous session summary: ${session.summary}`,
          isUser: false,
          timestamp: session.createdAt || session.endedAt,
          sessionId: session._id,
          sessionTimestamp: session.createdAt || session.endedAt,
          duration: session.conversationLength || 0
        });
      } else if (session.transcript && Array.isArray(session.transcript)) {
        console.log(`No summary available, using transcript for session ${session._id} with ${session.transcript.length} messages`);
        
        // Add session separator
        conversationHistory.push({
          type: 'session_separator',
          timestamp: session.createdAt || session.endedAt,
          sessionId: session._id,
          duration: session.conversationLength || 0
        });
        
        // Add all messages from this session
        conversationHistory.push(...session.transcript.map((msg: any) => ({
          ...msg,
          sessionId: session._id,
          sessionTimestamp: session.createdAt || session.endedAt
        })));
      }
    }

    console.log(`Total conversation history messages: ${conversationHistory.length}`);
    return conversationHistory;
  } catch (error) {
    console.error('Error fetching previous session histories:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], studentId, userId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Find the student by ID
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Fetch previous session histories if userId is provided
    let previousSessionHistories = [];
    if (userId) {
      console.log(`Fetching previous session histories for userId: ${userId}, studentId: ${studentId}`);
      previousSessionHistories = await fetchPreviousSessionHistories(userId, studentId);
      console.log(`Found ${previousSessionHistories.length} previous session messages`);
    }

    // Generate personalized system prompt with previous session context
    const systemPrompt = generateSystemPrompt(student, previousSessionHistories);
    console.log('System prompt length:', systemPrompt.length);
    console.log('System prompt preview:', systemPrompt.substring(0, 200) + '...');

    // Combine previous session histories with current conversation
    const previousMessages = previousSessionHistories.filter(msg => msg.type !== 'session_separator');
    const fullConversationHistory = [
      ...previousMessages,
      ...conversationHistory
    ];

    console.log('Full conversation history length:', fullConversationHistory.length);
    console.log('Previous session messages:', previousMessages.length);
    console.log('Current conversation messages:', conversationHistory.length);
    
    // Log sample of previous messages to verify they're being included
    if (previousMessages.length > 0) {
      console.log('Sample previous messages:', previousMessages.slice(0, 3).map(msg => ({
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp
      })));
    }

    // Generate AI response using OpenAI with personalized system prompt and full history
    const aiResponse = await generateAIResponseWithOpenAI(message, fullConversationHistory, systemPrompt);

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to generate AI response using OpenAI with personalized system prompt
async function generateAIResponseWithOpenAI(userMessage: string, conversationHistory: any[], systemPrompt: string): Promise<string> {
  try {
    // Prepare conversation history for OpenAI
    const conversationMessages = conversationHistory
      .map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.text
      }));

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...conversationMessages,
      {
        role: 'user' as const,
        content: userMessage
      }
    ];

    console.log('=== OPENAI REQUEST DEBUG ===');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Conversation history messages:', conversationHistory.length);
    console.log('Current user message:', userMessage);
    console.log('Total messages:', messages.length);
    
    if (conversationHistory.length > 0) {
      console.log('Sample previous messages:');
      conversationHistory.slice(0, 3).forEach((msg, index) => {
        console.log(`  ${index + 1}. (${msg.isUser ? 'TUTOR' : 'STUDENT'}): ${msg.text?.substring(0, 100)}...`);
      });
    }
    
    console.log('=== END OPENAI REQUEST DEBUG ===\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    let response = completion.choices[0]?.message?.content?.trim() || "I'm sorry, I didn't understand that.";
    
    // Clean the response text by removing markdown code blocks if present
    if (response && response.trim().startsWith('```')) {
      response = response.trim().replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('OpenAI Response:', response);
    return response;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

