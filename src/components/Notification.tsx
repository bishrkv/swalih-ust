import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface NotificationProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Notification({ toasts, onClose }: NotificationProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200';
          let Icon = CheckCircle;

          if (toast.type === 'error') {
            bgColor = 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200';
            Icon = AlertCircle;
          } else if (toast.type === 'info') {
            bgColor = 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950 dark:border-sky-900 dark:text-sky-200';
            Icon = Info;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg ${bgColor} backdrop-blur-md`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <div className="text-sm font-medium flex-1">{toast.text}</div>
              <button
                onClick={() => onClose(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                id={`close-toast-${toast.id}`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
