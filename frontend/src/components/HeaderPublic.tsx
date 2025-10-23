import React from "react";
import { Link } from "react-router-dom";
import eduComposeLogo from "../assets/EduCompose.png";

interface HeaderPublicProps {
  onLoginClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and Site Title */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src={eduComposeLogo}
            alt="EduCompose Logo"
            className="h-8 w-8"
            // Fallback for image loading issues
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "https://placehold.co/32x32/3b82f6/ffffff?text=Logo"; // Placeholder text for logo
            }}
          />
          <span className="text-2xl font-bold text-primary-500">
            EduCompose
          </span>
        </Link>

        {/* Navigation Links */}
        <nav>
          <ul className="flex space-x-6 items-center">
            <li>
              <Link
                to="/"
                className="text-neutral-700 hover:text-primary-500 transition-colors font-medium"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/tools"
                className="text-neutral-700 hover:text-primary-500 transition-colors font-medium"
              >
                Tools
              </Link>
            </li>
            <li>
              {/* This button triggers the modal via the onLoginClick prop */}
              <button
                type="button"
                onClick={onLoginClick}
                className="px-4 py-2 rounded-lg text-white bg-primary font-semibold hover:bg-primary-600 transition-colors shadow-md"
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
