import { NextRequest, NextResponse } from 'next/server';
import { syncUserToMongoDB } from '@/lib/user-sync';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  
  if (!code) {
    return Response.redirect(`${process.env.AUTH0_BASE_URL}/login?error=missing_code`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.AUTH0_BASE_URL}/api/auth/google/callback`,
        audience: process.env.AUTH0_MANAGEMENT_AUDIENCE,
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Google OAuth token error:', tokens);
      return Response.redirect(`${process.env.AUTH0_BASE_URL}/login?error=${tokens.error}`);
    }

    // Get user info
    const userResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Sync user to MongoDB
    let mongoUser;
    try {
      mongoUser = await syncUserToMongoDB(userData);
      console.log('Google OAuth user synced to MongoDB:', mongoUser._id);
    } catch (syncError) {
      console.error('Failed to sync Google OAuth user to MongoDB:', syncError);
      // Don't fail the OAuth flow if sync fails, just log the error
    }

    // Set session cookie and redirect
    const response = NextResponse.redirect(
      mongoUser && mongoUser.institution 
        ? `${process.env.AUTH0_BASE_URL}/` 
        : `${process.env.AUTH0_BASE_URL}/complete-profile`
    );
    
    response.cookies.set('auth0_session', JSON.stringify({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      user: userData,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return Response.redirect(`${process.env.AUTH0_BASE_URL}/login?error=oauth_error`);
  }
}
