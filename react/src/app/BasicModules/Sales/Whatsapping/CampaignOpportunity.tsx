import { useEffect, useRef, useState } from "react";
import { CreateOpportunityModal } from "../Prospectos/modals/CreateOpportunityModal";
import { useProspectosTranslations } from "../Prospectos/hooks/useProspectosTranslations";
import { useSalesTranslations } from "../Sales/hooks/useSalesTranslations";
import { initialOpportunityForm } from "../Prospectos/utils/prospectosStatus";
import type { OpportunityFormState } from "../Prospectos/types/prospectosTypes";
import type { SalesContact } from "../types/contacts";
import { salesApi, type SalesContextResponse } from "../salesApi";
import { toBackendOpportunity } from "../adapters/salesApiAdapters";
import { SalesModalFrame } from "../components/SalesModalFrame";
import { Button } from "../../../components/ui/button";
import { useDirtyExit } from "./WhatsappingUi";
import { useWhatsappingCopy } from "./whatsappingCopy";
import { normalizeSalesOwnerOption } from "../utils/salesOwnerOptions";
import type { Contact, Opportunity } from "./whatsappingApi";
export default function CampaignOpportunity({contact,campaignName,notes,onCancel,onCreated}:{contact:Contact;campaignName:string;notes:string;onCancel:()=>void;onCreated:(opportunity:Opportunity)=>void}) {
  const t=useProspectosTranslations(), customerCopy=useSalesTranslations(), {copy}=useWhatsappingCopy();
  const initial = useRef({...initialOpportunityForm, contactId:String(contact.id), opportunityName:campaignName, source:"WhatsApp" as const, notes:`${campaignName}\n${notes}`.trim()});
  const [form,setForm]=useState<OpportunityFormState>(initial.current);
  const [context,setContext]=useState<SalesContextResponse|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[discard,setDiscard]=useState(false);
  const latch=useRef(false);
  const customer:SalesContact={id:String(contact.id),backendId:contact.id,company:contact.companyName,contactPerson:contact.name,phone:contact.phone,email:"",role:"",source:"WhatsApp",owner:contact.ownerName,tags:[],notes:""};
  const dirty=JSON.stringify(form)!==JSON.stringify(initial.current);useDirtyExit(dirty);
  useEffect(()=>{let active=true;void salesApi.context().then(value=>{if(!active)return;setContext(value);const owners=value.users.map(normalizeSalesOwnerOption).filter(owner=>owner!==null);const owner=owners.find(u=>u.userCompanyId===value.currentUserCompanyId)??owners[0];if(owner)setForm(f=>{const next={...f,ownerValue:`user-company:${owner.userCompanyId}`,owner:owner.name};initial.current={...initial.current,ownerValue:next.ownerValue,owner:next.owner};return next;});}).catch(()=>{if(active)setError(copy.error);});return()=>{active=false;};},[copy.error]);
  const owners=(context?.users??[]).map(normalizeSalesOwnerOption).filter(owner=>owner!==null);
  const ownerPayload=(value:string)=>{const id=Number(value.replace("user-company:",""));const owner=owners.find(u=>u.userCompanyId===id);return {ownerUserCompanyId:owner?.userCompanyId??null,owner:owner?.name??""};};
  async function save(){if(latch.current)return;const owner=ownerPayload(form.ownerValue);if(!owner.ownerUserCompanyId||!form.opportunityName.trim())return;latch.current=true;setBusy(true);setError("");try{const saved = await salesApi.create<{id:number;flowId?:number;opportunityCode?:string;opportunityName?:string}>("opportunities",toBackendOpportunity({opportunityName:form.opportunityName.trim(),contactId:customer.id,company:customer.company,contactPerson:customer.contactPerson,phone:customer.phone,source:form.source,stage:form.stage,temperature:form.temperature,...owner,estimatedValue:form.estimatedValue||"0",probability:form.probability,expectedCloseDate:form.expectedCloseDate,nextAction:form.nextAction,nextActionDate:form.nextActionDate,status:form.status,notes:form.notes,files:[]},[customer]));onCreated({contactId:contact.id,id:saved.id,flowId:saved.flowId??null,code:saved.opportunityCode??"",name:saved.opportunityName??form.opportunityName.trim()});}catch{setError(copy.error);}finally{latch.current=false;setBusy(false);}}
  return <><CreateOpportunityModal copy={{...t.modal,options:t.options}} customerCopy={customerCopy} isOpen editingOpportunity={null} form={form} contacts={[customer]} formOwnerSelectOptions={owners.map(u=>({value:`user-company:${u.userCompanyId}`,label:u.name}))} defaultOwnerValue={form.ownerValue} setForm={setForm} onContactChange={()=>{}} onCreateCustomer={async()=>{throw new Error(copy.error);}} getOwnerPayloadFromValue={ownerPayload} busy={busy} error={error} lockContact onOpenChange={open=>{if(!open&&!busy){if(dirty)setDiscard(true);else onCancel();}}} onSave={()=>void save()}/>{discard&&<SalesModalFrame open icon={null} modalType="confirmation" title={copy.discardTitle} description={copy.emptyHint} closeLabel={copy.close} onOpenChange={()=>setDiscard(false)} footerLeading={<Button variant="outline" onClick={()=>setDiscard(false)}>{copy.cancel}</Button>} footer={<Button onClick={onCancel}>{copy.confirm}</Button>}><p>{campaignName}</p></SalesModalFrame>}</>;
}
