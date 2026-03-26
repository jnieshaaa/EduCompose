import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Search, Eye, MessageSquare, Download, FileText, AlertCircle } from 'lucide-react';
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
import { getErrorMessage } from '../../utils/errorUtils';
import { supabase } from '../../lib/supabaseClient';
import { PremiumLoader } from '../../components/ui/PremiumLoader';
export function MyEssaysTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [essaysData, setEssaysData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Error fetching essays for student:', error);
        setError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
    fetchEssays();
  }, []);

  if (loading && essaysData.length === 0) {
    return <PremiumLoader loading={loading} message="Gathering your essays..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Failed to Load Essays</h2>
        <p className="text-neutral-500 max-w-sm mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-primary">
          Try Again
        </Button>
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
    <div className="space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">My Essays</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5 sm:mt-1">View and manage all your submissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-none shadow-sm bg-white">
          <p className="text-[10px] sm:text-sm text-neutral-500 uppercase tracking-wider font-bold">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 mt-0.5 sm:mt-1">{essaysData.length}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-none shadow-sm bg-white text-success-default">
          <p className="text-[10px] sm:text-sm text-neutral-500 uppercase tracking-wider font-bold">Reviewed</p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{essaysData.filter(e => e.hasTeacherFeedback).length}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-none shadow-sm bg-white text-warning-default">
          <p className="text-[10px] sm:text-sm text-neutral-500 uppercase tracking-wider font-bold">Pending</p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{essaysData.filter(e => !e.hasTeacherFeedback).length}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-none shadow-sm bg-white text-primary">
          <p className="text-[10px] sm:text-sm text-neutral-500 uppercase tracking-wider font-bold">Avg. Score</p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">
            {essaysData.filter(e => e.aiScore).length > 0 
              ? Math.round(essaysData.filter(e => e.aiScore).reduce((sum, e) => sum + e.aiScore, 0) / essaysData.filter(e => e.aiScore).length) + '%' 
              : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-3 sm:p-4 border-none shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              type="search"
              placeholder="Search essays..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10 h-10"
            />
          </div>
          <select className="h-10 px-3 border border-neutral-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
            <option>All Status</option>
            <option>Reviewed</option>
            <option>AI Evaluated</option>
            <option>Evaluating</option>
          </select>
        </div>
      </Card>

      {/* Essays Table */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow>
                <TableHead className="min-w-[220px]">Essay Title</TableHead>
                <TableHead className="text-center min-w-[120px]">Submitted At</TableHead>
                <TableHead className="text-center min-w-[120px]">Status</TableHead>
                <TableHead className="text-center min-w-[100px]">AI Score</TableHead>
                <TableHead className="text-center min-w-[120px]">Final Score</TableHead>
                <TableHead className="text-right min-w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEssays.map((essay) => (
                <TableRow key={essay.id} className="hover:bg-neutral-50/50 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-neutral-900">{essay.title}</div>
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
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {essay.hasAiFeedback && (
                            <DropdownMenuItem className="cursor-pointer" onClick={() => {}}>
                              <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                              View AI Feedback
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer">
                            <Download className="w-4 h-4 mr-2 text-neutral-500" />
                            Download Essay
                          </DropdownMenuItem>
                          {essay.hasAiFeedback && (
                            <DropdownMenuItem className="cursor-pointer">
                              <Download className="w-4 h-4 mr-2 text-neutral-500" />
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
        </div>
      </Card>
    </div>
  );
}
