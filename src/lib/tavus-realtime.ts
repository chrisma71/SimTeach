const TAVUS_API_KEY = '93d2a5c08b994032b530ef556008e246';
const TAVUS_BASE_URL = 'https://tavusapi.com/v2';

export interface TavusConversationConfig {
  replica_id: string;
  conversation_name: string;
  callback_url?: string;
  properties?: {
    max_session_length?: number;
    language?: string;
  };
}

export interface TavusConversationResponse {
  conversation_id: string;
  conversation_url: string;
  status: 'active' | 'ended' | 'error';
}

export class TavusRealtimeAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = TAVUS_API_KEY;
    this.baseUrl = TAVUS_BASE_URL;
  }

  async createConversation(
    studentProfile: any,
    subject: string,
    baseUrl?: string,
    replicaId: string = 'rf4703150052'
  ): Promise<TavusConversationResponse> {
    try {
      const callbackUrl = baseUrl ? `${baseUrl}/api/tavus-callback` : undefined;

      // Simplified request body - only use supported fields
      const requestBody = {
        replica_id: replicaId,
        conversation_name: `Tutoring with ${studentProfile.name}`,
        ...(callbackUrl && { callback_url: callbackUrl }),
        properties: {
          max_session_length: 900,
          language: 'en'
        }
      };

      console.log('Tavus Conversation API Request:', {
        url: `${this.baseUrl}/conversations`,
        body: requestBody
      });

      const response = await fetch(`${this.baseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Tavus Conversation API Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (!response.ok) {
        throw new Error(`Tavus Conversation API error: ${response.status} ${response.statusText} - ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error creating Tavus conversation:', error);
      throw error;
    }
  }

  async endConversation(conversationId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/end`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to end conversation: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error ending Tavus conversation:', error);
      throw error;
    }
  }

  async getConversationStatus(conversationId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/conversations/${conversationId}`, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get conversation status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting conversation status:', error);
      throw error;
    }
  }

  // Simplified video creation without persona_id
  async createVideo(studentProfile: any, subject: string): Promise<any> {
    try {
      const script = `Hi! I'm ${studentProfile.name}, a ${studentProfile.grade} grade student. I need help with ${subject}. My current grade average is ${studentProfile.averageGrade}. Can you help me understand this better?`;

      // Only use supported fields for video creation
      const requestBody = {
        replica_id: 'rf4703150052',
        script: script
      };

      console.log('Creating Tavus video with:', requestBody);

      const response = await fetch(`${this.baseUrl}/videos`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Tavus video response:', {
        status: response.status,
        body: responseText
      });

      if (!response.ok) {
        throw new Error(`Tavus video API error: ${response.status} - ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error creating Tavus video:', error);
      throw error;
    }
  }

  // Test API connection
  async testConnection(): Promise<any> {
    try {
      console.log('Testing Tavus API connection...');
      
      // Try to get replicas to test API connection
      const response = await fetch(`${this.baseUrl}/replicas`, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      const responseText = await response.text();
      console.log('Tavus API test response:', {
        status: response.status,
        body: responseText
      });

      if (!response.ok) {
        throw new Error(`Tavus API test failed: ${response.status} - ${responseText}`);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error testing Tavus API:', error);
      throw error;
    }
  }
}

export const tavusRealtimeAPI = new TavusRealtimeAPI();
