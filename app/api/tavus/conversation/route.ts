import { getLanguageName } from '../../../../utils/languageMapping';

export async function POST(request: Request) {
  try {
    // ...existing code...

    const action = request.headers.get('action'); // Define 'action' from request headers or another source
    if (action === 'create') {
      // ...existing code...

      const customGreeting = "Hello! Welcome to the conversation."; // Define a default custom greeting

      const conversationalContext = "Default context"; // Define a default conversational context

      const requestBody = {
        replica_id: process.env.TAVUS_REPLICA_ID,
        persona_id: process.env.PERSONA_ID,
        conversational_context: conversationalContext,
        custom_greeting: customGreeting,
        properties: {
          max_call_duration: 900,
          participant_absent_timeout: 60,
          participant_left_timeout: 60,
          enable_recording: false,
          enable_transcription: true,
          language: "english" // Changed from 'en' to 'english'
        }
      };

      // ...existing code...
    }

    // ...existing code...
  } catch (error) {
    // ...existing code...
  }
}
