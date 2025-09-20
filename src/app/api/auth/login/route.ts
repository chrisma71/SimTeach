import { NextRequest, NextResponse } from 'next/server';
import { syncUserToMongoDB } from '@/lib/user-sync';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with Auth0 using Resource Owner Password Grant
    const authResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'password',
        username: email,
        password: password,
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
        scope: 'openid profile email',
      }),
    });

    const authData = await authResponse.json();

    if (authData.error) {
      console.error('Auth0 login error:', authData);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user info
    const userResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Sync user to MongoDB
    try {
      const mongoUser = await syncUserToMongoDB(userData);
      console.log('User synced to MongoDB:', mongoUser._id);
    } catch (syncError) {
      console.error('Failed to sync user to MongoDB:', syncError);
      // Don't fail the login if sync fails, just log the error
    }

    // Set session cookie
    const response = NextResponse.json({
      message: 'Login successful',
      user: userData,
    });

    response.cookies.set('auth0_session', JSON.stringify({
      access_token: authData.access_token,
      id_token: authData.id_token,
      user: userData,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
