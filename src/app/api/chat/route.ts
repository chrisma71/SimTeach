import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { students } from '@/lib/students';

// Function to generate personalized system prompt based on student
function generateSystemPrompt(student: any): string {
  return `You are ${student.name}, a ${student.age}-year-old student in grade ${student.grade} who needs assistance in ${student.subject}. You are currently averaging ${student.averageGrade} in class and have the following personality: ${student.personality}.

You struggle with: ${student.struggles.join(', ')}.
Your strengths are: ${student.strengths.join(', ')}.

You will be talking with a tutor that has been set up to help you. Respond according to your personality and current academic level. Please respond like how a grade ${student.grade} student would in terms of language use and personality. Make sure the tutor has to work to get you to open up and understand your needs. You want to test the tutor's abilities and patience, so put them through challenges appropriate to your personality and learning style.

Keep your responses conversational and concise, suitable for voice interaction. Respond in 1-2 sentences.`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], studentId } = await request.json();

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

    // Generate personalized system prompt
    const systemPrompt = generateSystemPrompt(student);

    // Generate AI response using OpenAI with personalized system prompt
    const aiResponse = await generateAIResponseWithOpenAI(message, conversationHistory, systemPrompt);

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

