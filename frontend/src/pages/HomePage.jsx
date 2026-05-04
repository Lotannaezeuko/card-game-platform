import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import BottomNav from '../components/layout/BottomNav';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recentDeck, setRecentDeck] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    apiFetch('/decks')
      .then((data) => setRecentDeck(data.decks?.[0] ?? null))
      .catch(() => {});
  }, []);

  // Close the profile dropdown when the user clicks outside the menu container
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 px-5 pt-12 pb-28">

        {/* ── Greeting + avatar ── */}
        <div className="flex items-start justify-between mb-9">
          <div>
            <p className="text-sm font-medium text-indigo-500 mb-0.5">{greeting}</p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {user?.username}
            </h1>
            <p className="text-gray-400 text-sm mt-1">What are we playing today?</p>
          </div>

          {/* Avatar + dropdown */}
          <div className="relative flex-none mt-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Profile menu"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="flex flex-col gap-3 mb-9">
          <ActionCard
            icon={<CardIcon />}
            accent="bg-indigo-50 text-indigo-600"
            label="Create a Card"
            sublabel="Design a new card for your library"
            onClick={() => navigate('/cards/new')}
          />
          <ActionCard
            icon={<DeckIcon />}
            accent="bg-emerald-50 text-emerald-600"
            label="Build a Deck"
            sublabel="Arrange cards into a playable deck"
            onClick={() => navigate('/decks/new')}
          />
          <ActionCard
            icon={<GameIcon />}
            accent="bg-amber-50 text-amber-600"
            label="Start a Game"
            sublabel="Host a session and invite players"
            onClick={() => navigate('/games/setup')}
          />
        </div>

        {/* ── Recent deck ── */}
        {recentDeck && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Jump back in
            </p>
            <button
              onClick={() =>
                navigate('/games/setup', { state: { deck_id: recentDeck.deck_id } })
              }
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-none">
                  <DeckIcon small />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-gray-900 text-sm leading-snug">
                    {recentDeck.deck_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {recentDeck.card_count} {recentDeck.card_count === 1 ? 'card' : 'cards'}
                  </span>
                </div>
              </div>
              <ChevronRight />
            </button>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
  );
}

function ActionCard({ icon, accent, label, sublabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-4 active:bg-gray-50 transition-colors text-left"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${accent}`}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-semibold text-gray-900 text-sm">{label}</span>
        <span className="text-xs text-gray-400 truncate">{sublabel}</span>
      </div>
      <ChevronRight />
    </button>
  );
}

function CardIcon({ small = false }) {
  const s = small ? 16 : 20;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <line x1="2" y1="9" x2="22" y2="9" />
    </svg>
  );
}

function DeckIcon({ small = false }) {
  const s = small ? 16 : 20;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 flex-none">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
