import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  const [activeSection, setActiveSection] = useState<LandingScrollId>("hero");
  const [scrollProgress, setScrollProgress] = useState(0);
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

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type='button'
                onClick={() => scrollToSection(id)}
                className={`px-3 py-2 rounded-lg text-[10px] lg:text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-slate-500 hover:text-primary hover:bg-slate-50"
                }`}
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

      {/* Scroll progress bar */}
      <div className='absolute top-0 left-0 w-full h-[2px] bg-slate-100 pointer-events-none'>
        <motion.div
          className='h-full bg-gradient-to-r from-primary to-cyan-400'
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
