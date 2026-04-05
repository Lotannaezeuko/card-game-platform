import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api';
import CardPreview from './CardPreview';
import LoadingSpinner from '../ui/LoadingSpinner';

function CameraIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  );
}

/**
 * Self-contained card builder form.
 *
 * Props:
 *   cardId    – if provided, loads and edits that card (edit mode)
 *   onSaved   – called with the saved card object after a successful save
 *   onCancel  – called when the user taps Back / Cancel
 */
export default function CardBuilderForm({ cardId, onSaved, onCancel }) {
  const isEdit = Boolean(cardId);

  const [activeTab, setActiveTab] = useState('front');
  const [showRules, setShowRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef(null);

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

  const isFront = activeTab === 'front';
  const currentImageField = isFront ? 'front_image_url' : 'back_image_url';
  const currentImageUrl = isFront ? card.front_image_url : card.back_image_url;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      update(currentImageField, data.url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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
      let saved;
      if (isEdit) {
        saved = await apiFetch(`/cards/${cardId}`, { method: 'PUT', body });
      } else {
        saved = await apiFetch('/cards', { method: 'POST', body });
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 sticky top-0 z-40">
        <button onClick={onCancel} className="text-gray-500 text-sm font-medium min-h-[44px] flex items-center">
          ← {isEdit ? 'Back' : 'Cancel'}
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

        {/* Interactive card preview — tap to upload image */}
        <div
          className="relative"
          onClick={!uploading ? () => fileInputRef.current?.click() : undefined}
          style={{ cursor: uploading ? 'default' : 'pointer' }}
        >
          <CardPreview
            frontText={card.front_text}
            frontImageUrl={card.front_image_url}
            backText={card.back_text}
            backImageUrl={card.back_image_url}
            showBack={!isFront}
          />
          {!currentImageUrl && !uploading && (
            <div className="absolute top-0 left-0 right-0 h-36 flex flex-col items-center justify-center pointer-events-none">
              <CameraIcon className="w-8 h-8 text-gray-300" />
              <span className="text-xs text-gray-400 mt-1">Tap to add image</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center rounded-xl">
              <LoadingSpinner />
            </div>
          )}
          {currentImageUrl && !uploading && (
            <div className="absolute top-2 right-2 bg-black/40 rounded-full p-1 pointer-events-none">
              <CameraIcon className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={handleFileChange}
        />
        {uploadError && <p className="text-red-600 text-xs self-start -mt-4">{uploadError}</p>}

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

        {/* Paste image URL fallback */}
        <div className="w-full">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Or paste image URL <span className="font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={currentImageUrl}
            onChange={(e) => update(currentImageField, e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
