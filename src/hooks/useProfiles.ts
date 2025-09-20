'use client';

import { useState, useEffect } from 'react';
import { students, Student } from '@/lib/students';

export function useProfiles() {
  const [activeProfile, setActiveProfile] = useState<Student | null>(null);

  // Load saved profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('activeStudent');
    if (saved) {
      const savedStudent = students.find(s => s.id === saved);
      if (savedStudent) {
        setActiveProfile(savedStudent);
      }
    }
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

  return {
    profiles: students,
    activeProfile,
    setActiveProfile: setActiveProfileAndSave,
  };
}
