import { useState, useCallback } from 'react';

// Returns [toasts, addToast]. Each toast auto-dismisses after 3 seconds.
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return [toasts, addToast];
}

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg animate-fade-in whitespace-nowrap"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
