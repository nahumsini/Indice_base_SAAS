import { isValidElement, type ReactNode } from 'react';
import { IndiceEmoji } from './ModuleTabEmoji';

// Exact presentation identities; never infer a business operation from a localized title.
const iconArtwork: Record<string, string> = {
  User: 'person', UserRound: 'person', UserPlus: 'person', UserRoundCheck: 'person',
  Users: 'people', UsersRound: 'people', Contact: 'people',
  Building: 'company', Building2: 'company', Landmark: 'company',
  Calendar: 'calendar', CalendarDays: 'calendar', CalendarClock: 'calendar',
  CalendarCheck2: 'calendar', CalendarCheck: 'calendar', CalendarPlus: 'calendar', CalendarRange: 'calendar',
  Clock: 'stopwatch', Timer: 'stopwatch', History: 'history', FileClock: 'documents',
  Megaphone: 'megaphone', Bell: 'notifications', GraduationCap: 'learning',
  Gift: 'gift', CreditCard: 'card', WalletCards: 'card', Wallet: 'wallet',
  Banknote: 'coins', Coins: 'coins', HandCoins: 'coins', BadgeDollarSign: 'coins', DollarSign: 'coins',
  BadgePercent: 'calculator', Calculator: 'calculator',
  BookOpenCheck: 'books', BookOpen: 'books', Layers3: 'books', Layers: 'books',
  Briefcase: 'briefcase', BriefcaseBusiness: 'briefcase',
  Package: 'package', Package2: 'package', PackageCheck: 'package', PackagePlus: 'package', PackageSearch: 'package',
  Warehouse: 'warehouse', Tags: 'tag', Tag: 'tag', Barcode: 'qr', QrCode: 'qr',
  Clipboard: 'clipboard', ClipboardList: 'clipboard', ClipboardPlus: 'clipboard',
  ClipboardCheck: 'approval', ListChecks: 'checklist', Workflow: 'checklist',
  Check: 'check', CheckCheck: 'check', CheckCircle2: 'approval', CircleCheck: 'approval',
  FileText: 'documents', FilePlus2: 'documents', Files: 'documents', File: 'documents',
  Receipt: 'receipt', ReceiptText: 'receipt', FileSignature: 'minutes',
  FileDown: 'cloud-download', Download: 'cloud-download', CloudDownload: 'cloud-download',
  Upload: 'upload', UploadCloud: 'upload', CloudUpload: 'upload',
  Table: 'table', Table2: 'table', TableProperties: 'table', Rows3: 'table', Columns3: 'table',
  Settings: 'gear', Settings2: 'gear', SlidersHorizontal: 'gear', FolderCog: 'gear',
  Folder: 'folder', FolderOpen: 'folder', Handshake: 'handshake',
  Bot: 'robot', MessageSquare: 'messages', MessageSquareText: 'messages', MessageCircle: 'messages',
  Mail: 'mail', Globe: 'globe', Globe2: 'globe', Moon: 'moon', Sun: 'sun',
  MapPin: 'pin', MapPinned: 'pin', Map: 'pin',
  Image: 'photo', Images: 'photo', ImageIcon: 'photo', Camera: 'photo',
  Paperclip: 'attachment', Link: 'link', Link2: 'link', Save: 'save',
  ShieldCheck: 'shield', Shield: 'shield', Key: 'key', KeyRound: 'key', Lock: 'lock', LockKeyhole: 'lock',
  AlertTriangle: 'warning', TriangleAlert: 'warning', CircleAlert: 'warning',
  Trash: 'trash', Trash2: 'trash', Power: 'power', ScanFace: 'face-scan',
  RefreshCw: 'refresh', RotateCcw: 'refresh', RotateCw: 'refresh', Repeat: 'refresh',
  PanelLeft: 'layout', LayoutPanelTop: 'layout', PanelTop: 'layout',
  Pencil: 'pencil', PencilLine: 'pencil', PenLine: 'pencil', Plus: 'plus', PlusCircle: 'plus',
  Sparkles: 'sparkle', Printer: 'printer', Wrench: 'wrench',
  BarChart3: 'chart', ChartNoAxesCombined: 'chart', TrendingUp: 'chart',
};
const emojiArtwork: Record<string, string> = {
  '👤': 'person', '👥': 'people', '🏢': 'company', '🏠': 'home',
  '📅': 'calendar', '🗓': 'calendar', '⏱': 'stopwatch', '📢': 'megaphone',
  '💰': 'cashbox', '💸': 'expense', '💳': 'card', '💵': 'coins', '💼': 'briefcase',
  '📋': 'clipboard', '📝': 'minutes', '📑': 'documents', '📄': 'documents', '📚': 'books',
  '✅': 'check', '🎁': 'gift', '📊': 'chart', '📈': 'chart', '📦': 'package',
  '🤝': 'handshake', '🤖': 'robot', '🌐': 'globe', '🛠': 'wrench', '🔧': 'wrench',
  '🔁': 'refresh', '🔄': 'refresh', '⚙': 'gear', '🎯': 'target', '📎': 'attachment',
  '✉': 'mail', '📧': 'mail', '💬': 'messages', '🎟': 'calendar', '🖥': 'kiosk',
  '📥': 'inbox', '📤': 'upload', '⚠': 'warning', '🗑': 'trash', '🔒': 'lock',
};

export function resolveModalHeaderArtwork(icon: ReactNode): string | undefined {
  if (typeof icon === 'string') return emojiArtwork[icon.trim().replace(/\uFE0F/g, '')];
  if (!isValidElement<{ children?: ReactNode }>(icon)) return undefined;
  if (typeof icon.type === 'string') {
    return icon.type === 'span' ? resolveModalHeaderArtwork(icon.props.children) : undefined;
  }
  const name = (icon.type as { displayName?: string }).displayName;
  return name ? iconArtwork[name] : undefined;
}

/** Changes only decorative modal-header artwork, retaining each caller's action meaning. */
export function ModalHeaderEmoji({ icon, className = 'size-8' }: { icon: ReactNode; className?: string }) {
  const name = resolveModalHeaderArtwork(icon);
  return name ? <IndiceEmoji name={name} className={className} fallback={icon} /> : <>{icon}</>;
}
