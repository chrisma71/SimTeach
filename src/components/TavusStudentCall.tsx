'use client';

import { useState, useRef, useEffect } from 'react';

interface TavusStudentCallProps {
  isActive: boolean;
  onEndCall: () => void;
  studentProfile: any;
  subject: string;
}

export default function TavusStudentCall({ 
  isActive, 
  onEndCall, 
  studentProfile,
  subject 
}: TavusStudentCallProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      initializeTavusCall();
    } else {
      endCall();
    }

    return () => {
      endCall();
    };
  }, [isActive]);

  const initializeTavusCall = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Get user media for local video
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create Tavus conversation/video
      const response = await fetch('/api/tavus-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          studentProfile,
          subject
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Tavus conversation');
      }

      const conversation = await response.json();
      console.log('Received conversation data:', conversation);
      
      setConversationId(conversation.conversation_id);
      
      // Check if we got a Tavus hosted URL (for videos) or a data URL (for demo)
      if (conversation.conversation_url && conversation.conversation_url.startsWith('https://tavus.video/')) {
        setVideoData({
          hosted_url: conversation.conversation_url,
          video_id: conversation.conversation_id,
          status: 'ready'
        });
        setConversationUrl(conversation.conversation_url);
      } else {
        setConversationUrl(conversation.conversation_url);
      }
      
      setIsConnected(true);
      setIsConnecting(false);

    } catch (err) {
      console.error('Error initializing Tavus call:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const endCall = async () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // End Tavus conversation
    if (conversationId) {
      try {
        await fetch('/api/tavus-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            conversationId
          }),
        });
      } catch (error) {
        console.error('Error ending Tavus conversation:', error);
      }
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setConversationId(null);
    setConversationUrl(null);
    setVideoData(null);
    setError(null);
    onEndCall();
  };

  const openTavusVideo = () => {
    console.log('Attempting to open Tavus video:', videoData);
    
    if (videoData?.hosted_url) {
      console.log('Opening URL:', videoData.hosted_url);
      
      // Try multiple methods to open the URL
      try {
        // Method 1: window.open
        const newWindow = window.open(videoData.hosted_url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          // Method 2: If popup blocked, try direct navigation
          console.log('Popup blocked, trying direct navigation');
          window.location.href = videoData.hosted_url;
        } else {
          console.log('Successfully opened in new window');
        }
      } catch (error) {
        console.error('Error opening video:', error);
        // Method 3: Fallback - copy to clipboard and show message
        navigator.clipboard.writeText(videoData.hosted_url).then(() => {
          alert(`Unable to open video automatically. URL copied to clipboard:\n${videoData.hosted_url}`);
        }).catch(() => {
          alert(`Please open this URL manually:\n${videoData.hosted_url}`);
        });
      }
    } else {
      console.error('No hosted URL available:', videoData);
      alert('Video URL not available yet. Please try again in a moment.');
    }
  };

  const DirectVideoLink = ({ url }: { url: string }) => (
    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
      <h4 className="text-green-300 font-semibold mb-2">🔗 Direct Video Link</h4>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={url}
          readOnly
          className="flex-1 bg-gray-800 text-white p-2 rounded text-sm font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={() => navigator.clipboard.writeText(url)}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
        >
          Copy
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
        >
          Open
        </a>
      </div>
      <p className="text-green-200 text-xs mt-2">
        Click the link above or copy it to open your AI student video directly
      </p>
    </div>
  );

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-white text-xl font-bold">
              AI Tutoring Session with {studentProfile.name}
            </h2>
            <p className="text-gray-300 text-sm">
              Subject: {subject} • Grade: {studentProfile.grade} • Powered by Tavus AI
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 
                isConnecting ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`}></div>
              <span className="text-white text-sm">
                {isConnected ? 'Connected to AI Student' : 
                 isConnecting ? 'Connecting...' : 
                 'Disconnected'}
              </span>
            </div>
            <button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
            >
              End Session
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isConnecting && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Creating AI student session...</p>
            <p className="text-gray-300 text-sm mt-2">
              Setting up {studentProfile.name} for {subject} tutoring
            </p>
          </div>
        )}

        {isConnected && (
          <div className="space-y-6">
            {/* Tavus Video Display */}
            {videoData?.hosted_url ? (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-purple-300 font-semibold text-lg">🤖 Your AI Student Video</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={openTavusVideo}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Open in New Tab
                    </button>
                    <a
                      href={videoData.hosted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                    >
                      Direct Link
                    </a>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-white text-center">
                    <strong>🎥 Tavus AI Video Generated!</strong>
                  </p>
                  <p className="text-gray-300 text-center text-sm mt-2">
                    Video ID: {videoData.video_id}
                  </p>
                  <p className="text-gray-300 text-center text-sm">
                    Status: Ready for viewing
                  </p>
                </div>

                {/* Direct Link Component */}
                <DirectVideoLink url={videoData.hosted_url} />

                {/* Embedded iframe for the video */}
                <div className="relative mt-4">
                  <iframe
                    src={videoData.hosted_url}
                    className="w-full h-96 bg-gray-800 rounded-lg border-2 border-purple-500/50"
                    allow="camera; microphone; autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    title={`AI Student ${studentProfile.name}`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                    🤖 AI Student: {studentProfile.name}
                  </div>
                  <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">
                    Tavus AI
                  </div>
                </div>

                {/* Troubleshooting Help */}
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4">
                  <h4 className="text-yellow-300 font-semibold mb-2">🔧 Having trouble viewing the video?</h4>
                  <ul className="text-yellow-100 text-sm space-y-1">
                    <li>• Try the "Direct Link" button above</li>
                    <li>• Check if your browser is blocking popups</li>
                    <li>• Copy the URL and paste it in a new tab</li>
                    <li>• The video might still be processing - wait a moment and refresh</li>
                  </ul>
                </div>
              </div>
            ) : conversationUrl ? (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-blue-300 font-semibold text-lg mb-4">🤖 AI Student Interface</h3>
                <iframe
                  src={conversationUrl}
                  className="w-full h-96 bg-gray-800 rounded-lg border-2 border-blue-500/50"
                  allow="camera; microphone; display-capture"
                  title={`AI Student ${studentProfile.name}`}
                />
              </div>
            ) : null}

            {/* Your Video Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 bg-gray-800 rounded-lg object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                  👨‍🏫 You (Tutor)
                </div>
              </div>

              {/* Student Info Panel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Student Profile</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{studentProfile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Grade:</span>
                    <span className="text-white">{studentProfile.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white">{subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average:</span>
                    <span className="text-white">{studentProfile.averageGrade}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <span className="text-gray-400">Learning Style:</span>
                    <p className="text-white text-sm mt-1">{studentProfile.learningStyle || 'Visual and interactive'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-300 font-semibold mb-2">💡 Tutoring Tips</h4>
              <ul className="text-blue-100 text-sm space-y-1">
                <li>• Your AI student video has been generated and is ready to view</li>
                <li>• The AI student will act like a real {studentProfile.grade} grader</li>
                <li>• Click "Open in New Tab" to view the full Tavus video interface</li>
                <li>• Use encouraging language and check for understanding</li>
                <li>• The session will automatically analyze your teaching effectiveness</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
