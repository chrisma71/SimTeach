import { NextRequest, NextResponse } from 'next/server';
import { getUserFromMongoDB } from '@/lib/user-sync';

export async function GET(req: NextRequest) {
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

    // Get user from MongoDB
    const user = await getUserFromMongoDB(session.user.sub);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
