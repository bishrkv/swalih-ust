import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100" id="confirm-modal-title">
                {title}
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              id="confirm-modal-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-2"
              id="confirm-modal-confirm-btn"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
