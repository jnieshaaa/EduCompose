import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 8000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto"
            >
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border min-w-[320px] max-w-md
                ${n.type === 'success' ? 'bg-[#121212] border-emerald-500/20 text-white' : 
                  n.type === 'error' ? 'bg-[#121212] border-red-500/20 text-white' : 
                  n.type === 'warning' ? 'bg-[#121212] border-amber-500/20 text-white' :
                  'bg-[#121212] border-blue-500/20 text-white'}
              `}>
                <div className={`
                  p-1 rounded-full 
                  ${n.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 
                    n.type === 'error' ? 'bg-red-500/10 text-red-400' : 
                    n.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'}
                `}>
                  {n.type === 'success' && <CheckCircle2 size={18} />}
                  {n.type === 'error' && <AlertCircle size={18} />}
                  {n.type === 'warning' && <AlertTriangle size={18} />}
                  {n.type === 'info' && <Info size={18} />}
                </div>
                
                <p className="flex-1 text-sm font-medium tracking-tight">
                  {n.message}
                </p>

                <button 
                  onClick={() => removeNotification(n.id)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
