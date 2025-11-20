import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import eduComposeLogo from "../assets/EduCompose.png";

interface HeaderPublicProps {
  onLoginClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isAboutPage = location.pathname === "/About";

  return (
    <header className='bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-100 pr-[calc(100vw-100%)]'>
      <div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
        {/* Logo and Site Title */}
        <Link
          to='/'
          className='flex items-center space-x-3 group cursor-default'
        >
          <div className='relative cursor-default'>
            <img
              src={eduComposeLogo}
              alt='EduCompose Logo'
              className='h-8 w-8'
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "https://placehold.co/32x32/8b5cf6/ffffff?text=E";
              }}
            />
          </div>
          <span>
            <span className='text-2xl font-bold bg-primary-200 bg-clip-text text-transparent cursor-default'>
              Edu
            </span>
            <span className='text-2xl font-bold bg-neutral-600 bg-clip-text text-transparent cursor-default'>
              Compose
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className='hidden md:flex items-center space-x-8'>
          {isAboutPage ? (
            <Link
              to='/'
              className='text-neutral-500 hover:text-primary-100 transition-colors font-medium'
            >
              Home
            </Link>
          ) : (
            <Link
              to='/About'
              className='text-neutral-500 hover:text-primary-100 transition-colors font-medium'
            >
              About
            </Link>
          )}
          <button
            type='button'
            onClick={onLoginClick}
            className='bg-primary-200 text-white font-semibold px-6 py-2 rounded-full transition-all duration-300 transform hover:bg-primary-100 hover:shadow-lg'
          >
            Get Started
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className='md:hidden p-2'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className='w-6 h-6 text-gray-600' />
          ) : (
            <Menu className='w-6 h-6 text-gray-600' />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className='md:hidden bg-white border-t border-gray-100'>
          <div className='px-4 py-4 space-y-4'>
            {isAboutPage ? (
              <Link
                to='/'
                className='block text-gray-600 hover:text-purple-600 transition-colors font-medium py-2'
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
            ) : (
              <Link
                to='/About'
                className='block text-gray-600 hover:text-purple-600 transition-colors font-medium py-2'
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
            )}
            <Link
              to='/features'
              className='block text-gray-600 hover:text-purple-600 transition-colors font-medium py-2'
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              to='/pricing'
              className='block text-gray-600 hover:text-purple-600 transition-colors font-medium py-2'
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <button
              type='button'
              onClick={(e) => {
                onLoginClick?.(e);
                setIsMenuOpen(false);
              }}
              className='w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-300'
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default HeaderPublic;
