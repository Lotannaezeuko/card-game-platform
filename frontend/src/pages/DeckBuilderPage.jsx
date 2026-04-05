import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import CardThumbnail from '../components/cards/CardThumbnail';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TOTAL_STEPS = 5;

export default function DeckBuilderPage() {
  const { deckId } = useParams();
  const isEdit = Boolean(deckId);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingDeck, setLoadingDeck] = useState(isEdit);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState('');

  // Deck settings
  const [deckName, setDeckName] = useState('');
  const [totalCards, setTotalCards] = useState('');
  const [shuffleBehaviour, setShuffleBehaviour] = useState('shuffle_before_game');
  const [duplicateHandling, setDuplicateHandling] = useState('allow_duplicates');

  // Card library + selection
  const [library, setLibrary] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCards, setSelectedCards] = useState([]); // { card_id, card_name, front_text, is_unique, quantity }

  // Derived
  const noDuplicates = duplicateHandling === 'no_duplicates';
  const totalSelected = selectedCards.reduce((sum, c) => sum + c.quantity, 0);

  // Load existing deck in edit mode
  useEffect(() => {
    if (!isEdit) return;
    apiFetch(`/decks/${deckId}`)
      .then((data) => {
        setDeckName(data.deck_name || '');
        setTotalCards(data.total_cards ?? '');
        setShuffleBehaviour(data.shuffle_behaviour || 'shuffle_before_game');
        setDuplicateHandling(data.duplicate_handling || 'allow_duplicates');
        if (data.cards) {
          setSelectedCards(data.cards.map((c) => ({
            card_id: c.card_id,
            card_name: c.card_name,
            front_text: c.front_text,
            is_unique: c.is_unique,
            quantity: c.quantity || 1,
          })));
        }
      })
      .catch(() => setError('Could not load deck.'))
      .finally(() => setLoadingDeck(false));
  }, [deckId, isEdit]);

  // Load card library when reaching step 3
  useEffect(() => {
    if (step !== 3 || library.length > 0) return;
    setLoadingCards(true);
    apiFetch('/cards')
      .then((data) => setLibrary(data.cards || []))
      .catch(() => setError('Could not load card library.'))
      .finally(() => setLoadingCards(false));
  }, [step, library.length]);

  function addCard(card) {
    setSelectedCards((prev) => {
      const exists = prev.find((c) => c.card_id === card.card_id);
      if (exists) return prev;
      // Respect deck no-duplicates rule and card uniqueness
      const qty = (noDuplicates || card.is_unique) ? 1 : (card.default_copies || 1);
      return [...prev, {
        card_id: card.card_id,
        card_name: card.card_name,
        front_text: card.front_text,
        is_unique: card.is_unique,
        quantity: qty,
      }];
    });
  }

  function removeCard(cardId) {
    setSelectedCards((prev) => prev.filter((c) => c.card_id !== cardId));
  }

  function changeQuantity(cardId, delta) {
    setSelectedCards((prev) =>
      prev.map((c) => {
        if (c.card_id !== cardId) return c;
        const maxQty = (noDuplicates || c.is_unique) ? 1 : 99;
        return { ...c, quantity: Math.min(maxQty, Math.max(1, c.quantity + delta)) };
      })
    );
  }

  async function handleSave() {
    if (!deckName.trim()) { setError('Deck name is required.'); setStep(1); return; }
    setError('');
    setSaving(true);
    try {
      const body = {
        deck_name: deckName,
        total_cards: totalCards ? Number(totalCards) : null,
        shuffle_behaviour: shuffleBehaviour,
        duplicate_handling: duplicateHandling,
      };

      let id = deckId;
      if (isEdit) {
        await apiFetch(`/decks/${deckId}`, { method: 'PUT', body });
      } else {
        const created = await apiFetch('/decks', { method: 'POST', body });
        id = created.deck_id;
      }

      for (const card of selectedCards) {
        await apiFetch(`/decks/${id}/cards`, {
          method: 'POST',
          body: { card_id: card.card_id, quantity: card.quantity },
        });
      }

      navigate('/decks');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredLibrary = library.filter(
    (c) =>
      c.card_name.toLowerCase().includes(search.toLowerCase()) ||
      c.front_text?.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingDeck) return <LoadingSpinner />;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-40">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
          className="text-gray-500 text-sm font-medium min-h-[44px] flex items-center"
        >
          ← {step > 1 ? 'Back' : 'Cancel'}
        </button>
        <span className="font-semibold text-gray-900 text-sm">
          {isEdit ? 'Edit Deck' : 'New Deck'} · {step}/{TOTAL_STEPS}
        </span>
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => {
              if (step === 1 && !deckName.trim()) { setError('Deck name is required.'); return; }
              setError('');
              setStep(step + 1);
            }}
            className="text-blue-600 text-sm font-semibold min-h-[44px] flex items-center"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-blue-600 text-sm font-semibold disabled:opacity-50 min-h-[44px] flex items-center"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </header>

      {/* Step indicator */}
      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <main className="flex-1 px-4 pt-6 pb-8 flex flex-col gap-5">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Step 1: Basic info */}
        {step === 1 && (
          <>
            <h2 className="font-bold text-gray-900 text-lg">Deck Details</h2>
            <Field label="Deck Name" required>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="e.g. My Party Deck"
                className={inputClass}
              />
            </Field>
            <Field label="Max cards in deck" hint="Optional. Sets the upper limit for how many cards this deck can contain.">
              <input
                type="number"
                min={1}
                value={totalCards}
                onChange={(e) => setTotalCards(e.target.value)}
                placeholder="e.g. 52"
                className={inputClass}
              />
            </Field>
          </>
        )}

        {/* Step 2: Deck rules */}
        {step === 2 && (
          <>
            <h2 className="font-bold text-gray-900 text-lg">Deck Rules</h2>
            <Field
              label="Shuffle deck before game?"
              hint="Should the deck be shuffled into a random order when the game starts?"
            >
              <select
                value={shuffleBehaviour}
                onChange={(e) => setShuffleBehaviour(e.target.value)}
                className={inputClass}
              >
                <option value="shuffle_before_game">Yes — shuffle randomly</option>
                <option value="no_shuffle">No — keep the order I add cards</option>
              </select>
            </Field>
            <Field
              label="Can the same card appear more than once?"
              hint="Controls whether you can add multiple copies of a card. Individual cards can also have their own uniqueness — a card marked Unique is always capped at 1 copy regardless of this setting."
            >
              <select
                value={duplicateHandling}
                onChange={(e) => setDuplicateHandling(e.target.value)}
                className={inputClass}
              >
                <option value="allow_duplicates">Yes — allow multiple copies of a card</option>
                <option value="no_duplicates">No — only one copy of each card</option>
              </select>
            </Field>
            {noDuplicates && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                With "no duplicates" selected, every card in this deck will be capped at 1 copy. You can still adjust quantities on the next step but they won't go above 1.
              </div>
            )}
          </>
        )}

        {/* Step 3: Card library */}
        {step === 3 && (
          <>
            <h2 className="font-bold text-gray-900 text-lg">Add Cards</h2>
            <p className="text-sm text-gray-500">
              {selectedCards.length} card type{selectedCards.length !== 1 ? 's' : ''} selected · {totalSelected} total copies
            </p>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
              className={inputClass}
            />
            {loadingCards && <LoadingSpinner />}
            {!loadingCards && filteredLibrary.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No cards found.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {filteredLibrary.map((card) => {
                const added = selectedCards.some((c) => c.card_id === card.card_id);
                return (
                  <CardThumbnail
                    key={card.card_id}
                    card={card}
                    action={added ? () => removeCard(card.card_id) : addCard}
                    actionLabel={added ? 'Remove' : 'Add'}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Step 4: Quantities */}
        {step === 4 && (
          <>
            <h2 className="font-bold text-gray-900 text-lg">Set Quantities</h2>

            {/* Running tally */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-blue-700 font-medium">Cards in deck</span>
              <span className="text-xl font-bold text-blue-700">{totalSelected}</span>
            </div>

            {noDuplicates && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                This deck is set to "no duplicates" — each card is capped at 1 copy.
              </div>
            )}

            {selectedCards.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No cards added yet. Go back to step 3.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {selectedCards.map((card) => {
                  const capped = noDuplicates || card.is_unique;
                  return (
                    <li
                      key={card.card_id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{card.card_name}</p>
                          {card.is_unique && (
                            <span className="text-[10px] font-medium text-purple-600 bg-purple-50 rounded px-1 py-0.5 shrink-0">Unique</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{card.front_text}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => changeQuantity(card.card_id, -1)}
                          disabled={card.quantity <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-gray-900">{card.quantity}</span>
                        <button
                          onClick={() => changeQuantity(card.card_id, 1)}
                          disabled={capped}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                          title={capped ? (card.is_unique ? 'This card is unique — max 1 copy' : 'Deck is set to no duplicates') : undefined}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeCard(card.card_id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 ml-1"
                          aria-label="Remove card from deck"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* Step 5: Overview */}
        {step === 5 && (
          <>
            <h2 className="font-bold text-gray-900 text-lg">Review Deck</h2>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
              <Row label="Name" value={deckName} />
              {totalCards && <Row label="Max cards" value={totalCards} />}
              <Row label="Cards selected" value={`${selectedCards.length} types · ${totalSelected} total copies`} />
              <Row label="Shuffle" value={shuffleBehaviour === 'shuffle_before_game' ? 'Before game' : 'None'} />
              <Row label="Duplicates" value={noDuplicates ? 'One copy per card' : 'Multiple copies allowed'} />
            </div>

            {selectedCards.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {selectedCards.map((card) => (
                  <div key={card.card_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                    <p className="text-sm font-semibold text-gray-900 truncate">{card.card_name}</p>
                    <p className="text-xs text-gray-500">×{card.quantity}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Small helpers
const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-0.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
