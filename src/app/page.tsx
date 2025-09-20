'use client';

import { useState } from 'react';
import { useProfiles } from '@/contexts/ProfileContext';
import Link from 'next/link';

export default function Home() {
  const { profiles, activeProfile, setActiveProfile, isLoading } = useProfiles();
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfile(profileId);
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setActiveProfile(profile);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Profiles...</h1>
          <p className="text-gray-600">Please wait while we load the student profiles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Tutoring Platform
            </h1>
            <p className="text-xl text-gray-600">
              Select a student profile to start your personalized tutoring session
            </p>
          </div>
        </div>
      </div>

      {/* Profile Selection */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                selectedProfile === profile.id ? 'ring-4 ring-blue-500' : ''
              }`}
              onClick={() => handleProfileSelect(profile.id)}
            >
              {/* Profile Image */}
              <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <img
                  src={profile.thumbnail}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              </div>

              {/* Profile Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{profile.name}</h3>
                <p className="text-gray-600 mb-2">Grade {profile.grade} • {profile.subject}</p>
                <p className="text-sm text-gray-500 mb-4">{profile.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{profile.averageGrade}</p>
                    <p className="text-xs text-gray-500">Average Grade</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{profile.age}</p>
                    <p className="text-xs text-gray-500">Years Old</p>
                  </div>
                </div>

                {/* Personality */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Personality:</p>
                  <p className="text-sm text-gray-600">{profile.personality}</p>
                </div>

                {/* Struggles */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Learning Challenges:</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.struggles.map((struggle, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                      >
                        {struggle}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">Strengths:</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.strengths.map((strength, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href="/talk"
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    selectedProfile === profile.id
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {selectedProfile === profile.id ? 'Start Session' : 'Select Profile'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Profile Info */}
        {selectedProfile && (
          <div className="mt-12 text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Start Your Session?
              </h2>
              <p className="text-gray-600 mb-6">
                You've selected {profiles.find(p => p.id === selectedProfile)?.name}. 
                Click "Start Session" above to begin your personalized tutoring experience.
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/talk"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Start Voice Chat
                </Link>
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Change Selection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}