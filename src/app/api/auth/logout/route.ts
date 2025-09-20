import { NextRequest, NextResponse } from 'next/server';
import { getAuth0Config } from '@/lib/auth0-config';

export async function GET(req: NextRequest) {
  try {
    const config = getAuth0Config();
    
    // Create Auth0 logout URL
    const logoutUrl = new URL('/v2/logout', `https://${config.issuerBaseUrl}`);
    logoutUrl.searchParams.set('client_id', config.clientId);
    logoutUrl.searchParams.set('returnTo', config.baseUrl);
    
    // Create response with redirect to Auth0 logout
    const response = NextResponse.redirect(logoutUrl.toString());
    
    // Clear the session cookie
    response.cookies.set('auth0_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('Logout configuration error:', error);
    // Fallback: just clear cookie and redirect to home
    const response = NextResponse.redirect(`${process.env.AUTH0_BASE_URL || 'http://localhost:3000'}/`);
    response.cookies.set('auth0_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  }
}
