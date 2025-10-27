import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  Plus,
  Filter,
} from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import ClassOverview from "../components/dashboard/ClassOverview";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import type { DashboardStats, Essay, Class } from "../types/Essay";
import { dummyData } from "../api";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEssays, setRecentEssays] = useState<Essay[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Simulate API call
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // In a real app, you would call the API here
        // const statsData = await analysisApi.getDashboardStats();
        // const essaysData = await essayApi.getEssays();
        // const classesData = await classApi.getClasses();

        // For now, use dummy data
        setTimeout(() => {
          setStats(dummyData.dashboardStats);
          setRecentEssays(dummyData.essays);
          setClasses(dummyData.classes);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
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
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-neutral-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            Welcome back! Here's what's happening with your classes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Essay
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search essays..."
          value={searchTerm}
          onChange={setSearchTerm}
          type="text"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Essays"
          value={stats?.total_essays || 0}
          icon={BookOpen}
          color="primary"
          change={{ value: 12, type: "increase" }}
        />
        <StatsCard
          title="Active Classes"
          value={stats?.total_classes || 0}
          icon={GraduationCap}
          color="success"
          change={{ value: 5, type: "increase" }}
        />
        <StatsCard
          title="Total Students"
          value={stats?.total_students || 0}
          icon={Users}
          color="info"
          change={{ value: 8, type: "increase" }}
        />
        <StatsCard
          title="Avg Score"
          value="87%"
          icon={TrendingUp}
          color="warning"
          change={{ value: 3, type: "increase" }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity
            essays={filteredEssays}
            onEssayClick={(essay) => {
              console.log("Essay clicked:", essay);
              // Navigate to essay detail or open modal
            }}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button variant="primary" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Add New Essay
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage Students
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <GraduationCap className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </div>
          </Card>

          {/* Performance Overview */}
          <Card>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Performance Overview
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">
                  Grammar Accuracy
                </span>
                <span className="text-sm font-semibold text-neutral-900">
                  92%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-success-default h-2 rounded-full"
                  style={{ width: "92%" }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Readability</span>
                <span className="text-sm font-semibold text-neutral-900">
                  87%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: "87%" }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">
                  Argument Strength
                </span>
                <span className="text-sm font-semibold text-neutral-900">
                  89%
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-info-default h-2 rounded-full"
                  style={{ width: "89%" }}
                ></div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Class Overview */}
      <ClassOverview
        classes={classes.map((cls) => ({
          ...cls,
          essay_count: 0,
          student_count: 0,
        }))}
        onClassClick={(classId) => {
          console.log("Class clicked:", classId);
          // Navigate to class detail
        }}
      />
    </div>
  );
};

export default Dashboard;
