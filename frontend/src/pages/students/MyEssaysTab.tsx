import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, Eye, MessageSquare, Download, FileText, Loader2 } from 'lucide-react';
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
import { supabase } from '../../lib/supabaseClient';
export function MyEssaysTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [essaysData, setEssaysData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEssays() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('auth_user_id', authUser.user.id)
          .single();

        if (!student) return;

        const { data, error } = await supabase
          .from('essays')
          .select('id, title, submitted_at, status, overall_score, essay_activities(title)')
          .eq('student_id', student.id)
          .order('submitted_at', { ascending: false });

        if (error) throw error;

        const formattedData = (data || []).map(e => ({
          id: e.id,
          title: e.title || (e.essay_activities as any)?.title || 'Untitled Essay',
          submitted: new Date(e.submitted_at).toLocaleDateString(),
          status: e.status === 'reviewed' ? 'Reviewed' : (e.status === 'analyzed' ? 'AI Evaluated' : 'Submitted'),
          aiScore: e.status === 'analyzed' || e.status === 'reviewed' ? e.overall_score : null,
          teacherScore: e.status === 'reviewed' ? e.overall_score : null,
          hasAiFeedback: e.status === 'analyzed' || e.status === 'reviewed',
          hasTeacherFeedback: e.status === 'reviewed',
        }));
        setEssaysData(formattedData);
      } catch (error) {
        console.error('Error fetching essays:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEssays();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center flex-col items-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-neutral-500">Loading your essays...</p>
      </div>
    );
  }

  const filteredEssays = essaysData.filter(essay =>
    essay.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Reviewed':
        return <Badge className="bg-green-600 text-white">Reviewed</Badge>;
      case 'AI Evaluated':
        return <Badge className="bg-blue-600 text-white">AI Evaluated</Badge>;
      case 'Under AI Evaluation':
        return <Badge className="bg-amber-600 text-white">Evaluating</Badge>;
      default:
        return <Badge className="bg-neutral-600 text-white">{status}</Badge>;
    }
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-sm text-neutral-400">-</span>;
    
    if (score >= 90) return <Badge className="bg-green-600 text-white">{score}%</Badge>;
    if (score >= 80) return <Badge className="bg-blue-600 text-white">{score}%</Badge>;
    if (score >= 70) return <Badge className="bg-amber-600 text-white">{score}%</Badge>;
    return <Badge className="bg-red-600 text-white">{score}%</Badge>;
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
          <p className="text-2xl text-neutral-900 mt-1">{essaysData.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Fully Reviewed</p>
          <p className="text-2xl text-success-default mt-1">{essaysData.filter(e => e.hasTeacherFeedback).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Pending</p>
          <p className="text-2xl text-warning-default mt-1">{essaysData.filter(e => !e.hasTeacherFeedback).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Avg. Score</p>
          <p className="text-2xl text-primary mt-1">
            {essaysData.filter(e => e.aiScore).length > 0 
              ? Math.round(essaysData.filter(e => e.aiScore).reduce((sum, e) => sum + e.aiScore, 0) / essaysData.filter(e => e.aiScore).length) + '%' 
              : 'N/A'}
          </p>
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
