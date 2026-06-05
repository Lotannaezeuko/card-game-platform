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
    <div
      className="flex flex-col min-h-screen bg-bg"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <main className="flex-1 px-5 pt-10" style={{ paddingBottom: 'calc(var(--nav-height) + 2rem)' }}>

        {/* ── Greeting + avatar ── */}
        <div className="flex items-start justify-between mb-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-accent mb-0.5">{greeting}</p>
            <h1 className="text-3xl font-bold tracking-tight text-text truncate">
              Hi {user?.username}
            </h1>
            <p className="text-textMuted text-sm mt-1">What are we playing today?</p>
          </div>

          {/* Avatar + dropdown */}
          <div className="relative flex-none mt-1 ml-3" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-10 h-10 rounded-full bg-accent text-black text-sm font-bold flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accentMuted"
              aria-label="Profile menu"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 panel shadow-lg py-1 z-50">
                <div className="px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-text">{user?.username}</p>
                  <p className="text-xs text-textMuted truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-surface3 transition-colors"
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
            label="Create Card"
            sublabel="Design a new card for your library"
            onClick={() => navigate('/cards/new')}
          />
          <ActionCard
            icon={<DeckIcon />}
            label="Build Deck"
            sublabel="Combine cards into a playable deck"
            onClick={() => navigate('/decks/new')}
          />
          <ActionCard
            icon={<GameIcon />}
            label="Start Game"
            sublabel="Host a game with your deck"
            onClick={() => navigate('/games/setup')}
          />
          <ActionCard
            icon={<JoinIcon />}
            label="Join Game"
            sublabel="Enter a code to join a session"
            onClick={() => navigate('/games/setup', { state: { tab: 'join' } })}
          />
        </div>

        {/* ── Recent deck ── */}
        {recentDeck && (
          <div>
            <p className="text-xs font-semibold text-textFaint uppercase tracking-wider mb-2.5">
              Jump back in
            </p>
            <button
              onClick={() =>
                navigate('/games/setup', { state: { deck_id: recentDeck.deck_id } })
              }
              className="w-full panel px-4 py-4 flex items-center justify-between hover:border-borderAccent transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface3 flex items-center justify-center text-accent flex-none">
                  <DeckIcon small />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-semibold text-text text-sm leading-snug truncate">
                    {recentDeck.deck_name}
                  </span>
                  <span className="text-xs text-textMuted">
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

function ActionCard({ icon, label, sublabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full panel px-4 py-4 flex items-center gap-4 transition-all text-left hover:border-borderAccent hover:shadow-[var(--shadow-accent)]"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none bg-accentMuted text-accent">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-semibold text-text text-sm">{label}</span>
        <span className="text-xs text-textMuted truncate">{sublabel}</span>
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

function JoinIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-textFaint flex-none">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
