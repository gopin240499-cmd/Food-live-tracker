import { useState, useCallback, useRef } from 'react';

// Custom hook for showing toast notifications
const useToast = () => {
  const [toast, setToast] = useState({ message: '', type: 'success', isVisible: false });
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, type, isVisible: true });

    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  return { toast, showToast, hideToast };
};

export default useToast;
