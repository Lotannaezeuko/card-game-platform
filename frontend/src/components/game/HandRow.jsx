// hand: [{ hand_id, card_id, card_name, front_text, front_image_url, back_text }]
// selectedId: hand_id of currently selected card
// onSelect: (hand_id | null) => void
export default function HandRow({ hand, selectedId, onSelect }) {
  if (!hand.length) {
    return (
      <div className="h-36 flex items-center justify-center">
        <span className="text-slate-500 text-sm">No cards in hand</span>
      </div>
    );
  }

  return (
    <div className="h-36 flex items-center gap-2 px-3 overflow-x-auto">
      {hand.map((card) => {
        const isSelected = card.hand_id === selectedId;
        return (
          <button
            key={card.hand_id}
            onClick={() => onSelect(isSelected ? null : card.hand_id)}
            className={`flex-none w-20 h-28 rounded-xl bg-white border-2 shadow transition-all duration-150 flex flex-col overflow-hidden focus:outline-none ${
              isSelected
                ? 'border-indigo-500 scale-105 shadow-indigo-300 shadow-lg -translate-y-2'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="bg-slate-100 px-1.5 py-1 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-700 truncate">{card.card_name}</p>
            </div>
            <div className="flex-1 flex items-center justify-center p-1.5">
              {card.front_image_url ? (
                <img
                  src={card.front_image_url}
                  alt={card.card_name}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <p className="text-xs text-slate-600 text-center leading-tight line-clamp-4">
                  {card.front_text}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
