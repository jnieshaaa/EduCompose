import React, { useState } from "react"; // <-- ✅ add useState here
import { Link } from "react-router-dom";
import eduComposeLogo from "../assets/EduCompose.png";

interface HeaderPublicProps {
  onLoginClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  // ✅ define the shine state
  const [shineActive, setShineActive] = useState(false);

  return (
    <header className='bg-white shadow-md sticky top-0 z-10'>
      <div className='container mx-auto px-4 py-3 flex items-center justify-between'>
        {/* Logo and Site Title */}
        <Link
          to='/'
          className='relative flex items-center space-x-2 group overflow-hidden'
          onMouseEnter={() => setShineActive(true)}
        >
          {/* 🔥 Unified shine covering logo + text */}
          <span
            className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient pointer-events-none z-20 ${
              shineActive ? "animate-shine" : ""
            }`}
            style={{
              transform: "translateX(-150%)", // start far left
            }}
            onAnimationEnd={() => setShineActive(false)}
          ></span>

          {/* Logo + Text */}
          <div className='flex items-center space-x-2 z-10 relative'>
            <img
              src={eduComposeLogo}
              alt='EduCompose Logo'
              className='h-10 w-10'
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src =
                  "https://placehold.co/32x32/3b82f6/ffffff?text=Logo";
              }}
            />
            <span className='text-2xl font-bold'>
              <span className='text-neutral-600'>Edu</span>
              <span className='text-primary'>Compose</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav>
          <ul className='flex space-x-6 items-center'>
            <li>
              <Link
                to='/'
                className='text-neutral-700 hover:text-primary-200 transition-colors font-medium'
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to='/tools'
                className='text-neutral-700 hover:text-primary-200 transition-colors font-medium'
              >
                Tools
              </Link>
            </li>
            <li>
              <button
                type='button'
                onClick={onLoginClick}
                className='px-4 py-2 rounded-lg text-white bg-primary font-semibold hover:bg-primary-300 transition-colors shadow-md'
              >
                Login
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default HeaderPublic;
