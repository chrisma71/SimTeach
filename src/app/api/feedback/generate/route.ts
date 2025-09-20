import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Feedback } from '@/types/chatLog';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, studentName, studentSubject, conversationLength } = await request.json();

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: 'Valid transcript is required' },
        { status: 400 }
      );
    }

    // Prepare conversation for analysis
    const conversationText = transcript
      .map(msg => `${msg.isUser ? 'Tutor' : 'Student'}: ${msg.text}`)
      .join('\n');

    const feedbackPrompt = `
You are an expert tutoring coach analyzing a tutoring session. Please provide comprehensive feedback for the tutor's performance.

**Session Details:**
- Student: ${studentName}
- Subject: ${studentSubject}
- Duration: ${Math.floor(conversationLength / 60)} minutes ${conversationLength % 60} seconds
- Total exchanges: ${transcript.length}

**Conversation:**
${conversationText}

Please analyze this tutoring session and provide detailed feedback in the following JSON format:

{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areasForImprovement": ["<area 1>", "<area 2>", "<area 3>"],
  "specificInsights": {
    "rapport": <number 1-10>,
    "questioningTechnique": <number 1-10>,
    "patience": <number 1-10>,
    "adaptability": <number 1-10>,
    "subjectKnowledge": <number 1-10>
  },
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "studentEngagement": <number 1-10>,
  "keyMoments": [
    {
      "timestamp": "<time in conversation>",
      "description": "<what happened>",
      "type": "<strength|improvement|breakthrough|challenge>"
    }
  ]
}

**Evaluation Criteria:**
- Rapport: How well did the tutor connect with the student?
- Questioning Technique: Use of open-ended questions, probing, scaffolding
- Patience: Allowing time for student responses, not rushing
- Adaptability: Adjusting approach based on student needs
- Subject Knowledge: Accuracy and depth of content knowledge
- Student Engagement: How engaged was the student throughout?

Focus on constructive feedback that helps the tutor improve their skills.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert tutoring coach. Analyze tutoring sessions and provide detailed, constructive feedback in JSON format."
        },
        {
          role: "user",
          content: feedbackPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const feedbackText = completion.choices[0]?.message?.content;
    
    if (!feedbackText) {
      throw new Error('No feedback generated');
    }

    // Parse the JSON response
    let feedback: Feedback;
    try {
      feedback = JSON.parse(feedbackText);
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', parseError);
      throw new Error('Invalid feedback format generated');
    }

    return NextResponse.json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
