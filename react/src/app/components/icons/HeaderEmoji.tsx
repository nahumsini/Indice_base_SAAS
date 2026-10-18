import { useId } from 'react';
import headerFamily from '../../../assets/module-emojis/header-family-v1.png';

const frames = {
  company: [25, 345, 270, 280],
  messages: [325, 350, 295, 280],
  notifications: [635, 345, 285, 280],
  language: [940, 345, 285, 280],
  moon: [25, 700, 280, 290],
  learning: [320, 700, 300, 290],
  sun: [625, 690, 300, 300],
} as const;

type HeaderEmojiName = keyof typeof frames;

/** Decorative artwork only: the owning button keeps its label, state and action. */
export function HeaderEmoji({ name, className = 'size-7' }: {
  name: HeaderEmojiName;
  className?: string;
}) {
  const clipId = useId();
  const [x, y, width, height] = frames[name];
  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      className={`pointer-events-none shrink-0 overflow-hidden ${className}`}
      aria-hidden="true"
      focusable="false"
      data-header-emoji={name}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <image href={headerFamily} width="1280" height="1280" clipPath={`url(#${clipId})`} />
    </svg>
  );
}
