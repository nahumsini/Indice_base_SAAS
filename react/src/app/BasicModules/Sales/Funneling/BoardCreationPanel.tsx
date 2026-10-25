import { Plus, X } from 'lucide-react';
import type { BoardCreationGroup } from './ideasBoardLayout';
import type { BoardContent } from './ideasBoardModel';
import { BoardToolEmoji } from './BoardToolEmoji';
import { boardWorkbenchCopy } from './boardWorkbenchCopy';

/** Non-modal disclosure outside the gesture surface; it never changes camera or document state on open. */
export function BoardCreationPanel({ id, groups, content, locale, overview, disabled, onCreate, onFocus, onClose }: {
  id: string; groups: BoardCreationGroup[]; content: BoardContent; locale: string;
  overview: string; disabled: boolean;
  onCreate: (group: BoardCreationGroup) => void;
  onFocus: (region?: string) => void;
  onClose: () => void;
}) {
  const c = boardWorkbenchCopy(locale);
  return <aside id={id} className="board-creation-panel" aria-label={c.addToBoard}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <header>
      <div><h3>{c.addToBoard}</h3><p>{c.chooseCategory}</p></div>
      <button type="button" className="idea-board-button" aria-label={c.closePanel} onClick={onClose}><X size={18}/></button>
    </header>
    <div className="board-creation-categories">
      {groups.map(group => { const count=content.nodes.filter(group.matches).length; return <div className="system-domain-card" data-category={group.id} key={group.id}>
        <button type="button" className="system-domain-add" disabled={disabled} aria-label={group.addLabel} onClick={() => onCreate(group)}>
          {group.icon}<span>{group.label}<small>{count} {count===1?c.element:c.elements}</small></span><Plus size={17}/>
        </button>
        <button type="button" className="system-domain-focus" disabled={disabled} title={`${c.view}: ${group.label}`} aria-label={`${c.view}: ${group.label}`} onClick={() => onFocus(group.id)}><BoardToolEmoji name="fit"/></button>
      </div>; })}
    </div>
    <button type="button" className="idea-board-button board-creation-overview" disabled={disabled} onClick={() => onFocus()}><BoardToolEmoji name="fit"/>{overview}</button>
  </aside>;
}
