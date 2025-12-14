import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, Eye, MessageSquare, Download, Edit, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const essaysData = [
  { 
    id: 1, 
    title: 'Climate Change Impact', 
    submitted: '2025-12-10', 
    status: 'Under AI Evaluation',
    aiScore: null, 
    teacherScore: null,
    hasAiFeedback: false,
    hasTeacherFeedback: false
  },
  { 
    id: 2, 
    title: 'Machine Learning Ethics', 
    submitted: '2025-12-09', 
    status: 'Reviewed',
    aiScore: 85, 
    teacherScore: 88,
    hasAiFeedback: true,
    hasTeacherFeedback: true
  },
  { 
    id: 3, 
    title: 'Economic Theory Analysis', 
    submitted: '2025-12-05', 
    status: 'Reviewed',
    aiScore: 89, 
    teacherScore: 92,
    hasAiFeedback: true,
    hasTeacherFeedback: true
  },
  { 
    id: 4, 
    title: 'Social Media Effects', 
    submitted: '2025-12-03', 
    status: 'Reviewed',
    aiScore: 87, 
    teacherScore: 85,
    hasAiFeedback: true,
    hasTeacherFeedback: true
  },
  { 
    id: 5, 
    title: 'Historical Analysis of WWI', 
    submitted: '2025-12-01', 
    status: 'AI Evaluated',
    aiScore: 82, 
    teacherScore: null,
    hasAiFeedback: true,
    hasTeacherFeedback: false
  },
  { 
    id: 6, 
    title: 'Data Privacy Concerns', 
    submitted: '2025-11-28', 
    status: 'Reviewed',
    aiScore: 90, 
    teacherScore: 91,
    hasAiFeedback: true,
    hasTeacherFeedback: true
  },
];

export function MyEssaysTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEssays = essaysData.filter(essay =>
    essay.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Reviewed':
        return <Badge className="bg-success-default text-white">Reviewed</Badge>;
      case 'AI Evaluated':
        return <Badge className="bg-info-default text-white">AI Evaluated</Badge>;
      case 'Under AI Evaluation':
        return <Badge className="bg-warning-default text-white">Evaluating</Badge>;
      default:
        return <Badge className="bg-neutral-400 text-white">{status}</Badge>;
    }
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-sm text-neutral-400">-</span>;
    
    if (score >= 90) return <Badge className="bg-success-default text-white">{score}%</Badge>;
    if (score >= 80) return <Badge className="bg-info-default text-white">{score}%</Badge>;
    if (score >= 70) return <Badge className="bg-warning-default text-white">{score}%</Badge>;
    return <Badge className="bg-error-default text-white">{score}%</Badge>;
  };

  // Empty state
  if (essaysData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-12 h-12 text-neutral-400" />
        </div>
        <h2 className="text-2xl text-neutral-900 mb-2">No essays submitted yet</h2>
        <p className="text-neutral-500 text-center max-w-md mb-6">
          You haven't submitted any essays yet. Upload your first essay to get AI-powered feedback and start improving your writing!
        </p>
        <Button className="bg-primary hover:bg-primary-300">
          Submit Your First Essay
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">My Essays</h1>
          <p className="text-sm text-neutral-500 mt-1">View and manage all your submissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Total Submitted</p>
          <p className="text-2xl text-neutral-900 mt-1">12</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Fully Reviewed</p>
          <p className="text-2xl text-success-default mt-1">10</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Pending</p>
          <p className="text-2xl text-warning-default mt-1">2</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Avg. Score</p>
          <p className="text-2xl text-primary mt-1">88%</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search essays..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <select className="px-3 py-2 border border-neutral-300 rounded-rd">
            <option>All Status</option>
            <option>Reviewed</option>
            <option>AI Evaluated</option>
            <option>Evaluating</option>
          </select>
        </div>
      </Card>

      {/* Essays Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Essay Title</TableHead>
              <TableHead className="text-center">Submission Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">AI Score</TableHead>
              <TableHead className="text-center">Teacher Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEssays.map((essay) => (
              <TableRow key={essay.id}>
                <TableCell>
                  <div className="text-neutral-900">{essay.title}</div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm text-neutral-600">{essay.submitted}</div>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(essay.status)}
                </TableCell>
                <TableCell className="text-center">
                  {getScoreBadge(essay.aiScore)}
                </TableCell>
                <TableCell className="text-center">
                  {getScoreBadge(essay.teacherScore)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3 mr-2" />
                      View
                    </Button>
                    {essay.hasAiFeedback && (
                      <Button variant="outline" size="sm" className="text-primary hover:text-primary">
                        <MessageSquare className="w-3 h-3 mr-2" />
                        Feedback
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">⋮</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download Essay
                        </DropdownMenuItem>
                        {essay.hasAiFeedback && (
                          <DropdownMenuItem>
                            <Download className="w-4 h-4 mr-2" />
                            Download Feedback (PDF)
                          </DropdownMenuItem>
                        )}
                        {essay.status === 'Reviewed' && (
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Revise & Resubmit
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
