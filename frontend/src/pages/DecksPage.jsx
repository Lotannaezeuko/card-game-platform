import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

export default function DecksPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    apiFetch('/decks')
      .then((data) => setDecks(data.decks || []))
      .catch(() => setError('Could not load decks. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function confirmDelete() {
    try {
      await apiFetch(`/decks/${deleteTarget.deck_id}`, { method: 'DELETE' });
      setDecks((prev) => prev.filter((d) => d.deck_id !== deleteTarget.deck_id));
    } catch {
      setError('Could not delete deck. Please try again.');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="My Decks" />
      <main className="flex-1 px-4 pt-6 pb-24">
        {loading && <LoadingSpinner />}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && !error && decks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-400 text-sm mb-4">No decks yet. Build your first one!</p>
            <button
              onClick={() => navigate('/decks/new')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Build Deck
            </button>
          </div>
        )}

        {!loading && decks.length > 0 && (
          <ul className="flex flex-col gap-3">
            {decks.map((deck) => (
              <li
                key={deck.deck_id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{deck.deck_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {deck.card_count ?? '—'} cards
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/decks/${deck.deck_id}/edit`)}
                    className="text-blue-600 text-sm font-medium min-h-[44px] px-2"
                    aria-label="Edit deck"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(deck)}
                    className="text-red-500 text-sm font-medium min-h-[44px] px-2"
                    aria-label="Delete deck"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/decks/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors z-40"
        aria-label="Build new deck"
      >
        +
      </button>

      <BottomNav />

      {deleteTarget && (
        <Modal
          title="Delete Deck"
          message={`Are you sure you want to delete "${deleteTarget.deck_name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
