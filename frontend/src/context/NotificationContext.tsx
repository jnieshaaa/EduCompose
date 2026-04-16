import React, { createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { toast, Toaster } from 'sonner';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  const showNotification = useCallback((type: NotificationType, message: string) => {
    const iconMap = {
      success: <CheckCircle2 size={18} className="text-emerald-400" />,
      error: <AlertCircle size={18} className="text-red-400" />,
      warning: <AlertTriangle size={18} className="text-amber-400" />,
      info: <Info size={18} className="text-blue-400" />,
    };

    toast.custom((t) => (
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border min-w-[320px] max-w-md
        bg-[#121212] border-white/10 text-white backdrop-blur-xl
        animate-in fade-in slide-in-from-right-5
      `}>
        <div className={`
          p-1.5 rounded-full 
          ${type === 'success' ? 'bg-emerald-500/10' : 
            type === 'error' ? 'bg-red-500/10' : 
            type === 'warning' ? 'bg-amber-500/10' :
            'bg-blue-500/10'}
        `}>
          {iconMap[type]}
        </div>
        
        <p className="flex-1 text-sm font-medium tracking-tight">
          {message}
        </p>
        
        <button 
          onClick={() => toast.dismiss(t)}
          className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
        >
          <Info size={14} className="opacity-0 w-0" /> {/* Spacer */}
          <span className="text-xs uppercase font-bold opacity-40 hover:opacity-100">Close</span>
        </button>
      </div>
    ), {
      duration: 5000,
      position: 'top-right',
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Toaster 
        expand={true} 
        visibleToasts={5}
        position="top-right"
        toastOptions={{
          style: { background: 'transparent', border: 'none', boxShadow: 'none' },
        }}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
