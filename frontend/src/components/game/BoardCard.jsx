import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import FlippableCard from '../cards/FlippableCard';

export default function BoardCard({ card }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `board-${card.hand_id}`,
    data: { type: 'board-card', card },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: card.x,
        top: card.y,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
      {...listeners}
      {...attributes}
    >
      <FlippableCard
        cardName={card.card_name}
        frontText={card.front_text}
        frontImageUrl={card.front_image_url}
        backText={card.back_text}
        backImageUrl={card.back_image_url}
        attributes={card.attributes}
        isSelected={false}
        isFlipped={isFlipped}
        onSelect={() => setIsFlipped((f) => !f)}
        size="hand"
      />
      <p className="text-center text-xs text-slate-400 mt-0.5 truncate w-20">
        {card.placedBy}
      </p>
    </div>
  );
}
