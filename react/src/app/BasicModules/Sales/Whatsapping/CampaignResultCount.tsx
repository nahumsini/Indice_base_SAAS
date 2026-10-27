import { useWhatsappingCopy } from "./whatsappingCopy";
export function CampaignResultCount({count,label,campaignName,busy,onOpen}:{count:number|null|undefined;label:string;campaignName:string;busy:boolean;onOpen:()=>void}) {
  const {copy}=useWhatsappingCopy();
  if (count == null) return <span className="whitespace-normal">{count === null ? copy.noOpportunityAccess : "—"}</span>;
  const description = `${copy.viewContacts}: ${label} (${count}) · ${campaignName}`;
  return <button type="button" disabled={busy || count === 0} onClick={onOpen} aria-label={description} title={count === 0 ? `${description}. ${copy.noMatch}` : description}
    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums text-[#B63B32] underline decoration-[#FF6B5E]/40 underline-offset-4 hover:bg-[#FF6B5E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 disabled:cursor-default disabled:text-slate-500 disabled:no-underline disabled:hover:bg-transparent lg:min-h-9 lg:min-w-9 dark:text-[#FFB0AA] dark:disabled:text-slate-400">{count}</button>;
}
