import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import CardThumbnail from '../components/cards/CardThumbnail';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

export default function CardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    apiFetch('/cards')
      .then((data) => setCards(data.cards || []))
      .catch(() => setError('Could not load cards. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function confirmDelete() {
    try {
      await apiFetch(`/cards/${deleteTarget.card_id}`, { method: 'DELETE' });
      setCards((prev) => prev.filter((c) => c.card_id !== deleteTarget.card_id));
    } catch {
      setError('Could not delete card. It may be in use by a deck.');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="My Cards" />
      <main className="flex-1 px-4 pt-6 pb-24">
        {loading && <LoadingSpinner />}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && !error && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-400 text-sm mb-4">No cards yet. Create your first one!</p>
            <button
              onClick={() => navigate('/cards/new')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Card
            </button>
          </div>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((card) => (
              <div key={card.card_id} className="relative">
                <CardThumbnail
                  card={card}
                  onClick={() => navigate(`/cards/${card.card_id}/edit`)}
                />
                <button
                  onClick={() => setDeleteTarget(card)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow border border-gray-200 flex items-center justify-center text-red-400 hover:bg-red-50 text-sm"
                  aria-label="Delete card"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/cards/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors z-40"
        aria-label="Create new card"
      >
        +
      </button>

      <BottomNav />

      {deleteTarget && (
        <Modal
          title="Delete Card"
          message={`Delete "${deleteTarget.card_name}"? If this card is in any decks it cannot be deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
