import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Process a single epoch of transcript refinement
async function processEpoch(input: string, studentName: string, epoch: number, stage: string) {
  const prompts = {
    initial_parsing: `You are splitting a conversation transcript between a tutor and ${studentName || 'a student'}. 

Your ONLY job is to:
1. Split the text into individual messages where speakers change
2. Identify who is speaking (tutor vs student)
3. Preserve the exact original text

Raw conversation text:
"${input}"

Return as JSON array:
[
  {
    "id": "unique_id",
    "text": "EXACT ORIGINAL TEXT",
    "isUser": true/false,
    "timestamp": "ISO timestamp"
  }
]

Rules:
- Split where speaker changes
- isUser: true = tutor, false = student
- Keep exact original text
- Create realistic timestamps

Return only the JSON array.`,

    refinement: `You are re-splitting a conversation transcript between a tutor and ${studentName || 'a student'}. 

Your ONLY job is to:
1. Re-split the text into individual messages where speakers change
2. Re-identify who is speaking (tutor vs student)
3. Preserve the exact original text

Current transcript:
${input}

Return as JSON array:
[
  {
    "id": "unique_id",
    "text": "EXACT ORIGINAL TEXT",
    "isUser": true/false,
    "timestamp": "ISO timestamp"
  }
]

Rules:
- Split where speaker changes
- isUser: true = tutor, false = student
- Keep exact original text
- Create realistic timestamps

Return only the JSON array.`,

    final_polish: `You are final-splitting a conversation transcript between a tutor and ${studentName || 'a student'}. 

Your ONLY job is to:
1. Final-split the text into individual messages where speakers change
2. Final-identify who is speaking (tutor vs student)
3. Preserve the exact original text

Current transcript:
${input}

Return as JSON array:
[
  {
    "id": "unique_id",
    "text": "EXACT ORIGINAL TEXT",
    "isUser": true/false,
    "timestamp": "ISO timestamp"
  }
]

Rules:
- Split where speaker changes
- isUser: true = tutor, false = student
- Keep exact original text
- Create realistic timestamps

Return only the JSON array.`
  };

  const prompt = prompts[stage as keyof typeof prompts];
  
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are an expert at ${stage} conversation transcripts. Always return valid JSON.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2, // Lower temperature for more consistent results
    max_tokens: 2000
  });

  try {
    const responseText = completion.choices[0]?.message?.content?.trim() || '[]';
    const result = JSON.parse(responseText);
    
    // Validate the response
    if (!Array.isArray(result)) {
      throw new Error('Response is not an array');
    }
    
    // Validate that original text is preserved (for epoch 1)
    if (epoch === 1) {
      const originalWords = input.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      const resultWords = result.map(msg => msg.text).join(' ').toLowerCase().split(/\s+/).filter(word => word.length > 0);
      
      // Check if most original words are preserved
      const preservedWords = originalWords.filter(word => resultWords.includes(word));
      const preservationRate = preservedWords.length / originalWords.length;
      
      if (preservationRate < 0.8) {
        console.warn(`⚠️ Epoch ${epoch}: Low text preservation rate (${(preservationRate * 100).toFixed(1)}%)`);
        console.warn('Original words:', originalWords.slice(0, 10));
        console.warn('Result words:', resultWords.slice(0, 10));
      } else {
        console.log(`✅ Epoch ${epoch}: Good text preservation (${(preservationRate * 100).toFixed(1)}%)`);
      }
    }
    
    console.log(`🔄 Epoch ${epoch} (${stage}) completed:`, result.length, 'messages');
    return result;
    
  } catch (parseError) {
    console.error(`❌ Epoch ${epoch} (${stage}) failed:`, parseError);
    
    // Fallback: return input as single message
    if (epoch === 1) {
      return [{
        id: Date.now().toString(),
        text: input,
        isUser: true,
        timestamp: new Date().toISOString()
      }];
    } else {
      // For later epochs, try to parse the input as JSON
      try {
        return JSON.parse(input);
      } catch {
        return [{
          id: Date.now().toString(),
          text: input,
          isUser: true,
          timestamp: new Date().toISOString()
        }];
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullText, studentName } = body;

    if (!fullText || typeof fullText !== 'string') {
      console.log('❌ Validation failed - fullText required');
      return NextResponse.json(
        { error: 'Full text is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('🧹 Processing transcript:', fullText.length, 'chars for', studentName);

    // Epoch 1: Initial splitting and labeling
    console.log('🔄 Epoch 1: Splitting messages...');
    let epoch1Result = await processEpoch(fullText, studentName, 1, 'initial_parsing');
    
    // Epoch 2: Re-splitting and re-labeling
    console.log('🔄 Epoch 2: Re-splitting messages...');
    let epoch2Result = await processEpoch(JSON.stringify(epoch1Result), studentName, 2, 'refinement');
    
    // Epoch 3: Final splitting and labeling
    console.log('🔄 Epoch 3: Final splitting...');
    let formattedTranscript = await processEpoch(JSON.stringify(epoch2Result), studentName, 3, 'final_polish');
    
    console.log('🧹 Successfully split into', formattedTranscript.length, 'messages through 3 epochs');

    return NextResponse.json({ 
      success: true,
      transcript: formattedTranscript,
      originalLength: fullText.length,
      formattedLength: formattedTranscript.length
    });

  } catch (error) {
    console.error('Error processing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
}
