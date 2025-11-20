import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import eduComposeLogo from "../assets/EduCompose.png";

interface HeaderPublicProps {
  onLoginClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"hero" | "about">("hero");

  useEffect(() => {
    const heroElement = document.getElementById("hero");
    const challengeElement = document.getElementById("challenge");

    if (!heroElement || !challengeElement) return;

    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -50% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.id === "hero") {
            setActiveSection("hero");
          } else if (entry.target.id === "challenge") {
            setActiveSection("about");
          }
        }
      });
    }, observerOptions);

    observer.observe(heroElement);
    observer.observe(challengeElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (sectionId === "hero") {
      // Scroll to the very top of the page
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsMenuOpen(false);
  };

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
          {activeSection === "about" && (
            <button
              onClick={() => scrollToSection("hero")}
              className='text-neutral-500 hover:text-primary-100 transition-colors font-medium'
            >
              Home
            </button>
          )}
          {activeSection === "hero" && (
            <button
              onClick={() => scrollToSection("challenge")}
              className='text-neutral-500 hover:text-primary-100 transition-colors font-medium'
            >
              About
            </button>
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
          className='md:hidden p-2 transition-transform duration-300 hover:scale-110'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className='w-6 h-6 text-gray-600 transition-opacity duration-300' />
          ) : (
            <Menu className='w-6 h-6 text-gray-600 transition-opacity duration-300' />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className='px-4 py-4 space-y-4'>
          {activeSection === "about" && (
            <button
              onClick={() => scrollToSection("hero")}
              className={`block w-full text-center text-gray-600 hover:text-primary transition-opacity duration-300 font-medium py-2 ${
                isMenuOpen ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: isMenuOpen ? "100ms" : "0ms" }}
            >
              Home
            </button>
          )}
          {activeSection === "hero" && (
            <button
              onClick={() => scrollToSection("challenge")}
              className={`block w-full text-center text-gray-600 hover:text-primary transition-opacity duration-300 font-medium py-2 ${
                isMenuOpen ? "opacity-100" : "opacity-0"
              }`}
              style={{ transitionDelay: isMenuOpen ? "100ms" : "0ms" }}
            >
              About
            </button>
          )}

          <button
            type='button'
            onClick={(e) => {
              onLoginClick?.(e);
              setIsMenuOpen(false);
            }}
            className={`w-full bg-primary-200 text-white font-semibold px-6 py-3 rounded-full transition-opacity duration-300 hover:bg-primary-100 hover:shadow-lg ${
              isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: isMenuOpen ? "200ms" : "0ms" }}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderPublic;
