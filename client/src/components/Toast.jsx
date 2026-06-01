import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'success', isVisible, onClose }) => {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className={`fixed top-6 left-1/2 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2.5 ${colors[type]}`}
        >
          <span className="text-base">{icons[type]}</span>
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-3 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
