import React from "react";
import { ArrowUp, Building2, MapPin } from "lucide-react";
import logo from "../../assets/EduCompose.png";

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-neutral-900 text-white pt-20 pb-10 overflow-hidden mt-20">
      {/* Background Pattern/Texture - Using system-related cyan/blue dots */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#0791B2_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      <div className="container mx-auto px-6 lg:px-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Column 1: Logo & About (6 cols wide on larger screens) */}
          <div className="md:col-span-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-800/50 rounded-lg border border-primary/20">
                <img src={logo} alt="EduCompose Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white mt-1">EduCompose</h3>
                <p className="text-[10px] text-primary-50 font-bold tracking-[0.2em] uppercase -mt-1">
                  AI-powered writing analytics
                </p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-sm md:text-base max-w-md">
              EduCompose helps Laguna University students, faculty, and researchers 
              analyze, organize, and understand academic writing in one smarter workspace.
            </p>
          </div>

          {/* Column 2: Quick Links (3 cols wide) */}
          <div className="md:col-span-3 space-y-6">
            <h4 className="text-[11px] font-bold tracking-[0.3em] text-primary-50 uppercase">
              Quick Links
            </h4>
            <ul className="space-y-4">
              {["Home", "About", "Features"].map((link) => (
                <li key={link}>
                  <a 
                    href={`#${link.toLowerCase() === 'features' ? 'solution' : link.toLowerCase() === 'about' ? 'challenge' : 'hero'}`} 
                    className="text-slate-400 hover:text-white transition-colors duration-300 text-sm font-medium"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Connect With Us (3 cols wide) */}
          <div className="md:col-span-3 space-y-6">
            <h4 className="text-[11px] font-bold tracking-[0.3em] text-primary-50 uppercase">
              Connect With Us
            </h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary-50 shrink-0 mt-0.5" />
                <span className="text-slate-400 text-sm leading-relaxed">
                  Laguna Sports Complex, Brgy. Bubukal, <br />
                  Santa Cruz, Laguna
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Building2 size={18} className="text-primary-50 shrink-0 mt-0.5" />
                <span className="text-slate-400 text-sm leading-relaxed">
                  Laguna University | Santa Cruz
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-[1px] w-full bg-white/10 mb-8"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-center items-center">
          <p className="text-slate-500 text-[11px] md:text-xs text-center">
            &copy; 2025 EduCompose. AI-powered writing analytics for Laguna University.
          </p>
        </div>
      </div>

      {/* Floating Scroll to Top button using system colors */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 p-3 rounded-full bg-slate-800 text-white hover:bg-primary transition-all duration-300 shadow-2xl z-[99] border border-white/10 group"
      >
        <ArrowUp size={20} className="group-hover:-translate-y-1 transition-transform" />
      </button>
    </footer>
  );
};

export default Footer;
