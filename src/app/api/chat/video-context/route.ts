import { NextRequest, NextResponse } from 'next/server';

// Mock Google Vision API for now - we'll implement the real one after testing
const mockAnalyzeImage = async (imageData: string) => {
  console.log('🔍 ===== MOCK VISION API ANALYSIS =====');
  console.log('🔍 Image data length:', imageData.length);
  console.log('🔍 Image data preview:', imageData.substring(0, 50) + '...');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate realistic mock descriptions based on common tutoring scenarios
  const mockDescriptions = [
    'Student is looking at the screen with focused attention',
    'Student is pointing at something on the screen with their right hand',
    'Student is writing on paper with a pencil',
    'Student is gesturing with both hands while explaining',
    'Student is looking confused, scratching their head',
    'Student is showing a calculator on their desk',
    'Student is demonstrating a math problem with their fingers',
    'Student is looking down at their notebook',
    'Student is raising their hand as if asking a question',
    'Student is looking at a textbook or worksheet',
    'Student is using their finger to trace something on paper',
    'Student is looking up thoughtfully, thinking',
    'Student is pointing at a specific part of their work',
    'Student is holding up a piece of paper to show something',
    'Student is looking at their phone or device'
  ];
  
  // Randomly select a description
  const randomIndex = Math.floor(Math.random() * mockDescriptions.length);
  const description = mockDescriptions[randomIndex];
  
  console.log('🔍 Mock analysis result:', description);
  
  return {
    description,
    confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
    objects: ['person', 'hand', 'paper', 'screen'],
    actions: ['looking', 'pointing', 'writing', 'gesturing']
  };
};

// Real Google Vision API implementation (commented out for now)
const realAnalyzeImage = async (imageData: string) => {
  console.log('🔍 ===== REAL VISION API ANALYSIS =====');
  
  try {
    // Import Google Cloud Vision API
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    const client = new ImageAnnotatorClient();
    
    // Remove data:image prefix and convert to buffer
    const base64Data = imageData.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('🔍 Image buffer size:', imageBuffer.length, 'bytes');
    
    // Analyze the image
    const [result] = await client.annotateImage({
      image: { content: imageBuffer },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 10 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'TEXT_DETECTION', maxResults: 5 },
        { type: 'FACE_DETECTION', maxResults: 5 }
      ]
    });
    
    console.log('🔍 Vision API result:', result);
    
    // Generate description from results
    const description = generateContextDescription(result);
    
    return {
      description,
      confidence: 0.9,
      objects: result.labelAnnotations?.map(label => label.description) || [],
      actions: extractActions(result)
    };
    
  } catch (error) {
    console.error('🔍 Vision API error:', error);
    throw new Error('Failed to analyze image with Vision API');
  }
};

const generateContextDescription = (result: any): string => {
  console.log('🔍 Generating context description from Vision API result');
  
  const labels = result.labelAnnotations || [];
  const objects = result.localizedObjectAnnotations || [];
  const faces = result.faceAnnotations || [];
  const text = result.textAnnotations || [];
  
  // Check for common tutoring scenarios
  if (faces.length > 0) {
    const face = faces[0];
    if (face.joyLikelihood === 'VERY_LIKELY' || face.joyLikelihood === 'LIKELY') {
      return 'Student appears happy and engaged';
    } else if (face.sorrowLikelihood === 'VERY_LIKELY' || face.sorrowLikelihood === 'LIKELY') {
      return 'Student looks confused or frustrated';
    } else if (face.angerLikelihood === 'VERY_LIKELY' || face.angerLikelihood === 'LIKELY') {
      return 'Student appears frustrated or angry';
    }
  }
  
  // Check for objects
  const objectNames = objects.map(obj => obj.name.toLowerCase());
  if (objectNames.includes('person')) {
    if (objectNames.includes('hand') || objectNames.includes('finger')) {
      return 'Student is gesturing or pointing with their hand';
    }
    if (objectNames.includes('paper') || objectNames.includes('notebook')) {
      return 'Student is working with paper or notebook';
    }
    if (objectNames.includes('calculator')) {
      return 'Student is using a calculator';
    }
    if (objectNames.includes('phone') || objectNames.includes('mobile phone')) {
      return 'Student is looking at their phone';
    }
  }
  
  // Check for text
  if (text.length > 0) {
    return 'Student is looking at text or written material';
  }
  
  // Fallback to top labels
  if (labels.length > 0) {
    const topLabel = labels[0].description.toLowerCase();
    if (topLabel.includes('person')) {
      return 'Student is visible in the frame';
    }
  }
  
  return 'Student is present but activity is unclear';
};

const extractActions = (result: any): string[] => {
  const actions = [];
  const labels = result.labelAnnotations || [];
  
  for (const label of labels) {
    const description = label.description.toLowerCase();
    if (description.includes('pointing') || description.includes('gesturing')) {
      actions.push('pointing');
    }
    if (description.includes('writing') || description.includes('holding pen')) {
      actions.push('writing');
    }
    if (description.includes('looking') || description.includes('reading')) {
      actions.push('looking');
    }
    if (description.includes('talking') || description.includes('speaking')) {
      actions.push('talking');
    }
  }
  
  return [...new Set(actions)]; // Remove duplicates
};

export async function POST(request: NextRequest) {
  console.log('🔍 ===== VIDEO CONTEXT API CALLED =====');
  
  try {
    const { imageData, sessionId, studentId, timestamp } = await request.json();
    
    console.log('🔍 Request data:', {
      imageDataLength: imageData?.length || 0,
      sessionId,
      studentId,
      timestamp
    });
    
    if (!imageData) {
      console.error('🔍 No image data provided');
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }
    
    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      console.error('🔍 Invalid image data format');
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Starting image analysis...');
    
    // Use mock analysis for now - switch to realAnalyzeImage when ready
    const analysisResult = await mockAnalyzeImage(imageData);
    
    console.log('🔍 Analysis complete:', analysisResult);
    
    return NextResponse.json({
      success: true,
      description: analysisResult.description,
      confidence: analysisResult.confidence,
      objects: analysisResult.objects,
      actions: analysisResult.actions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔍 Video context API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze video context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
