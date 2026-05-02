import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import eduComposeLogo from "../../assets/EduCompose.png";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderPublicProps {
  onLoginClick?: () => void;
}

/** Sections we scroll to from the public header (must match ids on LandingPage). */
const LANDING_SCROLL_IDS = ["hero", "challenge", "solution", "tech", "visualization", "impact"] as const;
type LandingScrollId = (typeof LANDING_SCROLL_IDS)[number];

const NAV_ITEMS: { id: LandingScrollId; label: string }[] = [
  { id: "hero", label: "Home" },
  { id: "challenge", label: "Mission" },
  { id: "solution", label: "Platform" },
  { id: "tech", label: "Technology" },
  { id: "visualization", label: "Analytics" },
  { id: "impact", label: "Impact" },
];



const HeaderPublic: React.FC<HeaderPublicProps> = ({ onLoginClick }) => {
  const [spacerHeight, setSpacerHeight] = useState(72);
  const [logoShine, setLogoShine] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const headerShellRef = useRef<HTMLDivElement>(null);
  
  // Trigger shine animation on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoShine(true);
    }, 500);
    return () => clearTimeout(timer);
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
  }, []);

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

  // Removed unused showHeader check

  return (
    <>
    <div
      ref={headerShellRef}
      className="fixed top-0 left-0 right-0 z-50 pr-[calc(100vw-100%)] border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm transition-transform duration-300 ease-out translate-y-0"
    >
        <header className="relative">
      <div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
        {/* Logo - Left aligned */}
        <div className="flex-1 flex justify-start">
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
              <span className='text-2xl font-bold bg-primary bg-clip-text text-transparent cursor-default'>
                Edu
              </span>
              <span className='text-2xl font-bold bg-slate-600 bg-clip-text text-transparent cursor-default'>
                Compose
              </span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation - Centered links */}
        <nav className='hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-2'>
          {NAV_ITEMS.map(({ id, label }) => {
            return (
              <button
                key={id}
                type='button'
                onClick={() => scrollToSection(id)}
                className="px-3 py-2 rounded-lg text-[10px] lg:text-[11px] font-medium uppercase tracking-wider transition-colors text-slate-500 hover:text-primary hover:bg-slate-50"
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right side - Sign in button (Visible on both mobile and desktop) */}
        <div className="flex-1 flex justify-end">
          <button
            type='button'
            onClick={goToWorkspace}
            className='bg-primary text-white font-bold px-5 py-2 rounded-full text-xs md:text-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 whitespace-nowrap'
          >
            {isAuthenticated ? "Open workspace" : "Sign in"}
          </button>
        </div>
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
