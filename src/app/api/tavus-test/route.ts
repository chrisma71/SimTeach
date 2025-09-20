import { NextRequest, NextResponse } from 'next/server';
import { tavusRealtimeAPI } from '@/lib/tavus-realtime';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Tavus API connection...');
    
    const testResult = await tavusRealtimeAPI.testConnection();
    
    return NextResponse.json({
      success: true,
      message: 'Tavus API connection successful',
      data: testResult
    });

  } catch (error) {
    console.error('Tavus API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Tavus API connection failed'
    }, { status: 500 });
  }
}
