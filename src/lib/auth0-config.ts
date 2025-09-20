// Auth0 Configuration Checker
export function validateAuth0Config() {
  const requiredEnvVars = [
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID', 
    'AUTH0_CLIENT_SECRET',
    'AUTH0_BASE_URL'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('Missing Auth0 environment variables:', missing);
    return {
      isValid: false,
      missing: missing,
      message: `Missing required environment variables: ${missing.join(', ')}`
    };
  }

  return {
    isValid: true,
    missing: [],
    message: 'Auth0 configuration is valid'
  };
}

export function getAuth0Config() {
  const config = validateAuth0Config();
  
  if (!config.isValid) {
    throw new Error(config.message);
  }

  return {
    issuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    baseUrl: process.env.AUTH0_BASE_URL!,
    audience: process.env.AUTH0_MANAGEMENT_AUDIENCE || `https://${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
  };
}
