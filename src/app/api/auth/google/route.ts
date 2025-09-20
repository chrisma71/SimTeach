import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // Redirect to Auth0 Google OAuth
  const googleUrl = new URL('/authorize', `https://${process.env.AUTH0_ISSUER_BASE_URL}`);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('client_id', process.env.AUTH0_CLIENT_ID!);
  googleUrl.searchParams.set('redirect_uri', `${process.env.AUTH0_BASE_URL}/api/auth/google/callback`);
  googleUrl.searchParams.set('scope', 'openid profile email');
  googleUrl.searchParams.set('connection', 'google-oauth2'); // This tells Auth0 to use Google OAuth
  
  return Response.redirect(googleUrl.toString());
}
