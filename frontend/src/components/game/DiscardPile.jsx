import CardBack from '../cards/CardBack';

// Renders a face-down card back from a representative deck card.
// backCard: { back_image_url, attributes: { backColour, backPattern } } | null
// Priority mirrors FlippableCard's back face: custom image > colour/pattern > default.
function CardBackFace({ backCard }) {
  const backImageUrl = backCard?.back_image_url || null;
  if (backImageUrl) {
    return <img src={backImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />;
  }
  return (
    <CardBack
      backColour={backCard?.attributes?.backColour || null}
      backPattern={backCard?.attributes?.backPattern || null}
    />
  );
}

// card:     { card_name, front_text, front_image_url } | null
// hidden:   when true and card is not null, shows a face-down stack instead of the card face
// backCard: representative deck card used to render the back design
export default function DiscardPile({ card, hidden = false, backCard }) {
  if (!card) {
    return (
      <div className="w-24 h-36 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
        <span className="text-textFaint text-xs text-center leading-tight px-1">Empty</span>
      </div>
    );
  }

  if (hidden) {
    // Face-down stack: two offset shadow cards + the top card showing the deck's back
    return (
      <div className="relative w-24 h-36">
        {/* Stack shadow cards */}
        <div className="absolute inset-0 rounded-xl bg-surface border border-border translate-x-1 translate-y-1" />
        <div className="absolute inset-0 rounded-xl bg-surface border border-border translate-x-0.5 translate-y-0.5" />
        {/* Top face-down card */}
        <div className="absolute inset-0 rounded-xl overflow-hidden shadow-md">
          <CardBackFace backCard={backCard} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-24 h-36 rounded-xl bg-white border-2 border-slate-300 shadow-lg flex flex-col overflow-hidden">
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

// Face-down draw pile — shows the deck's card-back design as a stack
export function DrawPileCard({ empty, backCard }) {
  if (empty) {
    return (
      <div className="w-24 h-36 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
        <span className="text-textFaint text-xs">Empty</span>
      </div>
    );
  }

  return (
    <div className="relative w-24 h-36">
      {/* Stacked shadow cards for depth */}
      <div className="absolute inset-0 rounded-xl bg-surface border border-border translate-x-1 translate-y-1" />
      <div className="absolute inset-0 rounded-xl bg-surface border border-border translate-x-0.5 translate-y-0.5" />
      {/* Top face-down card showing the deck's designed back */}
      <div className="absolute inset-0 rounded-xl overflow-hidden shadow-lg">
        <CardBackFace backCard={backCard} />
      </div>
    </div>
  );
}
