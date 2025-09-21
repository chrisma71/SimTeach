'use client';

import { useState } from 'react';
import { useAuth0 } from '@/contexts/Auth0Context';
import { useProfiles } from '@/contexts/ProfileContext';
import TavusTalkScreen from '@/components/TavusTalkScreen';
import { useRouter } from 'next/navigation';

export default function TalkPage() {
  const { user, isLoading: authLoading } = useAuth0();
  const { activeProfile } = useProfiles();
  const router = useRouter();

  // Check authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please log in to continue</h1>
          <a href="/api/auth/login" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            Login
          </a>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please complete your profile first</h1>
          <a href="/complete-profile" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors">
            Complete Profile
          </a>
        </div>
      </div>
    );
  }

  // Show Tavus video call interface
  return (
    <TavusTalkScreen 
      onEndCall={() => {
        // The TavusVideoChat component handles the redirect to review page
        // No need to redirect here as TavusVideoChat handles it
      }}
    />
  );
}