import FlippableCard from '../cards/FlippableCard';

// hand:          [{ hand_id, card_id, card_name, front_text, front_image_url, back_text, back_image_url }]
// selectedId:    hand_id of currently selected card (or null)
// onSelect:      (hand_id | null) => void
// flippedCardId: hand_id of whichever card is currently flipped (or null), managed by parent
export default function HandRow({ hand, selectedId, onSelect, flippedCardId }) {
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
          <FlippableCard
            key={card.hand_id}
            cardName={card.card_name}
            frontText={card.front_text}
            frontImageUrl={card.front_image_url}
            backText={card.back_text}
            backImageUrl={card.back_image_url}
            isSelected={isSelected}
            isFlipped={card.hand_id === flippedCardId}
            onSelect={() => onSelect(isSelected ? null : card.hand_id)}
            size="hand"
          />
        );
      })}
    </div>
  );
}
