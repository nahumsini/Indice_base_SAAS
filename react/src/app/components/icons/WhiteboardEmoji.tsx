import { useId } from 'react';

/** Local vector artwork stays crisp in navigation, project cards and both themes. */
export function WhiteboardEmoji({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 96 96" className={`${className ?? ''} pointer-events-none shrink-0`} aria-hidden="true" focusable="false" data-module-emoji="ideas-board">
      <defs>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#D9E7F1" /><stop offset="1" stopColor="#7896AD" />
        </linearGradient>
        <linearGradient id={`${id}-surface`} x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#EAF3F8" />
        </linearGradient>
        <linearGradient id={`${id}-note`} x1="0" y1="0" x2="0.7" y2="1">
          <stop stopColor="#FFEBA1" /><stop offset="1" stopColor="#F6BF42" />
        </linearGradient>
        <linearGradient id={`${id}-pen`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#69A6FF" /><stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <ellipse cx="47" cy="88" rx="34" ry="4" fill="#183752" opacity=".13" />
      <path d="M28 58 19 86M66 58 75 86M47 61v24" stroke="#607F98" strokeWidth="6" strokeLinecap="round" />
      <path d="m29 58-9 27m46-27 8 27" stroke="#B8CFDE" strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="10" width="82" height="58" rx="8" fill="#36566D" opacity=".16" />
      <rect x="7" y="7" width="82" height="58" rx="8" fill={`url(#${id}-frame)`} />
      <rect x="11" y="11" width="74" height="50" rx="5" fill={`url(#${id}-surface)`} />
      <path d="M16 13h64" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="19" y="22" width="22" height="23" rx="2" fill="#C49630" opacity=".15" transform="rotate(-5 30 33)" />
      <rect x="18" y="20" width="22" height="23" rx="2" fill={`url(#${id}-note)`} transform="rotate(-5 29 31)" />
      <path d="m23 27 11-1m-11 6 8-.7" stroke="#B28024" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      <rect x="49" y="20" width="19" height="18" rx="2" fill="#FF9D8F" transform="rotate(6 58 29)" />
      <path d="m54 26 8 1m-9 4 6 .6" stroke="#CD5D51" strokeWidth="2" strokeLinecap="round" />
      <path d="m46 48 6-5 7 5 9-9" fill="none" stroke="#1D9B88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m64 39 4 0 0 4" fill="none" stroke="#1D9B88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="12" y="59" width="72" height="6" rx="3" fill="#90ABBD" />
      <rect x="23" y="57" width="19" height="4" rx="2" fill="#FF6B5E" />
      <g transform="rotate(36 77 61)">
        <rect x="73" y="40" width="8" height="35" rx="3" fill={`url(#${id}-pen)`} />
        <rect x="73" y="39" width="8" height="9" rx="2" fill="#254A79" />
        <path d="m73 74 4 9 4-9" fill="#D7E2EA" /><path d="m75.5 79 1.5 4 1.5-4" fill="#254A79" />
        <path d="M75 50v18" stroke="#B2D3FF" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
