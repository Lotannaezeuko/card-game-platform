import CardBack from './CardBack';

/**
 * Props:
 *   cardName       – displayed in the card header / name row
 *   frontText      – text on the front face
 *   frontImageUrl  – image on the front face
 *   backText       – text on the back face
 *   backImageUrl   – image on the back face
 *   isSelected     – shows a selection ring (hand mode)
 *   isFlipped      – controlled externally; drives the CSS 3D flip
 *   onSelect       – called when the card is tapped
 *   size           – 'hand' | 'library'  (default 'hand')
 */
export default function FlippableCard({
  cardName,
  frontText,
  frontImageUrl,
  backText,
  backImageUrl,
  isSelected = false,
  isFlipped = false,
  onSelect,
  size = 'hand',
}) {
  const isHand = size === 'hand';
  const hasBackContent = backText || backImageUrl;

  // ── Sizing ───────────────────────────────────────────────────────
  // hand:    matches existing HandRow card dimensions
  // library: full-width, fixed height that mirrors the old CardThumbnail
  const outerClass = isHand
    ? 'flex-none w-20 h-28'
    : 'w-full h-48';

  // ── Selection visual (hand only) ─────────────────────────────────
  const selectionClass = isSelected && isHand
    ? 'scale-105 -translate-y-2'
    : '';

  const frontBorderClass = isSelected
    ? 'border-indigo-500'
    : isHand ? 'border-slate-300' : 'border-gray-100';

  const shadowClass = isSelected
    ? 'shadow-lg shadow-indigo-200'
    : 'shadow-sm';

  return (
    <div
      className={`${outerClass} cursor-pointer transition-transform duration-150 ${selectionClass}`}
      style={{ perspective: '800px' }}
      onClick={onSelect}
    >
      {/* ── 3D flip container ───────────────────────────────────── */}
      <div
        className={`relative w-full h-full rounded-xl ${shadowClass}`}
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >

        {/* ── Front face ──────────────────────────────────────── */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden bg-white border-2 ${frontBorderClass} flex flex-col`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {isHand ? (
            <>
              {/* Name header */}
              <div className="flex-none bg-slate-100 px-1.5 py-1 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-700 truncate">{cardName}</p>
              </div>
              {/* Image or text */}
              <div className="flex-1 flex items-center justify-center p-1.5 min-h-0">
                {frontImageUrl ? (
                  <img
                    src={frontImageUrl}
                    alt={cardName}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <p className="text-xs text-slate-600 text-center leading-tight line-clamp-4">
                    {frontText}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Image */}
              {frontImageUrl ? (
                <img src={frontImageUrl} alt="" className="w-full h-24 object-cover flex-none" />
              ) : (
                <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-300 text-xs flex-none">
                  No image
                </div>
              )}
              {/* Name + text */}
              <div className="p-2 flex flex-col gap-0.5 flex-1 min-h-0">
                {cardName && (
                  <p className="text-xs font-semibold text-gray-900 truncate">{cardName}</p>
                )}
                <p className="text-xs text-gray-500 line-clamp-3 leading-snug">{frontText}</p>
              </div>
            </>
          )}
        </div>

        {/* ── Back face ───────────────────────────────────────── */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {hasBackContent ? (
            <div className="absolute inset-0 bg-white border-2 border-slate-200 rounded-xl flex flex-col overflow-hidden">
              {backImageUrl && (
                <img
                  src={backImageUrl}
                  alt=""
                  className={`w-full ${isHand ? 'h-16' : 'h-24'} object-cover flex-none`}
                />
              )}
              <div className="flex-1 flex items-center justify-center p-2 min-h-0">
                {backText && (
                  <p
                    className={`${
                      isHand ? 'text-xs' : 'text-sm'
                    } text-slate-700 text-center leading-tight line-clamp-4`}
                  >
                    {backText}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <CardBack />
          )}
        </div>

      </div>
    </div>
  );
}
