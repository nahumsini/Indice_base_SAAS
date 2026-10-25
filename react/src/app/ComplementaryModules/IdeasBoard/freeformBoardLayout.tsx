import {FiveSFields} from './FiveSFields';
import {FiveSNodeContent} from './FiveSNodeContent';
import {fiveSCopy} from './fiveSCopy';
import {fiveSNodeText,validFiveSAction} from './fiveSModel';
import {sameBoardIdeas} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import type { IdeasBoardLayout } from '../../BasicModules/Sales/Funneling/ideasBoardLayout';
import { clamp, fitBoard, type BoardContent, type IdeaNode } from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import { ideasBoardCopy } from '../../BasicModules/Sales/Funneling/ideasBoardCopy';
import { systemBoardLayout } from './systemBoardLayout';
import { SystemElementFields } from './SystemElementFields';
import { SystemNodeContent } from './SystemNodeContent';
import { symbols, type DiagnosticNode } from './systemBoardModel';
import { workspaceCopy } from './workspaceCopy';

/** The personal owner reuses its diagnostic catalogs without adding regions to the free canvas. */
export function catalogNode(node: IdeaNode): DiagnosticNode | null {
  if (!node.catalog) return null;
  const { catalog, ...base } = node;
  return { ...base, ...catalog };
}
export function withCatalog(node: DiagnosticNode): IdeaNode {
  const { category, icon, steps, offeringType, ...base } = node;
  return { ...base, catalog: { category, icon, ...(steps?.length ? { steps } : {}), ...(offeringType ? { offeringType } : {}) } };
}
export const freeformNodeBounds = (node: IdeaNode) => ({ left: -10000, top: -10000, right: node.kind === 'DRAWING' ? 10000 : 11000, bottom: node.kind === 'DRAWING' ? 10000 : 10800 });

function placeCatalogNode(node: DiagnosticNode, content: BoardContent, point?: {x:number;y:number}): IdeaNode | null {
  if (content.nodes.length >= 100) return null;
  const view = content.viewport;
  const left = clamp(point ? point.x - node.width / 2 : (80 - view.x) / view.zoom, -10000, 9800);
  const top = clamp(point ? point.y - node.height / 2 : (80 - view.y) / view.zoom, -10000, 9800);
  let x = left, y = top;
  for (let slot = 0; slot < 100; slot++) {
    x = clamp(left + (slot % 5) * 220, -10000, 10000);
    y = clamp(top + Math.floor(slot / 5) * 150, -10000, 10000);
    if (!content.nodes.some(n => n.x < x + node.width && n.x + n.width > x && n.y < y + node.height && n.y + n.height > y)) break;
  }
  return withCatalog({ ...node, x, y });
}

export function freeformBoardLayout(locale: string): IdeasBoardLayout {
  const source = systemBoardLayout(locale), editor = source.editor!, copy = ideasBoardCopy(locale);
  const groups = source.creationGroups!.map(group => ({ ...group,
    matches: (node: IdeaNode) => { const catalog = catalogNode(node); return !!catalog && group.matches(catalog); },
    create: (content: BoardContent, point?: {x:number;y:number}) => { const node = group.create(content) as DiagnosticNode | null; return node ? placeCatalogNode(node, content, point) : null; },
  }));
  return {
    kind: 'FREEFORM', title: workspaceCopy(locale).myBoard, subtitle: copy.subtitle,
    overview: copy.fit, emblem: source.emblem, backdrop: null, minZoom: .25, regions: [],
    creationGroups: groups,
    editor: {
      ...editor,
      matches: node => node.fiveS?.role==='ACTION'||!!catalogNode(node),
      isValid: node => { if(node.fiveS)return validFiveSAction(node);const catalog = catalogNode(node); return !catalog || editor.isValid?.(catalog) !== false; },
      title: (node, fresh) => node.fiveS?fiveSCopy(locale).edit:editor.title(catalogNode(node)!, fresh),
      description: node => node.fiveS?node.fiveS.area:editor.description(catalogNode(node)!),
      icon: node => node.fiveS?<span>🧹</span>:editor.icon(catalogNode(node)!),
      saveLabel: node => node.fiveS?fiveSCopy(locale).save:editor.saveLabel!(catalogNode(node)!),
      render: context => context.node.fiveS?<FiveSFields {...context}/>:<SystemElementFields {...context} bounds={freeformNodeBounds(context.node)} node={catalogNode(context.node)!} onChange={node => context.onChange(withCatalog(node as DiagnosticNode))} />,
    },
    prepare: node => node,
    move: (node, dx, dy) => ({ ...node, x: clamp(node.x + dx, -10000, 10000), y: clamp(node.y + dy, -10000, 10000) }),
    bounds: freeformNodeBounds,
    sameIdeas: sameBoardIdeas,
    fit: (nodes, width, height, region) => {
      const group = groups.find(group => group.id === region);
      const selected = group ? nodes.filter(group.matches) : nodes;
      return fitBoard(selected.length ? selected : nodes, width, height);
    },
    nodeClass: node => node.catalog ? 'system-node' : '',
    renderNode: (node, onEdit) => node.fiveS?<FiveSNodeContent node={node} locale={locale} onEdit={node.fiveS.role==='ACTION'?onEdit:undefined}/>:node.catalog ? <SystemNodeContent node={catalogNode(node)!} locale={locale} onSteps={onEdit} /> : undefined,
    printNode: node => node.fiveS?{...node,text:fiveSNodeText(node,locale)}:node.catalog && node.kind === 'TEXT' ? { ...node, text: `${symbols[node.catalog.icon] ?? '✨'}\n${node.text}` } : node,
    printDetails: nodes => [...nodes.filter(n=>n.fiveS?.role==='ACTION').map(n=>({title:n.text,steps:[fiveSNodeText(n,locale),n.fiveS?.details??''].filter(Boolean)})),...nodes.filter(node => node.catalog?.steps?.length).map(node => ({ title: node.text, steps: node.catalog!.steps! }))],
  };
}
