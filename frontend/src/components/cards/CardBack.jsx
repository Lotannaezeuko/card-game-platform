// Card back face renderer.
// Fills whatever container it is rendered inside (absolute inset-0).
//
// Props:
//   backColour  - hex colour string e.g. '#1B3A5C'. Renders a solid colour background.
//   backPattern - pattern name string. Renders an SVG pattern on a dark background.
//
// Priority: backColour > backPattern > default (indigo diamond pattern)

const PATTERN_DEFS = {
  'diagonal-stripes': (
    <pattern
      id="cb-diagonal-stripes"
      x="0" y="0" width="10" height="10"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect x="0" y="0" width="5" height="10" fill="rgba(255,255,255,0.15)" />
    </pattern>
  ),
  'diamond-grid': (
    <pattern
      id="cb-diamond-grid"
      x="0" y="0" width="18" height="18"
      patternUnits="userSpaceOnUse"
    >
      <path d="M9 1 L17 9 L9 17 L1 9 Z" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
    </pattern>
  ),
  'polka-dots': (
    <pattern
      id="cb-polka-dots"
      x="0" y="0" width="14" height="14"
      patternUnits="userSpaceOnUse"
    >
      <circle cx="7" cy="7" r="2.5" fill="rgba(255,255,255,0.22)" />
    </pattern>
  ),
  'herringbone': (
    <pattern
      id="cb-herringbone"
      x="0" y="0" width="12" height="12"
      patternUnits="userSpaceOnUse"
    >
      <path d="M0 12 L6 6 L12 12 M0 6 L6 0 L12 6" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
    </pattern>
  ),
  'crosshatch': (
    <pattern
      id="cb-crosshatch"
      x="0" y="0" width="10" height="10"
      patternUnits="userSpaceOnUse"
    >
      <path d="M0 5 H10 M5 0 V10" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
    </pattern>
  ),
  'chevron': (
    <pattern
      id="cb-chevron"
      x="0" y="0" width="14" height="7"
      patternUnits="userSpaceOnUse"
    >
      <path d="M0 7 L7 0 L14 7" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />
    </pattern>
  ),
};

// Default pattern used when no backColour or backPattern is provided
const DEFAULT_PATTERN_DEF = (
  <pattern
    id="cb-diamonds"
    x="0" y="0" width="18" height="18"
    patternUnits="userSpaceOnUse"
  >
    <path d="M9 1 L17 9 L9 17 L1 9 Z" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
  </pattern>
);

export default function CardBack({ backColour, backPattern }) {
  // Solid colour — no SVG pattern needed
  if (backColour) {
    return (
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{ backgroundColor: backColour }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/20" />
        </div>
      </div>
    );
  }

  // SVG pattern on dark background
  const patternDef = (backPattern && PATTERN_DEFS[backPattern]) || DEFAULT_PATTERN_DEF;
  const patternId = backPattern ? `cb-${backPattern}` : 'cb-diamonds';
  const bgColour = 'bg-indigo-900';

  return (
    <div className={`absolute inset-0 rounded-xl overflow-hidden ${bgColour}`}>
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>{patternDef}</defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 rounded-full border-2 border-white/20" />
      </div>
    </div>
  );
}
