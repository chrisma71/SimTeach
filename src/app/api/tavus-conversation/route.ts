import { NextRequest, NextResponse } from 'next/server';
import { tavusRealtimeAPI } from '@/lib/tavus-realtime';

export async function POST(request: NextRequest) {
  try {
    const { studentProfile, subject, action, conversationId } = await request.json();

    if (action === 'create') {
      if (!studentProfile || !subject) {
        return NextResponse.json({ error: 'Student profile and subject are required' }, { status: 400 });
      }

      console.log('Creating Tavus session for:', studentProfile.name, 'in', subject);

      try {
        // Get the base URL from the request headers
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // First try to create a conversation
        console.log('Attempting to create Tavus conversation...');
        const conversation = await tavusRealtimeAPI.createConversation(
          studentProfile,
          subject,
          baseUrl
        );

        return NextResponse.json(conversation);
      } catch (conversationError) {
        console.log('Conversation creation failed, trying video creation instead...');
        console.log('Conversation error:', conversationError);
        
        try {
          // Fallback to creating a video
          console.log('Attempting to create Tavus video...');
          const video = await tavusRealtimeAPI.createVideo(studentProfile, subject);
          
          console.log('Video created successfully:', video);

          // Log the exact URLs we're working with
          console.log('Tavus hosted_url:', video.hosted_url);
          console.log('Video data keys:', Object.keys(video));
          
          // Return the actual Tavus hosted URL
          return NextResponse.json({
            conversation_id: video.video_id,
            conversation_url: video.hosted_url, // Use the actual Tavus URL
            status: 'active',
            video_data: {
              ...video,
              // Ensure we have the hosted URL
              hosted_url: video.hosted_url,
              video_id: video.video_id
            }
          });
        } catch (videoError) {
          console.error('Both conversation and video creation failed.');
          console.log('Video error:', videoError);
          
          // Return an enhanced demo response
          return NextResponse.json({
            conversation_id: 'demo_' + Date.now(),
            conversation_url: `data:text/html,<!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>AI Student Demo</title>
              <style>
                body {
                  margin: 0;
                  font-family: Arial, sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  text-align: center;
                }
                .container {
                  max-width: 500px;
                  padding: 40px;
                  background: rgba(255,255,255,0.1);
                  border-radius: 20px;
                  backdrop-filter: blur(10px);
                  border: 1px solid rgba(255,255,255,0.2);
                }
                .avatar {
                  width: 120px;
                  height: 120px;
                  border-radius: 50%;
                  background: rgba(255,255,255,0.2);
                  margin: 0 auto 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 60px;
                }
                .info-card {
                  background: rgba(255,255,255,0.1);
                  padding: 20px;
                  border-radius: 15px;
                  margin: 20px 0;
                }
                .demo-badge {
                  background: rgba(255,215,0,0.3);
                  padding: 10px 20px;
                  border-radius: 25px;
                  font-size: 14px;
                  margin-top: 20px;
                  border: 1px solid rgba(255,215,0,0.5);
                }
                .pulse {
                  animation: pulse 2s infinite;
                }
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.7; }
                  100% { opacity: 1; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="avatar pulse">🤖</div>
                <h2>AI Student: ${studentProfile.name}</h2>
                <p style="font-size: 18px; margin: 20px 0;">Grade ${studentProfile.grade} ${subject} Student</p>
                
                <div class="info-card">
                  <p><strong>Current Grade:</strong> ${studentProfile.averageGrade}</p>
                  <p><strong>Learning Style:</strong> ${studentProfile.learningStyle || 'Interactive & Visual'}</p>
                  <p><strong>Subject Focus:</strong> ${subject}</p>
                </div>
                
                <div class="demo-badge">
                  <p>✨ Demo Mode Active</p>
                  <p style="margin: 5px 0 0 0; font-size: 12px;">This simulates your Tavus AI student interface</p>
                </div>
                
                <p style="font-size: 14px; opacity: 0.9; margin-top: 20px;">
                  Ready to start tutoring session!<br/>
                  I'll respond like a real ${studentProfile.grade} grade student.
                </p>
              </div>
            </body>
            </html>`,
            status: 'active'
          });
        }
      }
    } 
    
    else if (action === 'end') {
      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
      }

      // Only try to end if it's a real conversation ID
      if (!conversationId.startsWith('demo_') && !conversationId.startsWith('video_')) {
        try {
          await tavusRealtimeAPI.endConversation(conversationId);
        } catch (error) {
          console.log('Error ending conversation (probably demo mode):', error);
        }
      }
      
      return NextResponse.json({ success: true });
    } 
    
    else if (action === 'status') {
      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
      }

      // Return mock status for demo conversations
      if (conversationId.startsWith('demo_') || conversationId.startsWith('video_')) {
        return NextResponse.json({
          conversation_id: conversationId,
          status: 'active',
          duration: Math.floor(Math.random() * 300),
        });
      }

      const status = await tavusRealtimeAPI.getConversationStatus(conversationId);
      return NextResponse.json(status);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in Tavus conversation API:', error);
    return NextResponse.json(
      { error: 'Failed to manage Tavus conversation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
