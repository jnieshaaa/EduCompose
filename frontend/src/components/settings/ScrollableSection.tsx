// Reusable Scrollable Section Component

import React from "react";

interface ScrollableSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

export const ScrollableSection: React.FC<ScrollableSectionProps> = ({
  id,
  title,
  icon: Icon,
  children,
}) => (
  <div id={id} className="bg-white border border-neutral-100 rounded-xl scroll-mt-20 overflow-hidden">
    <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
      <Icon className="w-4 h-4 text-neutral-400" />
      <h2 className="text-sm font-bold text-neutral-800">{title}</h2>
    </div>
    <div className="p-5">{children}</div>
  </div>
);
