import React, { useState } from 'react';
import { Users, FileText } from 'lucide-react';

interface Section {
  id: string;
  name: string;
  students: number;
  topics: number;
  color: string;
}

const SectionsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const sections: Section[] = [
    {
      id: '1',
      name: 'BSED - English 2A',
      students: 39,
      topics: 6,
      color: 'bg-cyan-600'
    },
    {
      id: '2',
      name: 'BSED 2B',
      students: 37,
      topics: 4,
      color: 'bg-cyan-600'
    },
    {
      id: '3',
      name: 'BSED - English 3A',
      students: 36,
      topics: 5,
      color: 'bg-cyan-600'
    },
    {
      id: '4',
      name: 'BSED 3B',
      students: 36,
      topics: 5,
      color: 'bg-cyan-600'
    }
  ];

  const filteredSections = sections.filter(section =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Sections List</h1>
        
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search Section"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-4">
          {filteredSections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex">
                <div className={`${section.color} w-2`}></div>
                <div className="flex-1 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">
                    {section.name}
                  </h2>
                  <div className="flex items-center gap-6 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Users size={18} />
                      <span className="text-sm">{section.students} Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={18} />
                      <span className="text-sm">{section.topics} Topics</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No sections found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionsList;