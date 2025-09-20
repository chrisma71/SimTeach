import { NextRequest, NextResponse } from 'next/server';
import { getAuth0Config } from '@/lib/auth0-config';
import { syncUserToMongoDB } from '@/lib/user-sync';

export async function GET(req: NextRequest) {
  let config;
  try {
    config = getAuth0Config();
  } catch (error) {
    console.error('Auth0 configuration error:', error);
    return Response.redirect(`${process.env.AUTH0_BASE_URL || 'http://localhost:3000'}/login?error=configuration_error`);
  }

  const code = req.nextUrl.searchParams.get('code');
  
  if (!code) {
    return Response.redirect(`${config.baseUrl}/login?error=missing_code`);
  }

  // Exchange code for token
  const tokenResponse = await fetch(`https://${config.issuerBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: `${config.baseUrl}/api/auth/callback`,
      audience: config.audience,
    }),
  });

  const tokens = await tokenResponse.json();
  
  if (tokens.error) {
    console.error('Auth0 token exchange error:', tokens);
    return Response.redirect(`${config.baseUrl}/login?error=${tokens.error}&description=${encodeURIComponent(tokens.error_description || '')}`);
  }

  // Get user info and sync to MongoDB
  try {
    const userResponse = await fetch(`https://${config.issuerBaseUrl}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      
      // Sync user to MongoDB
      try {
        const mongoUser = await syncUserToMongoDB(userData);
        console.log('User synced to MongoDB:', mongoUser._id);
      } catch (syncError) {
        console.error('Failed to sync user to MongoDB:', syncError);
        // Don't fail the auth flow if sync fails, just log the error
      }
    }
  } catch (userInfoError) {
    console.error('Failed to get user info:', userInfoError);
    // Don't fail the auth flow if user info fails, just log the error
  }

  // Set session cookie and redirect
  const response = NextResponse.redirect(`${config.baseUrl}/`);
  response.cookies.set('auth0_session', JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
