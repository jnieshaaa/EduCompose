import { useState } from 'react';
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { Search, Eye, Play, MessageSquare, Download, MoreVertical, Filter } from 'lucide-react';
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
  { id: 1, student: 'Emma Wilson', title: 'Climate Change Impact', program: 'Computer Science 101', section: 'Section A', submitted: '2025-12-10', aiStatus: 'Completed', score: 88, teacherReview: 'Pending' },
  { id: 2, student: 'James Lee', title: 'Machine Learning Ethics', program: 'Computer Science 101', section: 'Section A', submitted: '2025-12-09', aiStatus: 'Completed', score: 85, teacherReview: 'Reviewed' },
  { id: 3, student: 'Sarah Martinez', title: 'Economic Theory', program: 'Data Structures', section: 'Section A', submitted: '2025-12-11', aiStatus: 'Pending', score: null, teacherReview: 'Not Started' },
  { id: 4, student: 'Michael Chen', title: 'Social Media Effects', program: 'Web Development', section: 'Section A', submitted: '2025-12-08', aiStatus: 'Completed', score: 92, teacherReview: 'Reviewed' },
  { id: 5, student: 'Olivia Brown', title: 'Historical Analysis', program: 'Machine Learning', section: 'Section A', submitted: '2025-12-07', aiStatus: 'Completed', score: 79, teacherReview: 'In Progress' },
  { id: 6, student: 'Daniel Garcia', title: 'Data Privacy Concerns', program: 'Computer Science 101', section: 'Section B', submitted: '2025-12-12', aiStatus: 'In Progress', score: null, teacherReview: 'Not Started' },
  { id: 7, student: 'Sophia Taylor', title: 'Database Optimization', program: 'Database Systems', section: 'Section A', submitted: '2025-12-06', aiStatus: 'Completed', score: 90, teacherReview: 'Reviewed' },
  { id: 8, student: 'Liam Anderson', title: 'Web Security Best Practices', program: 'Web Development', section: 'Section B', submitted: '2025-12-11', aiStatus: 'Completed', score: 84, teacherReview: 'Pending' },
];

export function EssaysTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEssays = essaysData.filter(essay =>
    essay.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    essay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    essay.program.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-success-default text-white';
      case 'In Progress':
        return 'bg-info-default text-white';
      case 'Pending':
        return 'bg-warning-default text-white';
      default:
        return 'bg-neutral-400 text-white';
    }
  };

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'Reviewed':
        return 'bg-success-default text-white';
      case 'In Progress':
        return 'bg-info-default text-white';
      case 'Pending':
        return 'bg-warning-default text-white';
      default:
        return 'bg-neutral-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-neutral-900">Essay Submissions</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and review student essays</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Total Submitted</p>
          <p className="text-2xl text-neutral-900 mt-1">1,234</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">AI Evaluated</p>
          <p className="text-2xl text-success-default mt-1">1,180</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Pending AI</p>
          <p className="text-2xl text-warning-default mt-1">54</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Teacher Reviewed</p>
          <p className="text-2xl text-info-default mt-1">892</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Avg. Score</p>
          <p className="text-2xl text-primary mt-1">82.5%</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search by student, title, program..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <select className="px-3 py-2 border border-neutral-300 rounded-rd">
              <option>All Programs</option>
              <option>Computer Science 101</option>
              <option>Data Structures</option>
              <option>Web Development</option>
            </select>
            <select className="px-3 py-2 border border-neutral-300 rounded-rd">
              <option>All AI Status</option>
              <option>Completed</option>
              <option>In Progress</option>
              <option>Pending</option>
            </select>
            <select className="px-3 py-2 border border-neutral-300 rounded-rd">
              <option>All Reviews</option>
              <option>Reviewed</option>
              <option>Pending</option>
              <option>Not Started</option>
            </select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More
            </Button>
          </div>
        </div>
      </Card>

      {/* Essays Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Essay Title</TableHead>
              <TableHead>Program / Section</TableHead>
              <TableHead className="text-center">Submitted</TableHead>
              <TableHead className="text-center">AI Status</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Teacher Review</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEssays.map((essay) => (
              <TableRow key={essay.id}>
                <TableCell>
                  <div className="text-neutral-900">{essay.student}</div>
                </TableCell>
                <TableCell>
                  <div className="text-neutral-900">{essay.title}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-neutral-600">{essay.program}</div>
                  <Badge variant="outline" className="mt-1 bg-secondary/10 text-secondary border-secondary/20 text-xs">
                    {essay.section}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm text-neutral-600">{essay.submitted}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={getAIStatusColor(essay.aiStatus)}>
                    {essay.aiStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {essay.score ? (
                    <Badge className={
                      essay.score >= 85 ? 'bg-success-default text-white' :
                      essay.score >= 75 ? 'bg-info-default text-white' :
                      essay.score >= 60 ? 'bg-warning-default text-white' :
                      'bg-error-default text-white'
                    }>
                      {essay.score}%
                    </Badge>
                  ) : (
                    <span className="text-sm text-neutral-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={getReviewStatusColor(essay.teacherReview)}>
                    {essay.teacherReview}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View Essay
                      </DropdownMenuItem>
                      {essay.aiStatus === 'Pending' && (
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          Trigger AI Evaluation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Add Teacher Feedback
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Download Essay
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}