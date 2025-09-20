'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { students, Student } from '@/lib/students';

interface ProfileContextType {
  profiles: Student[];
  activeProfile: Student | null;
  setActiveProfile: (profile: Student | null) => void;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfile, setActiveProfile] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('activeStudent');
    
    if (saved) {
      const savedStudent = students.find(s => s.id === saved);
      if (savedStudent) {
        setActiveProfile(savedStudent);
      }
    }
    setIsLoading(false);
  }, []);

  // Save profile to localStorage when it changes
  const setActiveProfileAndSave = (profile: Student | null) => {
    setActiveProfile(profile);
    if (profile) {
      localStorage.setItem('activeStudent', profile.id);
    } else {
      localStorage.removeItem('activeStudent');
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profiles: students,
        activeProfile,
        setActiveProfile: setActiveProfileAndSave,
        isLoading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return context;
}
