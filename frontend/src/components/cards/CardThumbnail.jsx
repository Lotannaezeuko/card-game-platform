export default function CardThumbnail({ card, onClick, action, actionLabel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {card.front_image_url ? (
        <img src={card.front_image_url} alt="" className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
          No image
        </div>
      )}
      <div className="p-2 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-gray-900 truncate">{card.card_name}</p>
        <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{card.front_text}</p>
        {card.is_unique && (
          <span className="text-[10px] font-medium text-purple-600 bg-purple-50 rounded px-1 py-0.5 self-start">
            Unique
          </span>
        )}
      </div>
      {action && (
        <button
          onClick={() => action(card)}
          className="w-full py-2 text-xs font-semibold text-blue-600 border-t border-gray-100 hover:bg-blue-50 transition-colors min-h-[44px]"
        >
          {actionLabel || 'Add'}
        </button>
      )}
      {onClick && !action && (
        <button
          onClick={() => onClick(card)}
          className="w-full py-2 text-xs font-semibold text-gray-600 border-t border-gray-100 hover:bg-gray-50 transition-colors min-h-[44px]"
        >
          Select
        </button>
      )}
    </div>
  );
}
