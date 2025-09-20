import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ChatLog } from '@/types/chatLog';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const chatLogsCollection = db.collection<ChatLog>('chatLogs');

    // Get all chat logs, sorted by creation date (newest first)
    const chatLogs = await chatLogsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50 cases for performance
      .toArray();

    return NextResponse.json({
      success: true,
      cases: chatLogs
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}
