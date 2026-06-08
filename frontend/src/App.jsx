import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuestJoinPage from './pages/GuestJoinPage';
import HomePage from './pages/HomePage';
import CardsPage from './pages/CardsPage';
import CardBuilderPage from './pages/CardBuilderPage';
import DecksPage from './pages/DecksPage';
import DeckBuilderPage from './pages/DeckBuilderPage';
import GameSetupPage from './pages/GameSetupPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndSessionPage from './pages/EndSessionPage';

// Placeholder pages — to be built in later phases
const Placeholder = ({ name }) => (
  <div className="flex items-center justify-center min-h-screen bg-bg text-textMuted">{name} — coming soon</div>
);

// Landing redirect for "/": send authenticated users to the app, others to login.
// Waits for auth rehydration so a logged-in user is never bounced to /login on open/reload.
function RootRedirect() {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <Navigate to={token ? '/home' : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/join" element={<GuestJoinPage />} />

          {/* Protected */}
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
          <Route path="/cards/new" element={<ProtectedRoute><CardBuilderPage /></ProtectedRoute>} />
          <Route path="/cards/:cardId/edit" element={<ProtectedRoute><CardBuilderPage /></ProtectedRoute>} />
          <Route path="/decks" element={<ProtectedRoute><DecksPage /></ProtectedRoute>} />
          <Route path="/decks/new" element={<ProtectedRoute><DeckBuilderPage /></ProtectedRoute>} />
          <Route path="/decks/:deckId/edit" element={<ProtectedRoute><DeckBuilderPage /></ProtectedRoute>} />
          <Route path="/games/setup" element={<ProtectedRoute><GameSetupPage /></ProtectedRoute>} />
          <Route path="/games/:gameId/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
          <Route path="/games/:gameId/play" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="/games/:gameId/end" element={<ProtectedRoute><EndSessionPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
