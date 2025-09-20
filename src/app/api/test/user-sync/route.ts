import { NextRequest, NextResponse } from 'next/server';
import { syncUserToMongoDB, getUserFromMongoDB } from '@/lib/user-sync';

export async function GET(req: NextRequest) {
  try {
    // Test user sync with mock Auth0 user data
    const mockAuth0User = {
      sub: 'test-user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      name: 'Test User',
      user_metadata: {
        institution: 'Test University',
      },
      email_verified: true,
      picture: 'https://example.com/avatar.jpg',
    };

    // Sync user to MongoDB
    const syncedUser = await syncUserToMongoDB(mockAuth0User);
    console.log('Test user synced:', syncedUser);

    // Retrieve user from MongoDB
    const retrievedUser = await getUserFromMongoDB(mockAuth0User.sub);
    console.log('Test user retrieved:', retrievedUser);

    return NextResponse.json({
      message: 'User sync test completed successfully',
      syncedUser,
      retrievedUser,
    });

  } catch (error) {
    console.error('User sync test error:', error);
    return NextResponse.json(
      { error: 'User sync test failed', details: error.message },
      { status: 500 }
    );
  }
}
