import { MessageCircle, CalendarClock } from "lucide-react";
import { IndiceTableActionGroup } from "../../../components/table/IndiceTableEngine";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { useWhatsappingCopy } from "./whatsappingCopy";
import type { Campaign } from "./whatsappingApi";
export function CampaignTableActions({campaign,busy,onOpen,onFollowUps}:{campaign:Campaign;busy:boolean;onOpen:()=>void;onFollowUps:()=>void}) {
  const {copy}=useWhatsappingCopy();
  const actions=[{label:`${copy.work}: ${campaign.name}`, icon:<MessageCircle aria-hidden="true" className="size-4"/>,disabled:busy,onClick:onOpen,primary:true},
    {label:`${campaign.due > 0 ? `${copy.due} (${campaign.due})` : copy.noPendingFollowUps}: ${campaign.name}`,icon:<CalendarClock aria-hidden="true" className="size-4"/>,disabled:busy||campaign.due===0,onClick:onFollowUps,primary:false}];
  return <IndiceTableActionGroup>{actions.map(action=><Tooltip key={action.label}><TooltipTrigger asChild><span className="inline-flex"><button type="button" aria-label={action.label} title={action.label} disabled={action.disabled} onClick={action.onClick} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/30 disabled:cursor-not-allowed disabled:opacity-40 lg:size-9 ${action.primary ? "border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{action.icon}</button></span></TooltipTrigger><TooltipContent>{action.label}</TooltipContent></Tooltip>)}</IndiceTableActionGroup>;
}
