import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the callback data for debugging
    console.log('Tavus callback received:', body);
    
    // Handle different callback events
    switch (body.event_type) {
      case 'conversation_started':
        console.log('Conversation started:', body.conversation_id);
        break;
      case 'conversation_ended':
        console.log('Conversation ended:', body.conversation_id);
        break;
      case 'error':
        console.error('Tavus error:', body.error);
        break;
      default:
        console.log('Unknown event type:', body.event_type);
    }

    // Return success response to Tavus
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error handling Tavus callback:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}

// Also handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Tavus callback endpoint is active' });
}
