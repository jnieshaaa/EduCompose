import React from 'react';

interface OfficialReportHeaderProps {
  title: string;
  subtitle?: string;
  verificationId?: string;
  logoUrl?: string;
  className?: string;
}

/**
 * A premium reusable header component for official transcripts and reports.
 */
const OfficialReportHeader: React.FC<OfficialReportHeaderProps> = ({
  title,
  logoUrl = "/educompose_logo_premium_1777167464709.png",
  className = ""
}) => {
  return (
    <div className={`flex items-center justify-between border-b-2 border-neutral-900 pb-6 mb-8 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center overflow-hidden shadow-md">
          <img 
            src={logoUrl} 
            alt="EduCompose Logo" 
            className="w-8 h-8 object-contain invert" 
          />
        </div>
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tighter">EduCompose</h2>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{title || "Official Report"}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Document Integrity Verified</p>
      </div>
    </div>
  );
};

export default OfficialReportHeader;
