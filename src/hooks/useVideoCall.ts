import { useState, useRef, useCallback } from 'react';

interface UseVideoCallOptions {
  onCallEnd?: () => void;
  onCallStart?: () => void;
  onError?: (error: Error) => void;
}

export function useVideoCall(options: UseVideoCallOptions = {}) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const startCall = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      setIsCallActive(true);
      setIsConnecting(false);
      
      options.onCallStart?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setIsConnecting(false);
      options.onError?.(error);
    }
  }, [options]);

  const endCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsCallActive(false);
    setIsConnecting(false);
    setError(null);
    
    options.onCallEnd?.();
  }, [options]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  return {
    isCallActive,
    isConnecting,
    isVideoEnabled,
    isAudioEnabled,
    error,
    localStream: localStreamRef.current,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
