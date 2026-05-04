import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import FlippableCard from '../components/cards/FlippableCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';

// Fetch 50 cards at a time; "See more" button appends the next page
const PAGE_SIZE = 50;

export default function CardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    apiFetch(`/cards?limit=${PAGE_SIZE}&offset=0`)
      .then((data) => {
        setCards(data.cards || []);
        setTotal(data.pagination?.total ?? 0);
      })
      .catch(() => setError('Could not load cards. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await apiFetch(`/cards?limit=${PAGE_SIZE}&offset=${cards.length}`);
      setCards((prev) => [...prev, ...(data.cards || [])]);
      setTotal(data.pagination?.total ?? total);
    } catch {
      setError('Could not load more cards. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmDelete() {
    try {
      await apiFetch(`/cards/${deleteTarget.card_id}`, { method: 'DELETE' });
      setCards((prev) => prev.filter((c) => c.card_id !== deleteTarget.card_id));
      setTotal((prev) => prev - 1);
    } catch {
      setError('Could not delete card. It may be in use by a deck.');
    } finally {
      setDeleteTarget(null);
    }
  }

  const hasMore = cards.length < total;

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
          <>
            <div className="grid grid-cols-2 gap-3">
              {cards.map((card) => (
                <div key={card.card_id} className="relative">
                  <FlippableCard
                    cardName={card.card_name}
                    frontText={card.front_text}
                    frontImageUrl={card.front_image_url}
                    backText={card.back_text}
                    backImageUrl={card.back_image_url}
                    attributes={card.attributes}
                    isFlipped={!!flippedCards[card.card_id]}
                    isSelected={false}
                    onSelect={() =>
                      setFlippedCards((prev) => ({
                        ...prev,
                        [card.card_id]: !prev[card.card_id],
                      }))
                    }
                    size="library"
                  />
                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/cards/${card.card_id}/edit`)}
                    className="absolute top-2 left-2 w-7 h-7 bg-white rounded-full shadow border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 text-sm"
                    aria-label="Edit card"
                  >
                    ✎
                  </button>
                  {/* Delete */}
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

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : `See more (${total - cards.length} remaining)`}
                </button>
              </div>
            )}
          </>
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
