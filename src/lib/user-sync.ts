import { getDatabase } from './mongodb';
import { User, CreateUserData } from '@/types/user';

const COLLECTION_NAME = 'users';

export async function syncUserToMongoDB(auth0User: any): Promise<User> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTION_NAME);

    // Extract user data from Auth0 user object
    const userData: CreateUserData = {
      _id: auth0User.sub,
      email: auth0User.email,
      username: auth0User.nickname || auth0User.name || auth0User.email,
      name: auth0User.name,
      profilePicture: auth0User.picture,
      isEmailVerified: auth0User.email_verified || false,
    };

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ _id: userData._id });

    if (existingUser) {
      // Update existing user
      const updatedUser = await usersCollection.findOneAndUpdate(
        { _id: userData._id },
        {
          $set: {
            email: userData.email,
            username: userData.username,
            name: userData.name,
            profilePicture: userData.profilePicture,
            isEmailVerified: userData.isEmailVerified,
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      return updatedUser as User;
    } else {
      // Create new user
      const newUser: User = {
        ...userData,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.insertOne(newUser);
      return newUser;
    }
  } catch (error) {
    console.error('Error syncing user to MongoDB:', error);
    throw new Error('Failed to sync user to database');
  }
}

export async function getUserFromMongoDB(userId: string): Promise<User | null> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTION_NAME);
    
    return await usersCollection.findOne({ _id: userId });
  } catch (error) {
    console.error('Error getting user from MongoDB:', error);
    return null;
  }
}

export async function updateUserInMongoDB(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTION_NAME);
    
    const updatedUser = await usersCollection.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return updatedUser as User;
  } catch (error) {
    console.error('Error updating user in MongoDB:', error);
    return null;
  }
}

export async function deleteUserFromMongoDB(userId: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const usersCollection = db.collection<User>(COLLECTION_NAME);
    
    const result = await usersCollection.deleteOne({ _id: userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting user from MongoDB:', error);
    return false;
  }
}
