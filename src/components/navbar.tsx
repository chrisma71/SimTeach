'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth0 } from '@/contexts/Auth0Context';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth0();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/review', label: 'History' }
  ];

  if (isLoading) {
    return (
      <nav className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 group">
                <span className="text-xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  <span className="font-bold">Sim</span>Teach AI
                </span>
              </Link>
            </div>
            
            {/* Center - Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded-lg"></div>
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded-lg"></div>
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded-lg"></div>
            </div>
            
            {/* Right side - Loading state */}
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 h-8 w-32 rounded-lg"></div>
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded-lg"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              
              <span className="text-xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                <span className="font-bold">Sim</span>Teach AI
              </span>
            </Link>
          </div>
          
          {/* Center - Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === item.href
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:shadow-sm'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* Right side - Welcome message and logout */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Welcome, <span className="text-gray-900 font-semibold">{user.username}</span>
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-all duration-200 hover:shadow-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
