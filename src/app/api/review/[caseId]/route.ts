import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ChatLog } from '@/types/chatLog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;

    console.log('API - Received caseId:', caseId, 'type:', typeof caseId);

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID is required' },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(caseId)) {
      console.error('Invalid ObjectId format:', caseId);
      return NextResponse.json(
        { error: 'Invalid case ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const chatLogsCollection = db.collection<ChatLog>('chatLogs');

    // Find the chat log by ObjectId
    const chatLog = await chatLogsCollection.findOne({
      _id: new ObjectId(caseId)
    });

    if (!chatLog) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      case: chatLog
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: 'Failed to fetch case data' },
      { status: 500 }
    );
  }
}
