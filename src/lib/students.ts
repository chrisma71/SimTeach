export interface Student {
  id: string;
  name: string;
  age: number;
  grade: number;
  subject: string;
  averageGrade: string;
  personality: string;
  struggles: string[];
  strengths: string[];
  thumbnail: string;
  description: string;
}

export const students: Student[] = [
  {
    id: "1",
    name: "Alex Chen",
    age: 14,
    grade: 9,
    subject: "Mathematics",
    averageGrade: "50%",
    personality: "Shy and awkward",
    struggles: ["Exponent laws", "Algebraic equations", "Word problems"],
    strengths: ["Basic arithmetic", "Following instructions"],
    thumbnail: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    description: "A quiet student with autism who struggles with advanced math concepts but shows potential with proper guidance."
  },
  {
    id: "2", 
    name: "Maya Rodriguez",
    age: 15,
    grade: 10,
    subject: "English Literature",
    averageGrade: "65%",
    personality: "Enthusiastic but easily distracted",
    struggles: ["Reading comprehension", "Essay structure", "Grammar"],
    strengths: ["Creative thinking", "Verbal communication"],
    thumbnail: "https://images.unsplash.com/photo-1494790108755-2616c9c1b983?w=400&h=400&fit=crop&crop=face",
    description: "An energetic student who loves stories but needs help organizing her thoughts in writing."
  },
  {
    id: "3",
    name: "Jordan Kim",
    age: 13,
    grade: 8,
    subject: "Science",
    averageGrade: "45%",
    personality: "Anxious and perfectionist", 
    struggles: ["Scientific method", "Lab procedures", "Confidence"],
    strengths: ["Attention to detail", "Memorization"],
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    description: "A careful student who gets overwhelmed by experiments but excels at theoretical concepts."
  },
  {
    id: "4",
    name: "Sam Thompson",
    age: 16,
    grade: 11,
    subject: "History",
    averageGrade: "55%",
    personality: "Rebellious and questioning",
    struggles: ["Memorizing dates", "Essay writing", "Source analysis"],
    strengths: ["Critical thinking", "Debates"],
    thumbnail: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    description: "A challenging student who questions everything but has great analytical potential."
  },
  {
    id: "5",
    name: "Emma Wilson", 
    age: 12,
    grade: 7,
    subject: "Mathematics",
    averageGrade: "70%",
    personality: "Eager but impatient",
    struggles: ["Showing work", "Patience with problems", "Organization"],
    strengths: ["Quick mental math", "Pattern recognition"],
    thumbnail: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    description: "A bright student who rushes through problems and makes careless mistakes."
  },
  {
    id: "6",
    name: "Aiden Park",
    age: 17,
    grade: 12,
    subject: "Physics",
    averageGrade: "40%",
    personality: "Frustrated and giving up easily",
    struggles: ["Mathematical concepts", "Problem solving", "Self-confidence"],
    strengths: ["Conceptual understanding", "Asking questions"],
    thumbnail: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    description: "A senior struggling with physics who needs encouragement and step-by-step guidance."
  },
  {
    id: "7",
    name: "Zoe Martinez",
    age: 14,
    grade: 9,
    subject: "French",
    averageGrade: "60%",
    personality: "Social but self-conscious about accent",
    struggles: ["Pronunciation", "Grammar rules", "Speaking confidence"],
    strengths: ["Vocabulary", "Written work"],
    thumbnail: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face",
    description: "A social student who excels in writing French but is shy about speaking."
  },
  {
    id: "8",
    name: "Marcus Johnson",
    age: 15,
    grade: 10,
    subject: "Chemistry", 
    averageGrade: "48%",
    personality: "Logical but overwhelmed",
    struggles: ["Chemical equations", "Lab safety", "Concentration"],
    strengths: ["Logical reasoning", "Following procedures"],
    thumbnail: "https://images.unsplash.com/photo-1507081323647-4d250478b919?w=400&h=400&fit=crop&crop=face",
    description: "A methodical student who gets overwhelmed by the complexity of chemical reactions."
  },
  {
    id: "9",
    name: "Lily Chang",
    age: 13,
    grade: 8,
    subject: "Art",
    averageGrade: "75%",
    personality: "Creative but lacks technical skills",
    struggles: ["Perspective drawing", "Color theory", "Art history"],
    strengths: ["Creativity", "Imagination"],
    thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
    description: "An imaginative artist who needs help with technical drawing skills."
  },
  {
    id: "10",
    name: "Tyler Brooks",
    age: 16,
    grade: 11,
    subject: "Computer Science",
    averageGrade: "35%",
    personality: "Interested but confused by syntax",
    struggles: ["Programming logic", "Debugging", "Syntax errors"],
    strengths: ["Problem-solving mindset", "Persistence"],
    thumbnail: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=400&fit=crop&crop=face",
    description: "A determined student who loves technology but struggles with programming concepts."
  }
];
