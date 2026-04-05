import CardBack from '../cards/CardBack';

// card:   { card_name, front_text, front_image_url } | null
// hidden: when true and card is not null, shows a face-down stack instead of the card face
export default function DiscardPile({ card, hidden = false }) {
  if (!card) {
    return (
      <div className="w-20 h-28 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center">
        <span className="text-slate-500 text-xs text-center leading-tight px-1">Empty</span>
      </div>
    );
  }

  if (hidden) {
    // Face-down stack: two offset shadow cards + the top card showing CardBack
    return (
      <div className="relative w-20 h-28">
        {/* Stack shadow cards */}
        <div className="absolute inset-0 rounded-xl bg-indigo-950 border border-indigo-800 translate-x-1 translate-y-1" />
        <div className="absolute inset-0 rounded-xl bg-indigo-950 border border-indigo-800 translate-x-0.5 translate-y-0.5" />
        {/* Top face-down card */}
        <div className="absolute inset-0 rounded-xl overflow-hidden shadow-md">
          <CardBack />
        </div>
      </div>
    );
  }

  return (
    <div className="w-20 h-28 rounded-xl bg-white border-2 border-slate-300 shadow-md flex flex-col overflow-hidden">
      <div className="bg-slate-100 px-1.5 py-1 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-700 truncate">{card.card_name}</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-1.5">
        {card.front_image_url ? (
          <img src={card.front_image_url} alt={card.card_name} className="w-full h-full object-cover rounded" />
        ) : (
          <p className="text-xs text-slate-600 text-center leading-tight">{card.front_text}</p>
        )}
      </div>
    </div>
  );
}

// Face-down draw pile card
export function DrawPileCard({ empty }) {
  if (empty) {
    return (
      <div className="w-20 h-28 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center">
        <span className="text-slate-500 text-xs">Empty</span>
      </div>
    );
  }

  return (
    <div className="w-20 h-28 rounded-xl bg-indigo-800 border-2 border-indigo-600 shadow-md flex items-center justify-center">
      <div className="w-14 h-20 rounded-lg border border-indigo-500 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 opacity-50" />
      </div>
    </div>
  );
}
