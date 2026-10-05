import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../lib/apiClient';
import { messagingApi } from './api';
import { mergeMessages, pollDelay, requestIdentity } from './messageState';
import type { Conversation, Message, MessagingPortal } from './types';
import { usePhotoDraft } from './usePhotoDraft';

export function useConversation(portal: MessagingPortal, id: number, onChanged: () => void) {
  const api = useMemo(() => messagingApi(portal), [portal]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const photos = usePhotoDraft();
  const cursor = useRef(0);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const mounted = useRef(true);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const failures = useRef(0);
  const inFlight = useRef(false);
  const revoked = useRef(false);
  const sendingRef = useRef(false);
  const readCursor = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const fail = useCallback((failure: unknown) => {
    if (!mounted.current) return;
    if (failure instanceof ApiClientError && [401, 403, 404].includes(failure.status)) {
      revoked.current = true; setMessages([]); setConversation(null); setDraft(''); photos.clear();
    }
    setError(failure);
  }, [photos.clear]);

  const refresh = useCallback(async () => {
    if (inFlight.current || revoked.current) return;
    inFlight.current = true;
    try {
      const after = cursor.current;
      const result = await api.detail(id, after);
      if (!mounted.current) return;
      setConversation(current => !current || result.conversation.version >= current.version ? result.conversation : current);
      setMessages(current => mergeMessages(current, result.messages.items));
      if (after === 0) setHasOlder(result.messages.hasMore);
      const latest = result.messages.items[result.messages.items.length - 1]?.id ?? 0;
      cursor.current = Math.max(cursor.current, latest);
      if (!document.hidden && cursor.current > readCursor.current) {
        const readTo = cursor.current;
        await api.read(id, readTo);
        readCursor.current = readTo;
        changed.current();
      }
      failures.current = 0;
      setError(null);
    } catch (failure) { failures.current += 1; fail(failure); }
    finally { inFlight.current = false; if (mounted.current) setLoading(false); }
  }, [api, id, fail]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.hidden) { timer = setTimeout(poll, pollDelay(0, false)); return; }
      await refresh();
      if (!stopped) timer = setTimeout(poll, pollDelay(failures.current, true));
    };
    const focus = () => { if (!document.hidden) void refresh(); };
    void poll();
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [refresh]);

  const send = async () => {
    if ((!draft.trim() && !photos.photos.length) || sendingRef.current || revoked.current) return;
    sendingRef.current = true; setSending(true); setError(null);
    const body = draft.trim();
    try {
      const attachmentIds = await photos.upload(api, id);
      if (!mounted.current || revoked.current) return;
      request.current = requestIdentity(request.current, JSON.stringify([id, body, visibility, attachmentIds]));
      const message = await api.send(id, body, visibility, request.current.key, attachmentIds);
      if (!mounted.current) return;
      // Do not advance the polling cursor here: concurrent incoming messages may precede this id.
      setMessages(current => mergeMessages(current, [message]));
      setDraft(''); photos.clear(); request.current = null;
      await refresh(); changed.current();
    } catch (failure) { fail(failure); }
    finally { sendingRef.current = false; if (mounted.current) setSending(false); }
  };
  const older = async () => {
    if (!messages.length) return;
    try {
      const result = await api.detail(id, 0, messages[0].id);
      if (!mounted.current) return;
      setMessages(current => mergeMessages(current, result.messages.items)); setHasOlder(result.messages.hasMore);
    } catch (failure) { fail(failure); }
  };
  const change = async (action: string, assigneeUserId: number | null = null, value: string | null = null) => {
    if (!conversation || sendingRef.current) return false;
    sendingRef.current = true; setSending(true);
    try {
      await api.change(id, conversation.version, action, assigneeUserId, value);
      if (action !== 'TRANSFER') await refresh();
      changed.current(); return true;
    } catch (failure) { await refresh(); fail(failure); return false; }
    finally { sendingRef.current = false; if (mounted.current) setSending(false); }
  };
  return { conversation, messages, hasOlder, error, loading, sending, draft, setDraft, visibility, setVisibility, send, older, refresh, change, photos };
}
