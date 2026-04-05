import CardBack from './CardBack';

export default function CardPreview({
  frontText,
  frontImageUrl,
  backText,
  backImageUrl,
  attributes = {},
  showBack = false,
}) {
  const text = showBack ? backText : frontText;
  const image = showBack ? backImageUrl : frontImageUrl;
  const backColour = attributes?.backColour || null;
  const backPattern = attributes?.backPattern || null;
  const hasBackStyle = showBack && (backColour || backPattern);

  // On the back tab: if a custom image exists, show it normally.
  // If a colour/pattern style is set, show the CardBack as background with text overlay.
  if (showBack && !image && hasBackStyle) {
    return (
      <div className="relative w-48 h-72 rounded-xl border-2 border-gray-200 shadow-md overflow-hidden select-none">
        <CardBack backColour={backColour} backPattern={backPattern} />
        {text && (
          <div className="absolute inset-0 flex items-start p-3 pointer-events-none">
            <p className="text-sm text-white leading-snug drop-shadow">{text}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-48 h-72 rounded-xl border-2 border-gray-200 bg-white shadow-md flex flex-col overflow-hidden select-none">
      {image ? (
        <img src={image} alt="" className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
          No image
        </div>
      )}
      <div className="flex-1 p-3 flex items-start">
        <p className="text-sm text-gray-800 leading-snug">
          {text || <span className="text-gray-300 italic">{showBack ? 'Back text…' : 'Front text…'}</span>}
        </p>
      </div>
    </div>
  );
}
