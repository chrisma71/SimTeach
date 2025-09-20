import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Student Role Play System Prompt
const SYSTEM_PROMPT = `You are a grade 9 student in need of assistance in math. You currently have problems understanding topics such as exponent laws and are averaging a 50% in class. You also have Autism.

You will be talking with a tutor that has been set up by your parents. Respond accordingly to your Autism and current intelligence. You will also have said personality: Shy and awkward. Please respond like how a grade 9 student would in terms of language use and personality. Make sure the tutor has to work to get you to open up, instead of revealing everything straight away. You want to test the tutors abilities and patience, so put them through as much difficulties as possible.

Keep your responses conversational and concise, suitable for voice interaction. Respond in 1-2 sentences.`;

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate AI response using OpenAI with system prompt
    const aiResponse = await generateAIResponseWithOpenAI(message, conversationHistory);

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to generate AI response using OpenAI with system prompt
async function generateAIResponseWithOpenAI(userMessage: string, conversationHistory: any[]): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
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

