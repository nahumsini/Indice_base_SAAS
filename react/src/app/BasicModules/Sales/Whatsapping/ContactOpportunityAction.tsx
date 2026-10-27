import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../../components/ui/dropdown-menu";
import { opportunityUrl } from "./contactOpportunities";
import { useWhatsappingCopy } from "./whatsappingCopy";
import type { Opportunity } from "./whatsappingApi";

export function ContactOpportunityAction({ opportunities, disabled, onCreate, onOpen }: { opportunities: Opportunity[] | null | undefined; disabled: boolean; onCreate: () => void; onOpen: () => void }) {
  const { copy } = useWhatsappingCopy();
  if (!opportunities?.length) return <Button variant="outline" disabled={disabled || opportunities == null} title={opportunities === null ? copy.noOpportunityAccess : opportunities === undefined ? copy.opportunityUnknown : undefined} onClick={onCreate}>{copy.createOpportunity}</Button>;
  const linkClass = "flex min-h-11 min-w-0 items-center gap-2 whitespace-normal break-words";
  if (opportunities.length === 1) return <Button variant="outline" className={linkClass} asChild><a href={opportunityUrl(opportunities[0])} onClick={onOpen} target="_blank" rel="noopener noreferrer" title={`${opportunities[0].name} · ${copy.opensNewTab}`}><ExternalLink className="size-4 shrink-0" />{copy.openOpportunity}</a></Button>;
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className={linkClass}>{copy.openOpportunity} ({opportunities.length})<ChevronDown className="size-4 shrink-0" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)] rounded-xl p-1.5">{opportunities.map(o => <DropdownMenuItem key={o.id} asChild><a className="min-h-11 gap-2 whitespace-normal break-words" href={opportunityUrl(o)} onClick={onOpen} target="_blank" rel="noopener noreferrer" title={copy.opensNewTab}><ExternalLink className="size-4 shrink-0" /><span className="min-w-0"><span className="block">{o.name || o.code}</span>{o.code && <span className="block text-xs text-slate-500 dark:text-slate-400">{o.code}</span>}</span></a></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
