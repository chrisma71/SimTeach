import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Feedback } from '@/types/chatLog';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== FEEDBACK GENERATION STARTED ===');
    const { transcript, studentName, studentSubject, conversationLength } = await request.json();
    console.log('Feedback request data:', { studentName, studentSubject, conversationLength, transcriptLength: transcript?.length });

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
  "skillRecommendations": {
    "rapport": ["<rapport-specific recommendation 1>", "<rapport-specific recommendation 2>"],
    "questioningTechnique": ["<questioning-specific recommendation 1>", "<questioning-specific recommendation 2>"],
    "patience": ["<patience-specific recommendation 1>", "<patience-specific recommendation 2>"],
    "adaptability": ["<adaptability-specific recommendation 1>", "<adaptability-specific recommendation 2>"],
    "subjectKnowledge": ["<knowledge-specific recommendation 1>", "<knowledge-specific recommendation 2>"]
  },
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

**Important for skillRecommendations:**
- Provide 2 specific, actionable recommendations for each skill
- Base recommendations on the actual performance observed in the conversation
- Make recommendations specific to the skill (e.g., rapport recommendations should focus on relationship-building)
- Use concrete examples from the conversation when possible
- Keep recommendations practical and implementable

Focus on constructive feedback that helps the tutor improve their skills.`;

    console.log('Generating feedback with OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert tutoring coach analyzing tutoring sessions. Provide comprehensive, constructive feedback."
        },
        {
          role: "user",
          content: feedbackPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const feedbackText = completion.choices[0]?.message?.content || 'No feedback generated';
    console.log('Generated feedback text:', feedbackText?.substring(0, 200) + '...');
    
    if (!feedbackText) {
      throw new Error('No feedback generated');
    }

    // Clean the response text by removing markdown code blocks
    let cleanedText = feedbackText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    console.log('Cleaned feedback text:', cleanedText.substring(0, 200) + '...');

    // Parse the JSON response
    let feedback: Feedback;
    try {
      feedback = JSON.parse(cleanedText);
      console.log('Successfully parsed feedback JSON');
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', parseError);
      console.error('Raw feedback text:', feedbackText);
      console.error('Cleaned feedback text:', cleanedText);
      throw new Error('Invalid feedback format generated');
    }

    console.log('=== FEEDBACK GENERATION COMPLETED ===');
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
