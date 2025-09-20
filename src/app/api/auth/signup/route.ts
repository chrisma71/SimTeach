import { NextRequest, NextResponse } from 'next/server';
import { syncUserToMongoDB } from '@/lib/user-sync';

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json();

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Alternative approach: Use Auth0's signup API instead of Management API
    // This uses the public signup endpoint which doesn't require client_credentials
    const signupResponse = await fetch(`https://${process.env.AUTH0_ISSUER_BASE_URL}/dbconnections/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_CLIENT_ID,
        email,
        username,
        password,
        connection: 'Username-Password-Authentication',
      }),
    });

    const signupData = await signupResponse.json();

    if (signupData.error) {
      console.error('Auth0 signup error:', signupData);
      return NextResponse.json(
        { error: signupData.description || 'Failed to create user' },
        { status: 400 }
      );
    }

    // Sync user to MongoDB after successful Auth0 signup
    try {
      // Create a user object that matches Auth0's format for syncing
      const auth0User = {
        sub: signupData._id,
        email: email,
        nickname: username,
        name: username,
        email_verified: false,
      };

      const mongoUser = await syncUserToMongoDB(auth0User);
      console.log('User synced to MongoDB:', mongoUser._id);
    } catch (syncError) {
      console.error('Failed to sync user to MongoDB:', syncError);
      // Don't fail the signup if sync fails, just log the error
    }

    return NextResponse.json({
      message: 'User created successfully. Please check your email to verify your account.',
      userId: signupData._id,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
