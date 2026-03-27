import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TopBar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || '?';

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-40">
      <span className="font-semibold text-gray-900 text-base">{title || 'Card Game'}</span>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Profile menu"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
