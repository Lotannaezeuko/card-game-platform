import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/layout/BottomNav';
import TopBar from '../components/layout/TopBar';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Home" />
      <main className="flex-1 px-4 pt-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Hello, {user?.username}!
        </h2>
        <p className="text-gray-500 text-sm mb-8">
          Ready to play? Build a deck or jump into a game.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <QuickLinkCard
            title="Create Card"
            description="Design a new card for your library"
            to="/cards/new"
            emoji="🃏"
          />
          <QuickLinkCard
            title="Build Deck"
            description="Put together a custom deck"
            to="/decks/new"
            emoji="📦"
          />
          <QuickLinkCard
            title="Start Game"
            description="Set up and host a game session"
            to="/games/setup"
            emoji="🎮"
          />
          <QuickLinkCard
            title="My Decks"
            description="View and manage your saved decks"
            to="/decks"
            emoji="📋"
          />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function QuickLinkCard({ title, description, to, emoji }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-semibold text-gray-900 text-sm">{title}</span>
      <span className="text-xs text-gray-500">{description}</span>
    </Link>
  );
}
