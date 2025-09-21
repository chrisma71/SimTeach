# AI Tutoring Practice Platform

A Next.js application that provides AI-powered tutoring practice sessions using Tavus avatars and real-time speech recognition for transcript generation.

## 🚀 Features

### 🎯 Core Functionality
- **AI Avatar Tutoring**: Practice teaching with AI-powered student avatars using Tavus technology
- **Realistic Interactions**: High-fidelity avatars with natural speech, expressions, and responses
- **Real-time Speech Recognition**: Automatic transcript generation during conversations
- **Live Transcript Panel**: View and edit conversation transcripts in real-time
- **Speaker Correction**: Manually switch message speakers with automatic next-speaker adjustment
- **Session Review**: Comprehensive analysis of teaching sessions with AI feedback
- **Skill Analysis**: Detailed breakdown of teaching skills with scores and recommendations

### 🎨 User Interface
- **Modern Design**: Clean, responsive UI with gradient backgrounds and smooth animations
- **Interactive Transcript**: Live transcript with speaker switching and visual indicators
- **Session Management**: Easy session start/end with duration tracking
- **Review Dashboard**: Comprehensive session analysis with skill breakdowns

### 🎭 Avatar Technology
- **Tavus Integration**: Powered by cutting-edge Tavus AI avatar technology
- **Photorealistic Avatars**: High-quality, lifelike student avatars for immersive practice
- **Natural Conversations**: AI-driven responses that simulate real student interactions
- **Real-time Video**: Live video calls with avatars that respond naturally to your teaching
- **Emotional Intelligence**: Avatars that can express confusion, understanding, and engagement
- **Diverse Student Profiles**: Multiple avatar personalities with different learning styles and subjects

### 🔧 Technical Features
- **Speech Recognition**: Robust speech-to-text with automatic restart and error handling
- **Real-time Updates**: Live transcript updates during conversations
- **State Management**: Proper handling of conversation state and speaker alternation
- **Error Recovery**: Intelligent restart logic for speech recognition failures

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Auth0
- **Database**: MongoDB
- **AI Integration**: Tavus API for avatar conversations
- **Speech Recognition**: Web Speech API
- **State Management**: React Hooks and Context

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB database
- Auth0 account
- Tavus API access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pennhacks
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```


4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

### Starting a Practice Session
1. Navigate to the main page
2. Select a student avatar from the available options
3. Click "Start Practice Session"
4. Wait for the video call to load (Tavus avatar will appear)
5. Begin your teaching practice with the realistic AI student
6. The avatar will respond naturally to your teaching methods and questions

### Using the Live Transcript
1. Click "Live Transcript" during a session
2. View real-time conversation transcription
3. Use "🔄 Switch" buttons to correct speaker assignments
4. The system automatically adjusts the next speaker based on your corrections

### Reviewing Sessions
1. After ending a session, you'll be redirected to the review page
2. View the transcript, skill analysis, and AI feedback
3. Navigate between different analysis tabs
4. Review detailed skill breakdowns and recommendations

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── chat/          # Chat and transcript handling
│   │   ├── tavus/         # Tavus API integration
│   │   └── review/        # Session review endpoints
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Authentication pages
│   ├── review/            # Session review pages
│   └── talk/              # Practice session pages
├── components/            # React components
│   ├── TavusVideoChat.tsx # Main video chat component
│   ├── TavusTalkScreen.tsx
│   └── navbar.tsx
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── types/                 # TypeScript type definitions
```

## 🔧 Key Components

### TavusVideoChat
The main component handling video calls and transcript generation:
- Real-time speech recognition
- Live transcript display
- Speaker correction functionality
- Session management
- Integration with Tavus avatar technology

### Avatar Experience
Immersive teaching practice with AI avatars:
- **Realistic Interactions**: Avatars that look and behave like real students
- **Natural Responses**: AI-powered conversations that adapt to your teaching style
- **Emotional Feedback**: Avatars show understanding, confusion, or engagement
- **Subject-Specific**: Different avatars for different subjects and learning levels
- **Real-time Video**: High-quality video calls with responsive avatars

### Session Review
Comprehensive analysis of teaching sessions:
- Transcript display
- Skill analysis with scores
- AI-generated feedback
- Interactive skill breakdowns

## 🎯 Recent Improvements

### Speech Recognition Enhancements
- **Robust Error Handling**: Improved handling of "aborted" and other recoverable errors
- **Restart Logic**: Unified restart mechanism preventing infinite loops
- **State Management**: Better tracking of recognition state and restart attempts
- **Performance**: Optimized restart delays and error recovery

### Transcript Features
- **Speaker Correction**: Manual speaker switching with automatic next-speaker adjustment
- **Visual Indicators**: Clear marking of manually corrected messages
- **Real-time Updates**: Live transcript updates during conversations
- **Smart Alternation**: Maintains conversation flow after manual corrections

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms
The app can be deployed to any platform that supports Next.js applications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs

---

Built with ❤️ for improving teaching practices through AI technology.