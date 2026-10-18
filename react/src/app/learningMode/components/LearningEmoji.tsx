import { IndiceEmoji } from '../../components/icons/ModuleTabEmoji';
const names: Record<string, string> = {
  '🗃️': 'cashbox', '🧾': 'receipt', '💵': 'coins', '🔓': 'lock', '🔑': 'key',
  '🔎': 'photo', '↕️': 'arrows', '👁️': 'photo', '🧹': 'refresh', '🩺': 'shield',
  '📈': 'chart', '🖨️': 'printer', '🖥️': 'kiosk', '📎': 'attachment', '📂': 'folder',
  '💡': 'sparkle', '🗺️': 'layout', '🎯': 'target', '🧭': 'target', '🧰': 'folder',
  '🛠️': 'wrench', '✅': 'check', '🔄': 'refresh', '💬': 'messages',
  '👥': 'people', '📅': 'calendar', '🗓️': 'calendar', '📊': 'chart', '📦': 'package',
  '📋': 'clipboard', '📝': 'pencil', '🔍': 'photo', '➕': 'plus', '🗂️': 'folder',
  '🏢': 'company', '💳': 'card', '💸': 'expense', '💰': 'coins', '⏱️': 'stopwatch',
  '📚': 'books', '🏬': 'warehouse', '🏪': 'kiosk', '📣': 'megaphone', '🎁': 'gift',
  '🤝': 'handshake', '⚙️': 'gear', '🔁': 'arrows', '🔧': 'wrench', '☕': 'receipt',
  '🛒': 'terminal', '🧑‍💼': 'person', '📤': 'upload', '📥': 'inbox', '📑': 'documents',
  '🧮': 'calculator', '🏦': 'company', '🧩': 'layout', '🏷️': 'tag', '💼': 'briefcase',
};
export function LearningEmoji({ symbol, className = 'size-4' }: { symbol: string; className?: string }) {
  return <span className="inline-flex align-middle"><IndiceEmoji name={names[symbol]} fallback={<span aria-hidden="true">{symbol}</span>} className={className} /></span>;
}
