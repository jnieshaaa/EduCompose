// Reusable Scrollable Section Component

import React from "react";
import Card from "../ui/Card";

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
  <Card id={id} className="p-6 scroll-mt-20">
    <h2 className="text-xl text-neutral-900 mb-4 flex items-center border-b pb-2">
      <Icon className="w-5 h-5 mr-2" />
      {title}
    </h2>
    {children}
  </Card>
);
