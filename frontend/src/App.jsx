import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CardsPage from './pages/CardsPage';
import CardBuilderPage from './pages/CardBuilderPage';
import DecksPage from './pages/DecksPage';
import DeckBuilderPage from './pages/DeckBuilderPage';

// Placeholder pages — to be built in later phases
const Placeholder = ({ name }) => (
  <div className="flex items-center justify-center min-h-screen text-gray-500">{name} — coming soon</div>
);

export default function App() {
  return (
    <AuthProvider>
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
          <Route path="/games/setup" element={<ProtectedRoute><Placeholder name="Game Setup" /></ProtectedRoute>} />
          <Route path="/games/:gameId/lobby" element={<ProtectedRoute><Placeholder name="Lobby" /></ProtectedRoute>} />
          <Route path="/games/:gameId/play" element={<ProtectedRoute><Placeholder name="Game" /></ProtectedRoute>} />
          <Route path="/games/:gameId/end" element={<ProtectedRoute><Placeholder name="End Session" /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
