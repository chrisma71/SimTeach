// Global audio cleanup utility
// This ensures all audio resources are properly released when navigating away from the talk page

export const cleanupAllAudioResources = () => {
  console.log('Cleaning up all audio resources globally');
  
  // Stop all speech synthesis
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    // Force stop by pausing and resuming then canceling again
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
  }
  
  // Note: We can't directly access the audio context or recognition from here
  // since they're component-specific, but this function can be called
  // from the talk page component when needed
};

// Add a global cleanup function to window for emergency cleanup
if (typeof window !== 'undefined') {
  (window as any).cleanupAudio = cleanupAllAudioResources;
}
