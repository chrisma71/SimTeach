export interface User {
  _id?: string;
  email: string;
  username: string;
  institution: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
  institution: string;
}

export interface LoginData {
  email: string;
  password: string;
}
