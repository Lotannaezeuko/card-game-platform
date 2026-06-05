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
    <header
      className="flex items-center justify-between px-4 h-14 bg-surface border-b border-border sticky top-0 z-40"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <span className="font-bold text-text text-lg tracking-tight">{title || 'Wildcard'}</span>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-9 h-9 rounded-full bg-accent text-black text-sm font-bold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accentMuted"
          aria-label="Profile menu"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 panel shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-text">{user?.username}</p>
              <p className="text-xs text-textMuted truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-error hover:bg-surface3 transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
