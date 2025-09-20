export interface User {
  _id: string; // Auth0 user ID (sub)
  email: string;
  username: string;
  name?: string;
  institution: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  _id: string;
  email: string;
  username: string;
  name?: string;
  institution: string;
  profilePicture?: string;
  isEmailVerified: boolean;
}
