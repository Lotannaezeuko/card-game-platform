import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import CardFaceThumbnail from '../components/cards/CardFaceThumbnail';

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
    <div className="flex flex-col min-h-screen bg-bg">
      <TopBar title="My Decks" />
      <main className="flex-1 px-4 pt-6" style={{ paddingBottom: 'calc(var(--nav-height) + 2rem)' }}>
        {loading && <LoadingSpinner />}
        {error && <p className="text-error text-sm">{error}</p>}

        {!loading && !error && decks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-textMuted text-sm mb-4">No decks yet. Build your first one!</p>
            <button
              onClick={() => navigate('/decks/new')}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              Build Deck
            </button>
          </div>
        )}

        {!loading && decks.length > 0 && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {decks.map((deck) => (
              <li key={deck.deck_id} className="relative group">
                <button
                  onClick={() => navigate(`/decks/${deck.deck_id}/edit`)}
                  className="w-full panel overflow-hidden flex flex-col text-left transition-colors hover:border-borderAccent"
                  aria-label={`Open ${deck.deck_name}`}
                >
                  {/* Thumbnail — the deck's first card face (image or text on white) */}
                  <div className="relative aspect-[3/4] w-full">
                    <CardFaceThumbnail
                      imageUrl={deck.cover_image_url}
                      text={deck.cover_text}
                      name={deck.deck_name}
                      textClassName="text-sm font-semibold"
                      className="w-full h-full"
                    />
                    {/* Card count badge */}
                    <span className="absolute top-2 right-2 bg-accentMuted text-accent text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
                      {deck.card_count ?? 0}
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="font-semibold text-text text-sm truncate">{deck.deck_name}</p>
                    <p className="text-xs text-textMuted mt-0.5">
                      {deck.card_count ?? '—'} {deck.card_count === 1 ? 'card' : 'cards'}
                    </p>
                  </div>
                </button>
                {/* Delete overlay button */}
                <button
                  onClick={() => setDeleteTarget(deck)}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-bg/70 backdrop-blur border border-border flex items-center justify-center text-error text-base leading-none hover:bg-error hover:text-white transition-colors"
                  aria-label="Delete deck"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/decks/new')}
        className="fixed right-4 w-14 h-14 bg-accent text-black rounded-full shadow-[var(--shadow-accent)] flex items-center justify-center text-2xl hover:bg-accentHover transition-colors z-40"
        style={{ bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 16px)' }}
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
