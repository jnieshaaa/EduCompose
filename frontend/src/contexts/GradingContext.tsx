import React, { createContext, useContext, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from './NotificationContext';
import { gradeEssay } from '../services/activityService';

interface GradingTask {
  id: string; // usually essayId or activityId
  activityTitle: string;
  studentName: string;
  progress: number;
  status: 'pending' | 'grading' | 'completed' | 'error';
  message: string;
}

interface GradingContextType {
  tasks: GradingTask[];
  startGrading: (activityId: string, studentId: string, activityTitle: string, studentName: string) => Promise<void>;
  isTaskActive: (taskId: string) => boolean;
}

const GradingContext = createContext<GradingContextType | undefined>(undefined);

export const GradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<GradingTask[]>(() => {
    const saved = localStorage.getItem('grading_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // On reload, we keep the state. If it was 'grading', it stays 'grading' 
        // (the server will still be processing it, and we can check for results)
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const { showNotification } = useNotification();

  // Persist tasks to localStorage
  React.useEffect(() => {
    localStorage.setItem('grading_tasks', JSON.stringify(tasks));
  }, [tasks]);
  
  // Recovery: Check for orphaned 'grading' tasks on mount
  React.useEffect(() => {
    const orphanedTasks = tasks.filter(t => t.status === 'grading');
    if (orphanedTasks.length === 0) return;
    
    orphanedTasks.forEach(async (task) => {
      try {
        const [activityId, studentId] = task.id.split('-');
        // Wait a bit to avoid race conditions with standard flow
        await new Promise(r => setTimeout(r, 2000));
        
        const { loadAIDetectionResult } = await import('../services/activityService');
        const result = await loadAIDetectionResult(studentId, activityId);
        
        if (result) {
          updateTask(task.id, { 
            status: 'completed', 
            progress: 100, 
            message: 'Recovered: Evaluation found in database.' 
          });
          
          setTimeout(() => {
            setTasks(prev => prev.filter(t => t.id !== task.id));
          }, 3000);
        }
      } catch (e) {
      }
    });
  }, []); // Only on mount

  const updateTask = useCallback((id: string, updates: Partial<GradingTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const startGrading = useCallback(async (
    activityId: string, 
    studentId: string, 
    activityTitle: string, 
    studentName: string
  ) => {
    const taskId = `${activityId}-${studentId}`;
    
    // Check if task is already running
    if (tasks.find(t => t.id === taskId && t.status === 'grading')) {
      showNotification('info', `Grading for ${studentName} is already in progress.`);
      return;
    }

    const newTask: GradingTask = {
      id: taskId,
      activityTitle,
      studentName,
      progress: 0,
      status: 'grading',
      message: 'Initializing evaluation...',
    };

    setTasks(prev => [...prev, newTask]);
    showNotification('info', `Background grading started for ${studentName}.`);

    try {
      const result = await gradeEssay(
        studentId, 
        studentName,
        activityId,
        (progress: number, message: string) => {
          updateTask(taskId, { progress, message });
        }
      );

      if (result.success) {
        updateTask(taskId, { status: 'completed', progress: 100, message: 'Evaluation complete!' });
        showNotification('success', `Finished grading ${studentName}'s essay for ${activityTitle}.`);
        
        // Remove completed task after short delay
        setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== taskId));
        }, 5000);
      } else {
        throw new Error(result.error || 'Evaluation failed');
      }
    } catch (error: any) {
      console.error("[GradingContext] Error:", error);
      updateTask(taskId, { status: 'error', message: error.message || 'Evaluation failed' });
      showNotification('error', `Failed to grade ${studentName}: ${error.message}`);
      
      // Keep errors for a bit longer so teacher can see
      setTimeout(() => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }, 10000);
    }
  }, [tasks, showNotification, updateTask]);

  const isTaskActive = useCallback((taskId: string) => {
    return tasks.some(t => t.id === taskId && (t.status === 'grading' || t.status === 'pending'));
  }, [tasks]);

  return (
    <GradingContext.Provider value={{ tasks, startGrading, isTaskActive }}>
      {children}
      
      {/* Global Grading HUD (Top Right) */}
      <div className="fixed top-24 right-6 z-[90] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-primary-100/50 rounded-2xl p-4 shadow-2xl shadow-primary/10 w-72 group relative overflow-hidden"
            >
              {/* Progress Background */}
              <motion.div 
                className="absolute inset-0 bg-primary-50/30 origin-left z-0"
                style={{ scaleX: task.progress / 100 }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {task.status === 'grading' ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : task.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-success-default" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-error-default" />
                    )}
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                       AI Evaluation {task.progress}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-900 truncate">
                    {task.studentName}
                  </p>
                  <p className="text-[9px] text-neutral-500 uppercase tracking-tight truncate">
                    {task.activityTitle}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                   <p className="text-[8px] font-medium text-neutral-400 italic truncate flex-1 mr-2">
                     {task.message}
                   </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GradingContext.Provider>
  );
};

export const useGrading = () => {
  const context = useContext(GradingContext);
  if (!context) {
    throw new Error('useGrading must be used within a GradingProvider');
  }
  return context;
};
