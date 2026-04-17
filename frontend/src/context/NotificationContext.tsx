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
      success: <CheckCircle2 size={16} className="text-emerald-400" />,
      error: <AlertCircle size={16} className="text-red-400" />,
      warning: <AlertTriangle size={16} className="text-amber-400" />,
      info: <Info size={16} className="text-blue-300" />,
    };

    toast.custom((t) => (
      <div className={`
        flex items-center gap-2.5 px-3 py-2 rounded-lg shadow-xl border min-w-[280px] max-w-sm
        bg-[#045568] border-[#0791B2]/40 text-white backdrop-blur-xl
        animate-in fade-in slide-in-from-right-5
      `}>
        <div className={`
          p-1 rounded-full flex-shrink-0
          ${type === 'success' ? 'bg-emerald-500/15' : 
            type === 'error' ? 'bg-red-500/15' : 
            type === 'warning' ? 'bg-amber-500/15' :
            'bg-blue-400/15'}
        `}>
          {iconMap[type]}
        </div>
        
        <p className="flex-1 text-sm font-medium tracking-tight leading-snug">
          {message}
        </p>
        
        <button 
          onClick={() => toast.dismiss(t)}
          className="text-white/40 hover:text-white transition-colors p-0.5 flex-shrink-0"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    ), {
      duration: 4000,
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
