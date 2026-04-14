import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  Plus,
  Filter,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import ClassOverview from "../components/dashboard/ClassOverview";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import type { DashboardStats, Essay, Class } from "../types/Essay";
import { classApi, essayApi, studentApi } from "../api";
import CreateClassModal from "../components/dashboard/CreateClassModal";
import CreateEssayModal from "../components/dashboard/CreateEssayModal";
import DiagnosticFindings from "../components/dashboard/DiagnosticFindings";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEssays, setRecentEssays] = useState<Essay[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showCreateEssayModal, setShowCreateEssayModal] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [fetchedClasses, fetchedEssays] = await Promise.all([
          classApi.getClasses(),
          essayApi.getEssays()
        ]);

        setClasses(fetchedClasses);
        setRecentEssays(fetchedEssays);

        const studentPromises = fetchedClasses.map(cls => studentApi.getStudentsByClass(cls.id));
        const studentsArrays = await Promise.all(studentPromises);
        const allStudents = studentsArrays.flat();
        const uniqueStudentsCount = new Set(allStudents.map(s => s.id)).size;

        const dashboardStats: DashboardStats = {
          total_essays: fetchedEssays.length,
          total_classes: fetchedClasses.length,
          total_students: uniqueStudentsCount,
          recent_essays: fetchedEssays.slice(0, 5),
          class_stats: fetchedClasses.map(cls => ({
            id: cls.id,
            name: cls.name,
            essay_count: fetchedEssays.filter(e => e.class_id === cls.id).length,
            student_count: allStudents.filter(s => s.class_id === cls.id).length
          }))
        };

        setStats(dashboardStats);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const filteredEssays = recentEssays.filter(
    (essay) =>
      essay.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      essay.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className='p-6 min-h-screen bg-neutral-50'>
        <div className='animate-pulse space-y-6'>
          <div className='h-12 bg-neutral-200 rounded-2xl w-1/3'></div>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='h-32 bg-neutral-200 rounded-2xl'></div>
            ))}
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2 h-96 bg-neutral-200 rounded-2xl'></div>
            <div className='h-96 bg-neutral-200 rounded-2xl'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative p-6 space-y-8 min-h-screen bg-neutral-50/50 overflow-hidden'>
      {/* Visual background flourishes */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-200/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-success-200/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className='relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className='text-4xl font-black text-neutral-900 tracking-tight'>
            Institutional <span className="text-primary">Dashboard</span>
          </h1>
          <p className='text-neutral-500 font-medium mt-1'>
            Welcome back, Prof. Administrator. Here is today's academic snapshot.
          </p>
        </motion.div>
        
        <div className='flex items-center gap-3'>
          <div className="relative hidden md:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Quick search findings..."
              className="pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all w-64 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant='primary' 
            className='shadow-lg shadow-primary/20 rounded-xl px-6'
            onClick={() => setShowCreateEssayModal(true)}
          >
            <Plus className='w-4 h-4 mr-2' />
            New Analysis
          </Button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className='relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
        <StatsCard
          title='Academic Output'
          value={stats?.total_essays || 0}
          icon={BookOpen}
          color='primary'
          className="shadow-md hover:shadow-xl transition-shadow"
        />
        <StatsCard
          title='Academic Blocks'
          value={stats?.total_classes || 0}
          icon={GraduationCap}
          color='success'
          className="shadow-md hover:shadow-xl transition-shadow"
        />
        <StatsCard
          title='Active Students'
          value={stats?.total_students || 0}
          icon={Users}
          color='info'
          className="shadow-md hover:shadow-xl transition-shadow"
        />
        <StatsCard
          title='Institutional Avg'
          value='87.4%'
          icon={TrendingUp}
          color='warning'
          className="shadow-md hover:shadow-xl transition-shadow"
        />
      </div>

      {/* Insights & Activity Grid */}
      <div className='relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Diagnostic Findings - Prioritized */}
        <div className='lg:col-span-1 h-full'>
          <DiagnosticFindings />
        </div>

        {/* Global Recent Activity */}
        <div className='lg:col-span-2 h-full'>
          <RecentActivity
            essays={filteredEssays}
            onEssayClick={(essay) => {
              console.log("Essay clicked:", essay);
            }}
          />
        </div>
      </div>

      {/* Managed Blocks & Quick Actions */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <ClassOverview
            classes={classes.map((cls) => ({
              ...cls,
              essay_count: stats?.class_stats.find(s => s.id === cls.id)?.essay_count || 0,
              student_count: stats?.class_stats.find(s => s.id === cls.id)?.student_count || 0,
            }))}
            onClassClick={(classId) => {
              console.log("Class clicked:", classId);
            }}
          />
        </div>

        <div className="space-y-6">
          <Card variant="glass" className="border-primary-100/30">
            <h3 className='text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2'>
              <TrendingUp className="w-5 h-5 text-primary" />
              Quick Actions
            </h3>
            <div className='grid grid-cols-1 gap-3'>
              <Button
                variant='primary'
                className='w-full justify-between group rounded-xl py-6'
                onClick={() => setShowCreateEssayModal(true)}
              >
                <span className="flex items-center">
                  <Plus className='w-4 h-4 mr-3' />
                  Add New Essay
                </span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Button>
              <Button 
                variant='secondary' 
                className='w-full justify-start rounded-xl py-6'
                onClick={() => window.location.href = "/Teacher/Gradebook"}
              >
                <GraduationCap className='w-4 h-4 mr-3' />
                View Gradebook
              </Button>
              <Button
                variant='ghost'
                className='w-full justify-start rounded-xl text-neutral-600 hover:bg-neutral-100 py-6'
                onClick={() => setShowCreateClassModal(true)}
              >
                <Plus className='w-4 h-4 mr-3' />
                Create Block
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <CreateClassModal
        isOpen={showCreateClassModal}
        onClose={() => setShowCreateClassModal(false)}
        onCreated={(newClass) => {
          setClasses((prev) => [newClass, ...prev]);
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  total_classes: prev.total_classes + 1,
                  class_stats: [
                    ...prev.class_stats,
                    {
                      id: newClass.id,
                      name: newClass.name,
                      essay_count: 0,
                      student_count: 0,
                    },
                  ],
                }
              : prev
          );
        }}
      />

      <CreateEssayModal
        isOpen={showCreateEssayModal}
        onClose={() => setShowCreateEssayModal(false)}
        onCreated={(newEssay) => {
          setRecentEssays((prev) => [newEssay, ...prev]);
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  total_essays: prev.total_essays + 1,
                  recent_essays: [newEssay, ...(prev.recent_essays || [])],
                  class_stats: prev.class_stats.map((cls) =>
                    cls.id === newEssay.class_id
                      ? {
                          ...cls,
                          essay_count: cls.essay_count + 1,
                        }
                      : cls
                  ),
                }
              : prev
          );
        }}
      />
    </div>
  );
};

export default Dashboard;
