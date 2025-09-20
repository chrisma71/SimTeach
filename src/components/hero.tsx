"use client";
import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";
import { students, Student } from "@/lib/students";
import { useProfiles } from "@/hooks/useProfiles";
import { useRouter } from "next/navigation";

export const HeroParallax = () => {
  const firstRow = students.slice(0, 4);
  const secondRow = students.slice(4, 7);
  const thirdRow = students.slice(7, 10);
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 100]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="h-[300vh] py-40 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
      style={{ backgroundColor: '#e4e5f1' }}
    >
      <Header />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className=""
      >
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20 mb-20">
          {firstRow.map((student) => (
            <StudentCard
              student={student}
              translate={translateX}
              key={student.id}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row  mb-20 space-x-20 ">
          {secondRow.map((student) => (
            <StudentCard
              student={student}
              translate={translateXReverse}
              key={student.id}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20">
          {thirdRow.map((student) => (
            <StudentCard
              student={student}
              translate={translateX}
              key={student.id}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = () => {
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0 z-10">
      <h1 className="text-2xl md:text-7xl font-bold dark:text-white relative z-20">
        AI Student simulations <br />for better teacher training
      </h1>
      <p className="max-w-2xl text-base md:text-xl mt-8 dark:text-neutral-200 relative z-20">
        Speak directly with avatars to practice teaching skills, explore different scenarios, and get instant feedback.
      </p>
    </div>
  );
};

export const StudentCard = ({
  student,
  translate,
}: {
  student: Student;
  translate: MotionValue<number>;
}) => {
  const { setActiveProfile } = useProfiles();
  const router = useRouter();

  const handleStudentClick = () => {
    setActiveProfile(student);
    router.push('/talk');
  };

  return (
    <motion.div
      style={{
        x: translate,
      }}
      whileHover={{
        y: -20,
      }}
      key={student.id}
      className="group/student h-96 w-[30rem] relative shrink-0 cursor-pointer"
      onClick={handleStudentClick}
    >
      <div className="block group-hover/student:shadow-2xl transition-all duration-300 rounded-lg overflow-hidden">
        <img
          src={student.thumbnail}
          height="600"
          width="600"
          className="object-cover object-center absolute h-full w-full inset-0 transition-transform duration-300 group-hover/student:scale-105"
          alt={student.name}
        />
      </div>
      
      {/* Overlay with student info */}
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/student:opacity-90 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none transition-opacity duration-300 rounded-lg"></div>
      
      {/* Student details on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white opacity-0 group-hover/student:opacity-100 transition-opacity duration-300 pointer-events-none">
        <h2 className="text-2xl font-bold mb-2">{student.name}</h2>
        <p className="text-sm mb-2">Grade {student.grade} • {student.subject}</p>
        <p className="text-sm mb-2">Average: {student.averageGrade}</p>
        <p className="text-xs text-gray-300 mb-3">{student.description}</p>
        
        <div className="mb-2">
          <p className="text-xs font-semibold text-red-300">Struggles with:</p>
          <p className="text-xs">{student.struggles.join(', ')}</p>
        </div>
        
        <div className="mb-3">
          <p className="text-xs font-semibold text-green-300">Strengths:</p>
          <p className="text-xs">{student.strengths.join(', ')}</p>
        </div>
        
        <div className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium text-center pointer-events-auto transition-colors">
          Start Tutoring Session
        </div>
      </div>
    </motion.div>
  );
};
