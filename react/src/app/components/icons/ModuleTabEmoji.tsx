import { useId, type ReactNode, type ComponentProps } from 'react';
import tabFamily from '../../../assets/module-emojis/tab-family-v1.png';
import utilityFamily from '../../../assets/module-emojis/modal-utility-family-v1.png';
import actionFamily from '../../../assets/module-emojis/modal-action-family-v1.png';
import { OriginalModuleEmoji } from './OriginalModuleEmoji';
import { HeaderEmoji } from './HeaderEmoji';
import { moduleTabArtwork } from './moduleTabArtwork';

const symbols = [
  'person', 'stopwatch', 'megaphone', 'clipboard', 'check',
  'gift', 'card', 'books', 'warehouse', 'tag',
  'gear', 'handshake', 'robot', 'folder', 'calculator',
  'receipt', 'target', 'coins', 'kiosk', 'truck',
  'arrows', 'flask', 'ruler', 'inbox', 'funnel',
];
const moduleArt: Record<string, string> = {
  people: 'human-resources', calendar: 'scheduling', chart: 'kpis',
  briefcase: 'sales', checklist: 'processes-tasks', expense: 'expenses',
  cashbox: 'petty-cash', package: 'inventory', terminal: 'point-of-sale',
  minutes: 'minutes-control', mail: 'email', wrench: 'maintenance',
  wallet: 'receivables', home: 'home-panel', whiteboard: 'ideas-board',
};
const headerArt: Record<string, ComponentProps<typeof HeaderEmoji>['name']> = {
  company: 'company', messages: 'messages', globe: 'language',
  notifications: 'notifications', learning: 'learning', moon: 'moon', sun: 'sun',
};
const registry: Record<string, Record<string, string>> = moduleTabArtwork;

const utilitySymbols = [
  'warning', 'trash', 'lock', 'pin', 'attachment', 'photo', 'table', 'upload',
  'link', 'save', 'shield', 'key', 'documents', 'approval', 'refresh', 'layout',
];
const actionSymbols = ['plus', 'pencil', 'printer', 'qr', 'face-scan', 'power', 'cloud-download', 'sparkle', 'history'];

/** Shared decorative artwork for navigation, title bars and modal headers. */
export function IndiceEmoji({ name, fallback, className = 'size-5' }: {
  name?: string;
  fallback?: ReactNode;
  className?: string;
}) {
  const clipId = useId();
  if (!name) return <>{fallback}</>;
  if (moduleArt[name]) return <OriginalModuleEmoji id={moduleArt[name]} className={className} />;
  if (headerArt[name]) return <HeaderEmoji name={headerArt[name]} className={className} />;
  let sheet = tabFamily;
  let index = symbols.indexOf(name);
  let column = index % 5;
  let row = Math.floor(index / 5);
  let x = [25, 265, 512, 755, 995][column];
  let y = [40, 300, 528, 770, 1005][row];
  let width = [230, 245, 235, 235, 240][column];
  let height = [245, 225, 235, 235, 225][row];
  if (index < 0) {
    index = utilitySymbols.indexOf(name);
    if (index >= 0) {
      sheet = utilityFamily;
      column = index % 4;
      row = Math.floor(index / 4);
      x = [25, 335, 640, 940][column];
      y = [35, 335, 625, 910][row];
      width = [300, 285, 285, 300][column];
      height = [285, 285, 285, 310][row];
    } else {
      index = actionSymbols.indexOf(name);
      if (index < 0) return <>{fallback}</>;
      sheet = actionFamily;
      column = index % 3;
      row = Math.floor(index / 3);
      x = [20, 445, 845][column];
      y = [60, 455, 845][row];
      width = [420, 370, 385][column];
      height = [350, 365, 365][row];
    }
  }
  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      className={`pointer-events-none shrink-0 overflow-hidden ${className}`}
      aria-hidden="true"
      focusable="false"
      data-tab-emoji={name}
    >
      <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
      <image href={sheet} width="1254" height="1254" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

/** The owning tab retains visibility, labels and interaction. */
export function ModuleTabEmoji({ moduleId, tabId, fallback, className = 'size-5' }: {
  moduleId: string;
  tabId: string;
  fallback?: ReactNode;
  className?: string;
}) {
  return <IndiceEmoji name={registry[moduleId]?.[tabId]} fallback={fallback} className={className} />;
}
