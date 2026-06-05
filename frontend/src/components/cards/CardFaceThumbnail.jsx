// Renders a card's front face as a thumbnail.
//
// The card face is USER CONTENT, so it always sits on a white / very light
// background with dark text — never the dark app theme.
//
// Priority: front image  >  front text  >  light placeholder (name initial).
//
// Props:
//   imageUrl      - front_image_url (optional)
//   text          - front_text (optional)
//   name          - card / deck name, used for the placeholder initial + alt text
//   textClassName - tailwind size/weight classes for the text variant
//   className     - sizing / shape classes applied to the outer face
export default function CardFaceThumbnail({
  imageUrl,
  text,
  name,
  textClassName = 'text-xs',
  className = '',
}) {
  return (
    <div className={`bg-[#FAFAFA] overflow-hidden flex flex-col ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name || ''} className="w-full h-full object-cover" />
      ) : text ? (
        <div className="w-full h-full flex items-center justify-center p-2">
          <p className={`text-[#1A1A1A] text-center leading-tight line-clamp-5 break-words ${textClassName}`}>
            {text}
          </p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span className={`font-bold ${textClassName}`}>
            {name ? name.charAt(0).toUpperCase() : '🂠'}
          </span>
        </div>
      )}
    </div>
  );
}
