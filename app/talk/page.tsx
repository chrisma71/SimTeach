'use client';

import { useState } from 'react';
import { students, Student } from '@/lib/students';
import TavusVideoChat from '@/components/TavusVideoChat';

export default function TalkPage() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleStudentSelect = (student: Student) => {
    console.log('Student selected:', student.name);
    setSelectedStudent(student);
  };

  const handleCallEnd = () => {
    console.log('Call ended, going back to student selection');
    setSelectedStudent(null);
  };

  // Show the TavusVideoChat component when a student is selected
  if (selectedStudent) {
    return (
      <TavusVideoChat
        student={selectedStudent}
        onCallEnd={handleCallEnd}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Choose Your Student
          </h1>
          <p className="text-xl text-gray-600">
            Select a virtual student to practice your tutoring skills
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 cursor-pointer transform hover:scale-105"
              onClick={() => {
                console.log('Clicking student:', student.name);
                handleStudentSelect(student);
              }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {student.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-sm text-gray-500">Grade {student.grade} • Age {student.age}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Subject:</span>
                  <span className="text-sm text-blue-600 font-semibold">{student.subject}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Average:</span>
                  <span className="text-sm text-green-600 font-semibold">{student.averageGrade}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {student.description}
              </p>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-1">Personality:</p>
                <p className="text-xs text-gray-600">{student.personality}</p>
              </div>

              <div className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-center">
                Start Session with {student.name.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
