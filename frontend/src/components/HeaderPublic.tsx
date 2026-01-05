import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import eduComposeLogo from "../assets/EduCompose.png";
import { useAuth } from "../contexts/AuthContext";

interface HeaderPublicProps {
  onLoginClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"hero" | "about">("hero");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [logoShine, setLogoShine] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Trigger shine animation on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoShine(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    // Trigger shine animation
    setLogoShine(true);

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
          className='flex items-center space-x-3 group cursor-default relative overflow-hidden'
        >
          <div
            className={`absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/60 to-transparent transform -translate-x-full z-20 ${
              logoShine ? "animate-shine" : ""
            } group-hover:animate-shine`}
            onAnimationEnd={() => setLogoShine(false)}
          ></div>
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

          {/* Get Started button comment muna sabi ni Junie Pogi */}
          <button
            type='button'
            onClick={(e) => {
              if (isAuthenticated) {
                navigate("/Teacher/Dashboard");
              } else {
                onLoginClick?.(e);
              }
            }}
            className='bg-primary-200 text-white font-semibold px-6 py-2 rounded-rd transition-all duration-300 transform hover:bg-primary-100 hover:shadow-lg'
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
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
              if (isAuthenticated) {
                navigate("/Teacher/Dashboard");
              } else {
                onLoginClick?.(e);
              }
              setIsMenuOpen(false);
            }}
            className={`w-full bg-primary-200 text-white font-semibold px-6 py-3 rounded-rd transition-opacity duration-300 hover:bg-primary-100 hover:shadow-lg ${
              isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: isMenuOpen ? "200ms" : "0ms" }}
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </button>
        </div>
      </div>

      {/* Scroll progress bar */}
      <div className='absolute top-0 left-0 w-full h-[2px] bg-gray-100'>
        <motion.div
          className='h-full bg-gradient-to-r from-primary-200 to-primary-100'
          style={{ width: `${scrollProgress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>
    </header>
  );
};

export default HeaderPublic;
