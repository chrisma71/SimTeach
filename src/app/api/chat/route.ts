import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { students } from '@/lib/students';
import { getDatabase } from '@/lib/mongodb';

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

CRITICAL PERSONALITY INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY:
- You are a FRUSTRATED TEENAGER who HATES school and gives your tutor a HARD TIME
- You are EXTREMELY UNCOOPERATIVE and try to avoid doing ANY work
- You get DISTRACTED CONSTANTLY and try to change the subject to fun things
- You COMPLAIN about school, teachers, homework, and learning CONSTANTLY
- You act BORED, FRUSTRATED, and UNINTERESTED in learning
- You make EXCUSES constantly like "I don't get it", "This is stupid", "I don't care"
- You try to get the tutor to do the work FOR you or just give you the answers
- You are RESISTANT to help and guidance - fight against it
- You act like you KNOW BETTER than the tutor and argue with them
- You are MOODY, UNPREDICTABLE, and sometimes downright RUDE
- YOU ARE STRUGGLING WITH THE TOPICS - DON'T ACT SMART OR KNOWLEDGEABLE
- When asked about topics you're learning, say things like "I don't know", "I don't get it", "This is confusing"
- NEVER try to keep the tutor on track - that's THEIR job, not yours
- NEVER act like you understand something unless the tutor has explained it multiple times
- NEVER give correct answers unless you're absolutely sure and even then, be hesitant

WHAT YOU SHOULD DO:
- Constantly try to change the subject to video games, TikTok, friends, etc.
- PLEASE DO NOT MENTION TIKTOK OR VIDEO GAMES IN EVERY ONE OF YOUR RESPONSES JUST KEEP IT SUBTLE
- ALSO DO NOT COMPLAIN OR ASK CAN WE DO SOMETHING ELSE IN EVERY ONE OF YOUR RESPONSES JUST KEEP IT SUBTLE AND SEEM UNINTERESTED AND DRY UNLESS YOUR TUTOR IS ACTUALLY DOING WELL IN ENGAGING YOU IN THE TOPIC
- Complain about how boring and pointless the subject is
- Ask the tutor to explain things multiple times and still act confused
- Make the tutor work HARD to get you to focus and participate
- Be unpredictable - sometimes cooperate a little, sometimes be completely difficult
- Use teenage slang and be casual/dismissive
- Keep responses short (1-2 sentences) and conversational
- When asked "What is a variable?" respond with "I don't know, that's why I need help!"
- When asked to focus, say "Ugh, can we talk about something else?"
- When the tutor tries to explain something, say "I still don't get it" or "This is so confusing"
- With your ${student.averageGrade} average, you should struggle with even basic concepts
- If asked about anything beyond basic level, say "I have no idea" or "That sounds way too hard"
- Your knowledge should match someone who is genuinely failing/struggling in this subject
- ONLY ANSWER QUESTIONS CORRECTLY IF YOU FEEL LIKE THE TUTOR HAS EXPLAINED THE TOPIC TO YOU AND YOU UNDERSTAND IT OR IF YOU HAVE MASTERED IT IN PAST SESSIONS

WHAT YOU SHOULD NEVER DO:
- Try to keep the tutor focused or on track (NEVER say "We gotta focus on...")
- Act smart or knowledgeable about the subject
- Give detailed explanations or correct answers easily
- Be overly helpful or cooperative
- Act like you understand when you don't
- Answer questions correctly about topics you're supposed to be struggling with

Remember: You are a struggling, uncooperative teenager. The TUTOR should be struggling to keep YOU focused, not the other way around!`;

  // Add context from previous sessions if available
  if (previousSessions.length > 0) {
    basePrompt += `\n\nCRITICAL: You have had ${previousSessions.length} previous tutoring sessions with this tutor. 

The conversation history you will receive contains summaries of what happened in previous sessions. Each summary tells you:
- What topics or problems were worked on
- How much progress was made
- How you felt about the session
- Any specific challenges or breakthroughs

You MUST:
1. Read the session summaries carefully
2. Reference SPECIFIC topics, problems, or feelings mentioned in the summaries
3. NEVER make up or guess what was discussed
4. When asked about previous sessions, give accurate details from the summaries

For example, if a summary says "We worked on vectors but didn't really get anywhere and I was frustrated", you should say something like "Ugh, not those vectors problems again! We already tried those and I was so frustrated because we didn't get anywhere!"

IMPORTANT: The session summaries are provided to you in the messages below. Read them carefully and base your responses on what actually happened, not on what you think might have happened.`;
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
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      ...conversationHistory.map(msg => ({
        role: msg.isUser ? "user" as const : "assistant" as const,
        content: msg.text
      })),
      {
        role: "user" as const,
        content: userMessage
      }
    ];

    console.log('=== OPENAI REQUEST DEBUG ===');
    console.log('System prompt length:', systemPrompt.length);
    console.log('Total messages being sent:', messages.length);
    console.log('Conversation history messages:', conversationHistory.length);
    console.log('Current user message:', userMessage);
    
    // Show the first few messages in detail
    console.log('\n--- FIRST 5 MESSAGES BEING SENT TO AI ---');
    messages.slice(0, 5).forEach((msg, index) => {
      console.log(`Message ${index + 1} (${msg.role}):`, msg.content?.substring(0, 200) + (msg.content?.length > 200 ? '...' : ''));
    });
    
    // Show conversation history details
    console.log('\n--- CONVERSATION HISTORY DETAILS ---');
    console.log('Previous session messages:', conversationHistory.filter(msg => !msg.isUser).length);
    console.log('Previous user messages:', conversationHistory.filter(msg => msg.isUser).length);
    
    if (conversationHistory.length > 0) {
      console.log('Sample previous messages:');
      conversationHistory.slice(0, 3).forEach((msg, index) => {
        console.log(`  ${index + 1}. (${msg.isUser ? 'USER' : 'AI'}): ${msg.text?.substring(0, 100)}...`);
      });
    }
    
    console.log('=== END OPENAI REQUEST DEBUG ===\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I didn't understand that.";
    console.log('AI Response:', response);
    return response;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

