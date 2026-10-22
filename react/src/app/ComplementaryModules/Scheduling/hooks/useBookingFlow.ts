import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookingCatalog, BookingRequest, Client, SlotRequest, Slots, Submission } from '../services/schedulingApi';
import { bookingSteps, emptyBookingContact, validBookingContact, type BookingContact, type BookingStep } from '../utils/bookingFlow';

type FlowError = 'selection' | 'time' | 'contact' | 'client' | 'submit' | 'conflict' | 'scope' | 'catalog';
type Options = {
  catalog: BookingCatalog; presetStaff?: number; presetEvent?: number; presetDate?: string;
  loadSlots: (request: SlotRequest, signal: AbortSignal) => Promise<Slots>;
  loadCatalog?: (signal: AbortSignal) => Promise<BookingCatalog>;
  onSubmit: (request: BookingRequest, key: string) => Promise<Submission>;
  onBusyChange?: (busy: boolean) => void; onDirtyChange?: (dirty: boolean) => void; onReceived?: (result: Submission) => void;
};

/** Booking state belongs to Scheduling. No contacts, tokens or drafts are stored in browser storage. */
export function useBookingFlow(options: Options) {
  const { catalog: source,loadSlots,loadCatalog,onSubmit,onBusyChange,onDirtyChange,onReceived } = options;
  const [catalog,setCatalog] = useState(source);
  const initialEvent = source.events.find(event => event.id === options.presetEvent);
  const [selection,setSelection] = useState(initialEvent ? `event:${initialEvent.id}` : '');
  const [staffId,setStaffId] = useState(initialEvent?.staffId ?? (source.staff.some(person => person.id === options.presetStaff) ? options.presetStaff! : 0));
  const [date,setDate] = useState(options.presetDate ?? ''), [startAt,setStartAt] = useState('');
  const [step,setStep] = useState<BookingStep>('choose'), [contactVisited,setContactVisited] = useState(false);
  const [contact,setContact] = useState<BookingContact>({ ...emptyBookingContact }), [clientId,setClientId] = useState<number>();
  const [creatingClient,setCreatingClient] = useState(false), [busy,setBusy] = useState(false), [receipt,setReceipt] = useState<Submission>();
  const [error,setError] = useState<FlowError>();
  const pending = useRef(false), clientPending = useRef(false), cataloguePending = useRef(false), received = useRef(false);
  const mounted = useRef(true), catalogueRequest = useRef<AbortController | undefined>(undefined);
  const retry = useRef<{fingerprint: string; key: string} | undefined>(undefined);
  const [slotRevision,setSlotRevision] = useState(0), [slotResult,setSlotResult] = useState<{key: string; value: Slots}>();
  const [slotLoading,setSlotLoading] = useState(false), [slotError,setSlotError] = useState<string>();
  const service = selection.startsWith('service:') ? catalog.services.find(item => `service:${item.id}` === selection) : undefined;
  const event = selection.startsWith('event:') ? catalog.events.find(item => `event:${item.id}` === selection) : undefined;
  const eligibleStaff = catalog.staff.filter(person => !service || !person.serviceIds?.length || person.serviceIds.includes(service.id));
  const staff = eligibleStaff.find(person => person.id === staffId);
  const slotKey = service && staff && date ? JSON.stringify([service.id,staff.id,date,slotRevision]) : '';
  const slots = slotResult?.key === slotKey ? slotResult.value : undefined;
  const chooseReady = Boolean(staff && (service || (event && event.staffId === staff.id && event.availablePlaces > 0)));
  const timeReady = chooseReady && Boolean(event || (!slotLoading && startAt && slots?.starts.includes(startAt)));
  const dirtyFingerprint = JSON.stringify({selection,staffId,date,startAt,contact,clientId});
  const initial = useRef(dirtyFingerprint);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; catalogueRequest.current?.abort(); }; },[]);
  useEffect(() => { setCatalog(source); },[source]);
  useEffect(() => { onDirtyChange?.(!receipt && dirtyFingerprint !== initial.current); },[dirtyFingerprint,receipt,onDirtyChange]);
  useEffect(() => {
    const controller = new AbortController(); setSlotError(undefined); setStartAt('');
    if (!slotKey || !service || !staff) { setSlotLoading(false); return; }
    setSlotLoading(true);
    loadSlots({serviceId:service.id,staffId:staff.id,date},controller.signal)
      .then(value => { if (!controller.signal.aborted) setSlotResult({key:slotKey,value}); })
      .catch(() => { if (!controller.signal.aborted) setSlotError(slotKey); })
      .finally(() => { if (!controller.signal.aborted) setSlotLoading(false); });
    return () => controller.abort();
  },[slotKey,loadSlots]);
  const updateBusy = useCallback(() => {
    const value = pending.current || clientPending.current || cataloguePending.current;
    if (mounted.current) setBusy(value); onBusyChange?.(value);
  },[onBusyChange]);
  const onClientBusyChange = useCallback((value: boolean) => { clientPending.current = value; updateBusy(); },[updateBusy]);
  const goTo = (next: BookingStep) => {
    if (pending.current || clientPending.current || cataloguePending.current || received.current) return;
    if (bookingSteps.indexOf(next) > bookingSteps.indexOf(step)) return;
    setError(undefined); setStep(next);
  };
  const chooseSelection = (value: string) => {
    if (value === selection) return;
    setSelection(value); setStartAt(''); setError(undefined);
    const chosen = catalog.events.find(item => `event:${item.id}` === value);
    if (chosen) setStaffId(chosen.staffId);
    else {
      const chosenService = catalog.services.find(item => `service:${item.id}` === value);
      if (!catalog.staff.some(person => person.id === staffId && (!chosenService || !person.serviceIds?.length || person.serviceIds.includes(chosenService.id)))) setStaffId(0);
    }
  };
  const changeStaff = (value: number) => { if (value !== staffId) { setStaffId(value); setStartAt(''); setError(undefined); } };
  const changeDate = (value: string) => { if (value !== date) { setDate(value); setStartAt(''); setError(undefined); } };
  const selectClient = (client: Client) => {
    setClientId(client.id); setContact({attendeeName:client.contactPerson || client.companyName,attendeeEmail:client.email || '',attendeeCompany:client.companyName || '',attendeePhone:client.phone || '',contactConsent:false});
  };
  const editContact = (key: Exclude<keyof BookingContact,'contactConsent'>, value: string) => {
    setClientId(undefined); setContact(previous => ({ ...previous,[key]:value,contactConsent:false })); setError(undefined);
  };
  const refreshSlots = () => { setStartAt(''); setSlotRevision(value => value+1); };
  const refreshCatalog = async () => {
    if (!loadCatalog || pending.current || clientPending.current || cataloguePending.current) return;
    const controller = new AbortController(); catalogueRequest.current = controller;
    cataloguePending.current = true; updateBusy();
    try { const value = await loadCatalog(controller.signal); if (!controller.signal.aborted && mounted.current) { setCatalog(value); refreshSlots(); setError(undefined); setStep('choose'); } }
    catch(reason) { if (!controller.signal.aborted && mounted.current) setError(reason instanceof Error && reason.message === 'scheduling_scope_changed' ? 'scope' : 'catalog'); }
    finally { cataloguePending.current = false; updateBusy(); }
  };
  const submit = async () => {
    if (pending.current || clientPending.current || cataloguePending.current || received.current) return;
    if (!chooseReady) { setError('selection'); setStep('choose'); return; }
    if (step === 'choose') { setError(undefined); setStep('time'); return; }
    if (!timeReady) { setError('time'); setStep('time'); return; }
    if (step === 'time') { setError(undefined); setContactVisited(true); setStep('contact'); return; }
    if (creatingClient) { setError('client'); setStep('contact'); return; }
    if (!validBookingContact(contact)) { setError('contact'); setStep('contact'); return; }
    if (step === 'contact') { setError(undefined); setStep('review'); return; }
    const body: BookingRequest = {serviceId:service?.id ?? null,eventId:event?.id ?? null,staffId,startAt:event?.startAt ?? startAt,
      ...contact,attendeeName:contact.attendeeName.trim(),attendeeEmail:contact.attendeeEmail.trim(),attendeeCompany:contact.attendeeCompany.trim(),attendeePhone:contact.attendeePhone.trim(),...(clientId ? {clientId} : {})};
    const fingerprint = JSON.stringify(body);
    if (retry.current?.fingerprint !== fingerprint) retry.current = {fingerprint,key:crypto.randomUUID()};
    pending.current = true; updateBusy(); setError(undefined);
    try {
      const result = await onSubmit(body,retry.current.key);
      if (mounted.current) { received.current = true; setReceipt(result); onReceived?.(result); }
    } catch(reason) {
      if (!mounted.current || received.current) return;
      if (reason instanceof Error && reason.message === 'scheduling_scope_changed') setError('scope');
      else if (typeof reason === 'object' && reason !== null && 'status' in reason && [401,403].includes(Number(reason.status))) setError('scope');
      else if (typeof reason === 'object' && reason !== null && 'status' in reason && [404,409].includes(Number(reason.status))) {
        setError('conflict'); setStep(event || reason.status === 404 ? 'choose' : 'time'); if (service) refreshSlots();
      } else setError('submit');
    } finally { pending.current = false; updateBusy(); }
  };
  return {catalog,selection,service,event,staff,staffId,eligibleStaff,date,startAt,step,contactVisited,contact,clientId,creatingClient,busy,receipt,error,
    slots,slotLoading,slotError:Boolean(slotKey && slotError === slotKey),chooseReady,timeReady,chooseSelection,changeStaff,changeDate,
    chooseTime:(value: string) => { if (slots?.starts.includes(value)) { setStartAt(value); setError(undefined); } },
    editContact,setConsent:(value: boolean) => setContact(previous => ({ ...previous,contactConsent:value })),
    selectClient,setCreatingClient,onClientBusyChange,goTo,submit,refreshSlots,refreshCatalog};
}
