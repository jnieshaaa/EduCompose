import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import eduComposeLogo from "../assets/EduCompose.png";
import { useAuth } from "../contexts/AuthContext";

interface HeaderPublicProps {
  onLoginClick?: () => void;
}

/** Sections we scroll to from the public header (must match ids on LandingPage). */
const LANDING_SCROLL_IDS = ["hero", "challenge", "solution", "tech"] as const;
type LandingScrollId = (typeof LANDING_SCROLL_IDS)[number];

const NAV_ITEMS: { id: LandingScrollId; label: string }[] = [
  { id: "hero", label: "Home" },
  { id: "challenge", label: "Mission" },
  { id: "solution", label: "Platform" },
  { id: "tech", label: "Technology" },
];

const SCROLL_DELTA = 10;

const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<LandingScrollId>("hero");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [spacerHeight, setSpacerHeight] = useState(72);
  const [logoShine, setLogoShine] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const lastScrollY = useRef(0);
  const headerShellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    lastScrollY.current = window.scrollY;
  }, []);

  // Trigger shine animation on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoShine(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Scroll progress + hide on scroll down / show on scroll up (fixed header)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);

      if (isMenuOpen) {
        setHeaderVisible(true);
        lastScrollY.current = scrollTop;
        return;
      }

      const delta = scrollTop - lastScrollY.current;
      if (scrollTop < 56) {
        setHeaderVisible(true);
      } else if (delta > SCROLL_DELTA) {
        setHeaderVisible(false);
      } else if (delta < -SCROLL_DELTA) {
        setHeaderVisible(true);
      }
      lastScrollY.current = scrollTop;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  // Scroll spy: highlight the section whose top we've passed (all nav links always visible).
  useEffect(() => {
    const HEADER_OFFSET = 96;

    const updateActiveFromScroll = () => {
      const y = window.scrollY + HEADER_OFFSET;
      let current: LandingScrollId = "hero";
      for (const id of LANDING_SCROLL_IDS) {
        const el = document.getElementById(id);
        if (el && y >= el.offsetTop - 24) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    updateActiveFromScroll();
    window.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll);
    return () => {
      window.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, []);

  // Spacer matches fixed header height (toolbar + open mobile menu) so content doesn’t jump
  useEffect(() => {
    const el = headerShellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSpacerHeight(el.offsetHeight);
    });
    ro.observe(el);
    setSpacerHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [isMenuOpen]);

  const scrollToSection = (sectionId: LandingScrollId) => {
    setLogoShine(true);
    if (sectionId === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsMenuOpen(false);
  };

  const goToWorkspace = () => {
    if (!isAuthenticated) {
      if (onLoginClick) onLoginClick();
      else navigate("/");
      return;
    }
    const role = user?.role?.toLowerCase();
    if (role === "student") navigate("/Student/Dashboard");
    else if (role === "admin") navigate("/Admin/Dashboard");
    else navigate("/Teacher/Dashboard");
  };

  const showHeader = headerVisible || isMenuOpen;

  return (
    <>
      <div
        ref={headerShellRef}
        className={`fixed top-0 left-0 right-0 z-50 pr-[calc(100vw-100%)] border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <header className="relative">
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

        {/* Desktop Navigation — every link always visible; active state follows scroll */}
        <nav className='hidden md:flex items-center gap-1 lg:gap-2'>
          {NAV_ITEMS.map(({ id, label }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type='button'
                onClick={() => scrollToSection(id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary-200 bg-primary-200/10"
                    : "text-neutral-600 hover:text-primary-200 hover:bg-neutral-50"
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            type='button'
            onClick={goToWorkspace}
            className='ml-2 lg:ml-4 bg-primary-200 text-white font-semibold px-5 py-2 rounded-rd text-sm transition-all duration-300 hover:bg-primary-100 hover:shadow-lg'
          >
            {isAuthenticated ? "Open workspace" : "Sign in"}
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
        <div className='px-4 py-4 space-y-1'>
          {NAV_ITEMS.map(({ id, label }, i) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type='button'
                onClick={() => scrollToSection(id)}
                className={`block w-full text-left font-medium py-3 px-2 rounded-lg transition-opacity duration-300 ${
                  isActive ? "text-primary-200 bg-primary-200/10" : "text-gray-700 hover:bg-neutral-50"
                } ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: isMenuOpen ? `${80 + i * 40}ms` : "0ms" }}
              >
                {label}
              </button>
            );
          })}
          <button
            type='button'
            onClick={() => {
              goToWorkspace();
              setIsMenuOpen(false);
            }}
            className={`w-full mt-2 bg-primary-200 text-white font-semibold px-6 py-3 rounded-rd transition-opacity duration-300 hover:bg-primary-100 hover:shadow-lg ${
              isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: isMenuOpen ? "280ms" : "0ms" }}
          >
            {isAuthenticated ? "Open workspace" : "Sign in"}
          </button>
        </div>
      </div>

      {/* Scroll progress bar */}
      <div className='absolute top-0 left-0 w-full h-[2px] bg-gray-100 pointer-events-none'>
        <motion.div
          className='h-full bg-gradient-to-r from-primary-200 to-primary-100'
          style={{ width: `${scrollProgress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>
        </header>
      </div>
      <div
        aria-hidden
        className="shrink-0"
        style={{ height: spacerHeight }}
      />
    </>
  );
};

export default HeaderPublic;
