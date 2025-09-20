import { NextRequest, NextResponse } from 'next/server';
import { updateUserInMongoDB } from '@/lib/user-sync';

export async function POST(req: NextRequest) {
  try {
    // Get user ID from session cookie
    const sessionCookie = req.cookies.get('auth0_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionCookie.value);
    
    if (!session.user || !session.user.sub) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { institution } = await req.json();

    if (!institution || !institution.trim()) {
      return NextResponse.json(
        { error: 'Institution is required' },
        { status: 400 }
      );
    }

    // Update user institution in MongoDB
    const updatedUser = await updateUserInMongoDB(session.user.sub, {
      institution: institution.trim(),
    });
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Profile completed successfully',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
