import { NextRequest, NextResponse } from 'next/server';
import { tavusAPI } from '@/lib/tavus';

interface VideoRequest {
  feedbackData: any;
  studentName: string;
  subject: string;
}

export async function POST(request: NextRequest) {
  try {
    const { feedbackData, studentName, subject }: VideoRequest = await request.json();

    if (!feedbackData || !studentName) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Create a personalized script based on feedback
    const script = generateFeedbackScript(feedbackData, studentName, subject);

    // Generate video using Tavus
    const videoResponse = await tavusAPI.createVideo(script);

    return NextResponse.json({
      videoId: videoResponse.video_id,
      status: videoResponse.status,
      message: 'Video generation started. Check status for completion.'
    });

  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}

function generateFeedbackScript(feedbackData: any, studentName: string, subject: string): string {
  const engagementScore = feedbackData.engagement?.score || 0;
  const understandabilityScore = feedbackData.understandability?.score || 0;
  
  const script = `
Hello! I want to give you some personalized feedback about your tutoring session with ${studentName} in ${subject}.

First, let's talk about your teaching performance. Your engagement score was ${engagementScore} out of 10. ${feedbackData.engagement?.feedback || 'You showed good interaction with your student.'}

Your understandability score was ${understandabilityScore} out of 10. ${feedbackData.understandability?.feedback || 'Your explanations were clear and appropriate.'}

Now, here's what ${studentName} learned during your session:
${feedbackData.studentLearning?.conceptsLearned?.map((concept: any) => concept.concept).join(', ') || 'Basic concepts were covered'}

As for your growth as a teacher, you discovered some important insights about pedagogy and student communication. 

${feedbackData.teacherLearning?.pedagogicalInsights?.[0]?.description || 'You learned valuable teaching techniques.'}

For your next tutoring session, I recommend focusing on these key improvements:
${feedbackData.improvements?.[0]?.suggestion || 'Continue building on your current teaching approach.'}

Remember, every tutoring session is a learning opportunity for both you and your student. Keep up the great work, and I look forward to seeing your continued growth as an educator!
  `.trim();

  return script;
}
