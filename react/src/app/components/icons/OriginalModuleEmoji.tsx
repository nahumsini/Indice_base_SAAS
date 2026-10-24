import { useId } from 'react';
import { WhiteboardEmoji } from './WhiteboardEmoji';
import originalFamily from '../../../assets/module-emojis/original-family-transparent-v1.png';
import tabFamily from '../../../assets/module-emojis/tab-family-v1.png';
import communicationFamily from '../../../assets/module-emojis/meetings-email-v1.png';

// Transparent artwork preserves the same presentation in light and dark themes.
const frames: Record<string, string> = {
  files: '755 528 235 235',
  'home-panel': '25 140 310 245',
  'human-resources': '415 145 280 240',
  'processes-tasks': '780 145 245 240',
  sales: '1100 140 300 245',
  'point-of-sale': '45 435 260 265',
  inventory: '410 455 275 245',
  expenses: '775 450 265 250',
  'petty-cash': '1110 465 300 235',
  receivables: '35 745 285 255',
  kpis: '425 750 280 245',
  'sales-board': '425 750 280 245',
  scheduling: '780 755 245 245',
  maintenance: '1110 745 300 255',
  'minutes-control': '35 330 590 630',
  email: '630 330 610 630',
};

export function hasOriginalModuleEmoji(id?: string): boolean {
  return id === 'ideas-board' || Boolean(id && frames[id]);
}

export function OriginalModuleEmoji({ id, className = 'h-full w-[72px]' }: { id: string; className?: string }) {
  const clipId = useId();
  if (id === 'ideas-board') return <WhiteboardEmoji className={className} />;
  const [x, y, width, height] = frames[id].split(' ').map(Number);
  const isCommunication = id === 'minutes-control' || id === 'email';
  return (
    <svg
      viewBox={frames[id]}
      aria-hidden="true"
      focusable="false"
      className={`${className} shrink-0 overflow-hidden`}
      preserveAspectRatio="xMidYMid meet"
      data-module-emoji={id}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clipId})`}
        href={id === 'files' ? tabFamily : isCommunication ? communicationFamily : originalFamily}
        width={id === 'files' ? 1254 : isCommunication ? 1280 : 1448}
        height={id === 'files' ? 1254 : isCommunication ? 1280 : 1086}
      />
    </svg>
  );
}
