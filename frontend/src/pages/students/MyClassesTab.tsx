import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { BookOpen, ChevronRight, Users, Calendar } from 'lucide-react';

// Mock classes data
const CLASSES = [
  { 
    id: 1, 
    code: "PC 4121", 
    name: "CS Thesis 1", 
    instructor: "Prof. Smith",
    term: "1st Semester A.Y. 2025-2026",
    section: "BSCS-DS 4B"
  },
  { 
    id: 2, 
    code: "PC 4122", 
    name: "CS Thesis 1", 
    instructor: "Joselle Banocnoc",
    term: "1st Semester A.Y. 2025-2026",
    section: "BSCS-DS 4B"
  },
  { 
    id: 3, 
    code: "TC 4103", 
    name: "Advanced Programming", 
    instructor: "Prof. Johnson",
    term: "1st Semester A.Y. 2025-2026",
    section: "BSCS-DS 4B"
  },
];

export function MyClassesTab() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">My Classes</h1>
        <p className="text-neutral-600">Select a class to view activities and assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CLASSES.map((classItem) => (
          <Card 
            key={classItem.id}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => navigate(`/Student/Classes/${classItem.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-primary transition-colors" />
            </div>
            
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              #{classItem.id} - {classItem.code}
            </h3>
            <p className="text-sm text-neutral-600 mb-3">{classItem.name}</p>
            
            <div className="space-y-2 pt-3 border-t border-neutral-200">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Users className="w-4 h-4" />
                <span>{classItem.instructor}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Calendar className="w-4 h-4" />
                <span>{classItem.term}</span>
              </div>
              <div className="text-xs text-neutral-400 mt-2">
                {classItem.section}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

