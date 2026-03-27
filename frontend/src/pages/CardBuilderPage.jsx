import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import CardPreview from '../components/cards/CardPreview';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function CardBuilderPage() {
  const { cardId } = useParams();
  const isEdit = Boolean(cardId);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('front');
  const [showRules, setShowRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  const [card, setCard] = useState({
    card_name: '',
    front_text: '',
    front_image_url: '',
    back_text: '',
    back_image_url: '',
    default_copies: 1,
    is_unique: false,
  });

  useEffect(() => {
    if (!isEdit) return;
    apiFetch(`/cards/${cardId}`)
      .then((data) => setCard({
        card_name: data.card_name || '',
        front_text: data.front_text || '',
        front_image_url: data.front_image_url || '',
        back_text: data.back_text || '',
        back_image_url: data.back_image_url || '',
        default_copies: data.default_copies || 1,
        is_unique: data.is_unique || false,
      }))
      .catch(() => setError('Could not load card.'))
      .finally(() => setLoading(false));
  }, [cardId, isEdit]);

  function update(field, value) {
    setCard((c) => ({ ...c, [field]: value }));
  }

  async function handleSave() {
    if (!card.card_name.trim()) { setError('Card name is required.'); return; }
    if (!card.front_text.trim()) { setError('Front text is required.'); return; }
    setError('');
    setSaving(true);
    try {
      const body = {
        card_name: card.card_name,
        front_text: card.front_text,
        front_image_url: card.front_image_url || null,
        back_text: card.back_text || null,
        back_image_url: card.back_image_url || null,
        default_copies: card.default_copies,
        is_unique: card.is_unique,
      };
      if (isEdit) {
        await apiFetch(`/cards/${cardId}`, { method: 'PUT', body });
      } else {
        await apiFetch('/cards', { method: 'POST', body });
      }
      navigate('/cards');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const isFront = activeTab === 'front';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-40">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-sm font-medium min-h-[44px] flex items-center">
          ← Back
        </button>
        <span className="font-semibold text-gray-900">{isEdit ? 'Edit Card' : 'New Card'}</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-blue-600 text-sm font-semibold disabled:opacity-50 min-h-[44px] flex items-center"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

      <main className="flex-1 px-4 pt-6 pb-8 flex flex-col items-center gap-6">
        {error && <p className="text-red-600 text-sm self-start">{error}</p>}

        {/* Card name */}
        <div className="w-full">
          <label htmlFor="card_name" className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
          <input
            id="card_name"
            type="text"
            value={card.card_name}
            onChange={(e) => update('card_name', e.target.value)}
            placeholder="e.g. Lightning Bolt"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Front / Back tabs */}
        <div className="flex w-full border border-gray-200 rounded-lg overflow-hidden">
          {['front', 'back'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Live preview */}
        <CardPreview
          frontText={card.front_text}
          frontImageUrl={card.front_image_url}
          backText={card.back_text}
          backImageUrl={card.back_image_url}
          showBack={!isFront}
        />

        {/* Text content */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isFront ? 'Front Text' : 'Back Text'} {isFront && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={isFront ? card.front_text : card.back_text}
            onChange={(e) => update(isFront ? 'front_text' : 'back_text', e.target.value)}
            placeholder={isFront ? 'What does this card say?' : 'Optional back content'}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Image URL */}
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isFront ? 'Front Image URL' : 'Back Image URL'} <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={isFront ? card.front_image_url : card.back_image_url}
            onChange={(e) => update(isFront ? 'front_image_url' : 'back_image_url', e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Card Rules toggle */}
        <button
          onClick={() => setShowRules((s) => !s)}
          className="self-start text-sm text-blue-600 font-medium"
        >
          {showRules ? 'Hide' : 'Show'} Card Rules
        </button>

        {showRules && (
          <div className="w-full bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Copies per Deck</label>
              <input
                type="number"
                min={1}
                max={20}
                value={card.default_copies}
                onChange={(e) => update('default_copies', Number(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Unique Card</p>
                <p className="text-xs text-gray-500">Only one copy can appear in a deck</p>
              </div>
              <button
                onClick={() => update('is_unique', !card.is_unique)}
                className={`w-12 h-6 rounded-full transition-colors ${card.is_unique ? 'bg-blue-600' : 'bg-gray-300'}`}
                role="switch"
                aria-checked={card.is_unique}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                    card.is_unique ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
