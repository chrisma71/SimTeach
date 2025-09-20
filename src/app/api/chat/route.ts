import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { students } from '@/lib/students';

// Function to generate personalized system prompt based on student
function generateSystemPrompt(studentId: string): string {
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    return `You are a helpful AI tutor. Keep your responses conversational and concise, suitable for voice interaction. Respond in 1-2 sentences.`;
  }

  return `You are ${student.name}, a ${student.grade} student who needs help with ${student.subject}. 

${student.description}

Your personality: ${student.personality}

Please respond as this student would - using their personality, grade level, and learning needs. Keep responses conversational and concise, suitable for voice interaction. Respond in 1-2 sentences.`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, studentId, conversationHistory = [] } = await request.json();

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

    // Generate AI response using OpenAI with personalized system prompt
    const aiResponse = await generateAIResponseWithOpenAI(message, studentId, conversationHistory);

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
async function generateAIResponseWithOpenAI(userMessage: string, studentId: string, conversationHistory: any[]): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = generateSystemPrompt(studentId);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationHistory.map(msg => ({
          role: msg.isUser ? "user" as const : "assistant" as const,
          content: msg.text
        })),
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "I'm sorry, I didn't understand that.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

