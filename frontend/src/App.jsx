import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
  <div className="flex items-center justify-center min-h-screen text-gray-500">{name} — coming soon</div>
);

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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
