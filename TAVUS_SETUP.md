# Tavus API Setup Guide

## Environment Variables Required

You need to set up the following environment variables for the Tavus avatar integration to work:

### 1. Create a `.env.local` file in your project root:

```bash
# Tavus API Configuration
TAVUS_API_KEY=your_tavus_api_key_here
TAVUS_REPLICA_ID=your_replica_id_here
PERSONA_ID=your_persona_id_here
```

### 2. Get your Tavus credentials:

1. **Sign up for Tavus**: Go to [https://tavusapi.com](https://tavusapi.com) and create an account
2. **Create a Replica**: Create a digital replica (avatar) of a person
3. **Create a Persona**: Create a persona (AI personality) for the replica
4. **Get API Key**: Generate an API key from your dashboard

### 3. Current Error:

The error "Invalid persona_id" means your `PERSONA_ID` environment variable is either:
- Not set
- Set to an invalid value
- The persona doesn't exist in your Tavus account

### 4. Valid Persona ID Format:

Tavus persona IDs typically look like: `pcfb7aee425d` (starts with 'p' followed by alphanumeric characters)

### 5. Steps to Fix:

1. Log into your Tavus dashboard
2. Go to "Personas" section
3. Copy the correct persona ID
4. Update your `.env.local` file with the correct `PERSONA_ID`
5. Restart your development server

### 6. Test the Setup:

Once you've set up the environment variables correctly, the avatar should load automatically when you visit the talk page.

## Troubleshooting

- **"Missing required environment variables"**: Check that all three variables are set in `.env.local`
- **"Invalid persona_id"**: Verify the persona exists in your Tavus account
- **"Invalid replica_id"**: Verify the replica exists in your Tavus account
- **API Key errors**: Make sure your API key is valid and has the correct permissions
