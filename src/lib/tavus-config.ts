export interface TavusConfig {
  apiKey: string;
  replicaId: string;
  personaId: string;
  baseUrl: string;
}

export function getTavusConfig(): TavusConfig {
  const apiKey = process.env.TAVUS_API_KEY;
  const replicaId = process.env.TAVUS_REPLICA_ID;
  const personaId = process.env.PERSONA_ID;

  if (!apiKey || !replicaId || !personaId) {
    throw new Error('Missing required Tavus environment variables');
  }

  return {
    apiKey,
    replicaId,
    personaId,
    baseUrl: 'https://tavusapi.com/v2'
  };
}

export function validateTavusConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = ['TAVUS_API_KEY', 'TAVUS_REPLICA_ID', 'PERSONA_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}
