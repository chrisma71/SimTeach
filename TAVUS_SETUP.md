# Tavus API Setup Guide

## Environment Variables Required

You need to set up the following environment variables for student-specific Tavus avatars:

### Base Configuration (Fallback)
```
TAVUS_API_KEY=your_base_api_key_here
TAVUS_REPLICA_ID=your_base_replica_id_here
PERSONA_ID=your_base_persona_id_here
```

### Student-Specific Configuration

#### Maya Rodriguez (MAY)
```
TAVUS_API_KEY_MAY=your_api_key_ending_in_MAY
TAVUS_REPLICA_ID_MAY=your_replica_id_for_maya
TAVUS_PERSONA_ID_MAY=your_persona_id_for_maya
```

#### Jordan Kim (JOR)
```
TAVUS_API_KEY_JOR=your_api_key_ending_in_JOR
TAVUS_REPLICA_ID_JOR=your_replica_id_for_jordan
TAVUS_PERSONA_ID_JOR=your_persona_id_for_jordan
```

#### Aiden Park (AID)
```
TAVUS_API_KEY_AID=your_api_key_ending_in_AID
TAVUS_REPLICA_ID_AID=your_replica_id_for_aiden
TAVUS_PERSONA_ID_AID=your_persona_id_for_aiden
```

## How It Works

1. **Available Students**: Maya, Jordan, and Aiden are configured as available
2. **Coming Soon**: All other students show "Coming Soon" status
3. **API Key Matching**: Keys ending in MAY, JOR, and AID are used for respective students
4. **System Prompts**: Each student gets personalized prompts based on their data from `students.ts`

## Student Data Integration

The system automatically uses each student's:
- Name, age, grade, subject
- Personality traits
- Struggles and strengths
- Average grade (affects knowledge level in prompts)
- Description

## Testing

1. Set up the environment variables
2. Start the application
3. Go to `/talk` to see student selection
4. Click on Maya, Jordan, or Aiden to start a session
5. Other students will show "Coming Soon" status