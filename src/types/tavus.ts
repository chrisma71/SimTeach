export interface TavusConversation {
  conversation_id: string;
  conversation_name: string;
  conversation_url: string;
  status: 'active' | 'ended' | 'pending';
  callback_url?: string;
  created_at: string;
  ended_at?: string;
}

export interface TavusConversationRequest {
  replica_id: string;
  persona_id: string;
  conversational_context: string;
  custom_greeting: string;
  properties: TavusConversationProperties;
}

export interface TavusConversationProperties {
  max_call_duration: number;
  participant_absent_timeout: number;
  participant_left_timeout: number;
  enable_recording: boolean;
  enable_transcription: boolean;
  language: string;
}

export interface TavusApiError {
  message: string;
  code?: string;
  details?: any;
}
