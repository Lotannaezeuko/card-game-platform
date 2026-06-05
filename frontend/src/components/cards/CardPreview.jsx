import { useRef, useEffect } from 'react';
import CardBack from './CardBack';

// Live preview of a card face.
//
// The front text can be edited directly on the card face when `editableFrontText`
// is set — the lower text region becomes a contenteditable element wired to
// `onFrontTextChange`. The image region (top) is clickable via `onImageClick`
// (used by the builder to open the file picker).
//
// The card face itself is always white with dark text — it is user content and
// must never take the dark app theme.
export default function CardPreview({
  frontText,
  frontImageUrl,
  backText,
  backImageUrl,
  attributes = {},
  showBack = false,
  editableFrontText = false,
  onFrontTextChange,
  onImageClick,
}) {
  const text = showBack ? backText : frontText;
  const image = showBack ? backImageUrl : frontImageUrl;
  const backColour = attributes?.backColour || null;
  const backPattern = attributes?.backPattern || null;
  const hasBackStyle = showBack && (backColour || backPattern);

  // The contenteditable region is uncontrolled: we seed its text from state when
  // it changes externally (e.g. loading a card to edit), but never while the user
  // is typing in it — otherwise the caret would jump to the start each keystroke.
  const editRef = useRef(null);
  useEffect(() => {
    const el = editRef.current;
    if (!el || document.activeElement === el) return;
    const next = frontText || '';
    if (el.textContent !== next) el.textContent = next;
  }, [frontText, showBack, editableFrontText, image]);

  // Back face with a colour / pattern style (and no custom image)
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

  const showEditable = editableFrontText && !showBack;

  return (
    <div className="w-48 h-72 rounded-xl border-2 border-gray-200 bg-white shadow-md flex flex-col overflow-hidden">
      {image ? (
        <img
          src={image}
          alt=""
          onClick={onImageClick}
          className={`w-full h-36 object-cover ${onImageClick ? 'cursor-pointer' : ''}`}
        />
      ) : (
        <div
          onClick={onImageClick}
          className={`w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-sm ${onImageClick ? 'cursor-pointer' : ''}`}
        >
          No image
        </div>
      )}
      <div className="flex-1 p-3 flex items-start min-h-0 overflow-hidden">
        {showEditable ? (
          <div
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Front text"
            data-placeholder="Tap to edit"
            onClick={(e) => e.stopPropagation()}
            onInput={(e) => onFrontTextChange && onFrontTextChange(e.currentTarget.textContent)}
            className="ce-placeholder w-full max-h-full overflow-y-auto text-sm text-gray-800 leading-snug outline-none cursor-text select-text rounded border border-dashed border-gray-300 focus:border-amber-400 px-1.5 py-1"
          />
        ) : (
          <p className="text-sm text-gray-800 leading-snug whitespace-pre-wrap">
            {text || <span className="text-gray-300 italic">{showBack ? 'Back text…' : 'Front text…'}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
