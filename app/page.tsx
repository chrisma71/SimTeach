import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">
            AI Tutoring App
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Interactive AI-powered tutoring sessions with virtual students
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Practice Teaching</h3>
            <p className="text-gray-600">
              Hone your tutoring skills with AI-powered virtual students who respond realistically
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Diverse Students</h3>
            <p className="text-gray-600">
              Work with students of different ages, subjects, and learning challenges
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/talk"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-full transition-all duration-200 transform hover:scale-105"
          >
            Start Tutoring Session
          </Link>
          
          <Link 
            href="/about"
            className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-8 rounded-full border-2 border-gray-300 transition-all duration-200"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>Powered by Tavus AI • Built for PennHacks</p>
        </div>
      </div>
    </main>
  );
}
