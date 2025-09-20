import { getLanguageName, isValidLanguageCode } from '../utils/languageMapping';

// ...existing code...

export async function createSession(language: string = 'en') {
  try {
    // Convert ISO code to full language name
    const languageName = getLanguageName(language);
    
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TAVUS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replica_id: process.env.TAVUS_REPLICA_ID,
        persona_id: process.env.PERSONA_ID,
        language: languageName, // Use full language name instead of ISO code
        // ...existing configuration...
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create session: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}
