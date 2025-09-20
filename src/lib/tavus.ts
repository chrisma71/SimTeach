const TAVUS_API_KEY = '93d2a5c08b994032b530ef556008e246';
const TAVUS_BASE_URL = 'https://tavusapi.com/v2';

export interface TavusVideoRequest {
  replica_id: string;
  script: string;
  background_url?: string;
  persona_id?: string;
}

export interface TavusVideoResponse {
  video_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  thumbnail_url?: string;
}

export class TavusAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = TAVUS_API_KEY;
    this.baseUrl = TAVUS_BASE_URL;
  }

  async createVideo(script: string, personaId: string = 'pd4c2e986e09', replicaId: string = 'rf4703150052'): Promise<TavusVideoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/videos`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          replica_id: replicaId,
          script: script,
          persona_id: personaId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavus API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Tavus video:', error);
      throw error;
    }
  }

  async getVideoStatus(videoId: string): Promise<TavusVideoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/videos/${videoId}`, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Tavus API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting video status:', error);
      throw error;
    }
  }

  async waitForVideoCompletion(videoId: string, maxWaitTime: number = 300000): Promise<TavusVideoResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getVideoStatus(videoId);
      
      if (status.status === 'completed') {
        return status;
      } else if (status.status === 'failed') {
        throw new Error('Video generation failed');
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Video generation timed out');
  }
}

export const tavusAPI = new TavusAPI();
