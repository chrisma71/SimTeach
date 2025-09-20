import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('auth0_session');
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionCookie.value);
    
    if (!session.user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Return user data (handle both email/password and Google OAuth users)
    return NextResponse.json({
      _id: session.user.sub,
      email: session.user.email,
      username: session.user.nickname || session.user.name || session.user.email,
      role: session.user['https://your-app.com/role'] || session.user.user_metadata?.role || 'student',
      institution: session.user['https://your-app.com/institution'] || session.user.user_metadata?.institution || '',
      createdAt: new Date(session.user.created_at || Date.now()),
      updatedAt: new Date(session.user.updated_at || Date.now())
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
