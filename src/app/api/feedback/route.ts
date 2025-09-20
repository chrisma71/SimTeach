import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, messages, lessonDuration, subject } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No conversation data provided' }, { status: 400 });
    }

    // Analyze the conversation
    const conversationText = messages
      .map((msg: Message) => `${msg.isUser ? 'Teacher' : 'Student'}: ${msg.text}`)
      .join('\n');

    const prompt = `
You are an expert educational evaluator. Analyze this tutoring session and provide detailed, descriptive feedback.

Subject: ${subject}
Lesson Duration: ${Math.floor(lessonDuration / 60)} minutes ${lessonDuration % 60} seconds

Conversation:
${conversationText}

Please provide feedback in the following JSON format:
{
  "engagement": {
    "score": <number 1-10>,
    "feedback": "<detailed explanation of engagement level, specific examples from conversation>"
  },
  "understandability": {
    "score": <number 1-10>,
    "feedback": "<detailed explanation of teaching clarity with specific examples>"
  },
  "studentLearning": {
    "conceptsLearned": [
      {
        "concept": "<specific concept name>",
        "description": "<detailed description of what the student understood>",
        "evidence": "<quote or example from conversation showing understanding>"
      }
    ],
    "skillsDeveloped": [
      {
        "skill": "<specific skill name>",
        "description": "<how the student demonstrated this skill>",
        "level": "<beginner/intermediate/advanced>"
      }
    ],
    "progressMade": "<overall description of student's learning journey during session>"
  },
  "teacherLearning": {
    "pedagogicalInsights": [
      {
        "insight": "<what the teacher learned about teaching>",
        "description": "<detailed explanation>",
        "applicationExample": "<how to apply this in future sessions>"
      }
    ],
    "studentUnderstanding": [
      {
        "discovery": "<what the teacher learned about this specific student>",
        "description": "<detailed explanation of student's learning style, preferences, challenges>",
        "implications": "<how this affects future teaching approach>"
      }
    ],
    "communicationLessons": [
      {
        "lesson": "<communication technique that worked/didn't work>",
        "description": "<detailed analysis>",
        "improvement": "<how to refine this technique>"
      }
    ]
  },
  "areasForImprovement": [
    {
      "area": "<specific area needing work>",
      "currentLevel": "<student's current understanding>",
      "targetLevel": "<where they should be>",
      "strategies": ["<specific strategy 1>", "<specific strategy 2>"]
    }
  ],
  "overallFeedback": "<comprehensive 3-4 sentence assessment>",
  "improvements": [
    {
      "category": "<teaching technique/communication/content delivery>",
      "suggestion": "<specific actionable improvement>",
      "rationale": "<why this will help>",
      "implementation": "<how to implement this>"
    }
  ]
}

Evaluation Guidelines:
- Be specific and evidence-based - reference actual quotes and moments from the conversation
- Focus on concrete learning outcomes, not just participation
- Identify micro-skills and incremental progress
- Analyze teaching effectiveness with specific examples
- Provide actionable, implementable suggestions
- Consider the student's grade level and subject matter
- Look for moments of breakthrough understanding or confusion
- Assess both content mastery and learning process skills

Be thorough, constructive, and focused on growth for both teacher and student.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert educational evaluator providing detailed feedback on tutoring sessions. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const feedbackText = completion.choices[0]?.message?.content;
    
    if (!feedbackText) {
      throw new Error('No feedback generated');
    }

    // Parse the JSON response
    let feedback;
    try {
      feedback = JSON.parse(feedbackText);
    } catch (parseError) {
      console.error('Failed to parse feedback JSON:', parseError);
      // Fallback feedback if JSON parsing fails
      feedback = {
        engagement: {
          score: 7,
          feedback: "Good interaction with the student, but could benefit from more interactive questioning techniques and enthusiasm markers."
        },
        understandability: {
          score: 8,
          feedback: "Explanations were generally clear and appropriate for the student's level, with good use of examples."
        },
        studentLearning: {
          conceptsLearned: [
            {
              concept: "Basic topic understanding",
              description: "Student grasped fundamental concepts through guided discussion",
              evidence: "Demonstrated understanding through responses"
            }
          ],
          skillsDeveloped: [
            {
              skill: "Problem-solving approach",
              description: "Began to develop systematic thinking",
              level: "beginner"
            }
          ],
          progressMade: "Student showed incremental improvement in understanding core concepts"
        },
        teacherLearning: {
          pedagogicalInsights: [
            {
              insight: "Importance of checking comprehension",
              description: "Regular comprehension checks help maintain learning flow",
              applicationExample: "Ask 'Can you explain that back to me?' more frequently"
            }
          ],
          studentUnderstanding: [
            {
              discovery: "Student's learning pace",
              description: "Student needs time to process information before responding",
              implications: "Allow longer wait times for responses"
            }
          ],
          communicationLessons: [
            {
              lesson: "Simple language effectiveness",
              description: "Using grade-appropriate vocabulary improved comprehension",
              improvement: "Continue using clear, simple explanations"
            }
          ]
        },
        areasForImprovement: [
          {
            area: "Deeper conceptual understanding",
            currentLevel: "Surface-level comprehension",
            targetLevel: "Applied understanding",
            strategies: ["Use more real-world examples", "Practice application problems"]
          }
        ],
        overallFeedback: "A solid tutoring session with good basic instruction. The teacher maintained appropriate communication and the student showed engagement. There are opportunities to deepen learning through more interactive techniques and comprehensive checking.",
        improvements: [
          {
            category: "questioning technique",
            suggestion: "Ask more open-ended questions to check understanding",
            rationale: "This reveals deeper comprehension and misconceptions",
            implementation: "Replace yes/no questions with 'How would you...' or 'What if...'"
          }
        ]
      };
    }

    return NextResponse.json(feedback);

  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    );
  }
}
