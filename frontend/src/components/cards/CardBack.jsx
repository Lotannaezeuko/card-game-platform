// Generic card-back face — shown when a card has no back content.
// Fills whatever container it's rendered inside (absolute inset-0).
export default function CardBack() {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden bg-indigo-900">
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="cb-diamonds"
            x="0"
            y="0"
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M9 1 L17 9 L9 17 L1 9 Z"
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cb-diamonds)" />
      </svg>
      {/* Centre emblem */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 rounded-full border-2 border-white/20" />
      </div>
    </div>
  );
}
