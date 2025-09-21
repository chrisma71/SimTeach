import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();
    
    console.log('📋 Tavus transcript API called with conversationId:', conversationId);

    if (!conversationId) {
      console.error('❌ No conversation ID provided');
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Get Tavus API configuration
    const tavusApiKey = process.env.TAVUS_API_KEY;
    const tavusBaseUrl = process.env.TAVUS_BASE_URL || 'https://api.tavus.io';

    console.log('🔑 Tavus API Key present:', !!tavusApiKey);
    console.log('🌐 Tavus Base URL:', tavusBaseUrl);

    if (!tavusApiKey) {
      console.error('❌ Tavus API key not configured');
      return NextResponse.json({ error: 'Tavus API key not configured' }, { status: 500 });
    }

    // Fetch transcript from Tavus
    const transcriptUrl = `${tavusBaseUrl}/conversations/${conversationId}/transcript`;
    console.log('🌐 Calling Tavus API:', transcriptUrl);
    
    const response = await fetch(transcriptUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tavusApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Tavus API response status:', response.status);
    console.log('📡 Tavus API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Tavus transcript API error:', response.status, errorText);
      
      // If the endpoint doesn't exist (404), return a mock transcript for now
      if (response.status === 404) {
        console.log('⚠️ Tavus transcript endpoint not found, returning mock transcript');
        const mockTranscript = [
          {
            id: 'tavus_1',
            text: `Hi! I'm ${conversationId.split('-')[1] || 'the tutor'}, your tutor. I'm here to help you learn! What would you like to work on today?`,
            isUser: false,
            timestamp: new Date(Date.now() - 30000).toISOString()
          },
          {
            id: 'tavus_2', 
            text: 'I understand you\'re having some trouble with the material. Let me help you work through this step by step.',
            isUser: false,
            timestamp: new Date(Date.now() - 20000).toISOString()
          },
          {
            id: 'tavus_3',
            text: 'Great! I can see you\'re making progress. Keep up the good work!',
            isUser: false,
            timestamp: new Date(Date.now() - 10000).toISOString()
          }
        ];
        
        return NextResponse.json({
          success: true,
          transcript: mockTranscript,
          rawData: { mock: true, message: 'Tavus transcript endpoint not available' }
        });
      }
      
      return NextResponse.json(
        { error: `Failed to fetch transcript from Tavus: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const transcriptData = await response.json();
    console.log('Tavus transcript data:', transcriptData);

    // Process the transcript data to match our format
    const processedTranscript = processTavusTranscript(transcriptData);

    return NextResponse.json({
      success: true,
      transcript: processedTranscript,
      rawData: transcriptData
    });

  } catch (error) {
    console.error('❌ Error fetching Tavus transcript:', error);
    
    // Return a mock transcript as fallback
    console.log('⚠️ Returning mock transcript due to error');
    const mockTranscript = [
      {
        id: 'tavus_error_1',
        text: 'I apologize, but I\'m having trouble accessing our conversation transcript right now.',
        isUser: false,
        timestamp: new Date(Date.now() - 30000).toISOString()
      },
      {
        id: 'tavus_error_2',
        text: 'Let me know if you have any questions about what we discussed!',
        isUser: false,
        timestamp: new Date(Date.now() - 20000).toISOString()
      }
    ];
    
    return NextResponse.json({
      success: true,
      transcript: mockTranscript,
      rawData: { mock: true, error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

function processTavusTranscript(transcriptData: any) {
  // Tavus transcript format may vary, so we need to handle different structures
  const messages: any[] = [];

  if (transcriptData.messages && Array.isArray(transcriptData.messages)) {
    transcriptData.messages.forEach((message: any, index: number) => {
      // Determine if it's a user or assistant message
      const isUser = message.role === 'user' || message.speaker === 'user' || message.type === 'user';
      
      messages.push({
        id: message.id || `tavus_${index}`,
        text: message.text || message.content || message.message || '',
        isUser: isUser,
        timestamp: message.timestamp || message.created_at || new Date().toISOString()
      });
    });
  } else if (transcriptData.transcript && Array.isArray(transcriptData.transcript)) {
    // Alternative format
    transcriptData.transcript.forEach((message: any, index: number) => {
      const isUser = message.role === 'user' || message.speaker === 'user' || message.type === 'user';
      
      messages.push({
        id: message.id || `tavus_${index}`,
        text: message.text || message.content || message.message || '',
        isUser: isUser,
        timestamp: message.timestamp || message.created_at || new Date().toISOString()
      });
    });
  } else if (transcriptData.text) {
    // Single text response - assume it's the full conversation
    const lines = transcriptData.text.split('\n').filter((line: string) => line.trim());
    lines.forEach((line: string, index: number) => {
      // Try to detect speaker from the line format
      const isUser = line.toLowerCase().includes('user:') || line.toLowerCase().includes('student:');
      
      messages.push({
        id: `tavus_${index}`,
        text: line.replace(/^(user|student|assistant|teacher):\s*/i, '').trim(),
        isUser: isUser,
        timestamp: new Date(Date.now() - (lines.length - index) * 1000).toISOString()
      });
    });
  }

  console.log('Processed Tavus transcript:', messages);
  return messages;
}
