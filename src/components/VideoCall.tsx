'use client';

import { useState, useRef, useEffect } from 'react';
import TavusVideoPlayer from './TavusVideoPlayer';

interface VideoCallProps {
  isActive: boolean;
  onEndCall: () => void;
  studentName: string;
  feedbackVideoUrl?: string;
}

export default function VideoCall({ 
  isActive, 
  onEndCall, 
  studentName, 
  feedbackVideoUrl 
}: VideoCallProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showTavusVideo, setShowTavusVideo] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (isActive) {
      initializeCall();
    } else {
      endCall();
    }

    return () => {
      endCall();
    };
  }, [isActive]);

  useEffect(() => {
    // Show Tavus video when it becomes available
    if (feedbackVideoUrl && isConnected) {
      setShowTavusVideo(true);
    }
  }, [feedbackVideoUrl, isConnected]);

  const initializeCall = async () => {
    setIsConnecting(true);
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // For demo purposes, we'll simulate a connection
      // In a real app, you'd set up WebRTC peer connection here
      setTimeout(() => {
        setIsConnecting(false);
        setIsConnected(true);
        simulateRemoteVideo();
      }, 2000);

    } catch (error) {
      console.error('Error accessing media devices:', error);
      setIsConnecting(false);
    }
  };

  const simulateRemoteVideo = () => {
    // This simulates the remote video for demo purposes
    if (remoteVideoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      
      const animate = () => {
        if (ctx && isConnected) {
          ctx.fillStyle = '#4A90E2';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'white';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`${studentName}`, canvas.width / 2, canvas.height / 2 - 10);
          ctx.fillText('(Simulated)', canvas.width / 2, canvas.height / 2 + 20);
          requestAnimationFrame(animate);
        }
      };
      animate();
      
      const stream = canvas.captureStream(30);
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setShowTavusVideo(false);
    onEndCall();
  };

  const handleTavusVideoEnd = () => {
    setShowTavusVideo(false);
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-bold">
            Video Call with {studentName}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-white text-sm">
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            {feedbackVideoUrl && (
              <button
                onClick={() => setShowTavusVideo(!showTavusVideo)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
              >
                {showTavusVideo ? 'Hide' : 'Show'} AI Feedback
              </button>
            )}
          </div>
        </div>

        {/* Tavus Video Player */}
        <TavusVideoPlayer
          videoUrl={feedbackVideoUrl}
          isVisible={showTavusVideo}
          studentName={studentName}
          onVideoEnd={handleTavusVideoEnd}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Remote Video (Student) */}
          <div className="relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 lg:h-80 bg-gray-800 rounded-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
              {studentName}
            </div>
          </div>

          {/* Local Video (You) */}
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 lg:h-80 bg-gray-800 rounded-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
              You
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">📹</span>
                  </div>
                  <p>Camera Off</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white transition-colors`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white transition-colors`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>

          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="End call"
          >
            📞
          </button>
        </div>

        {isConnecting && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Connecting to {studentName}...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
