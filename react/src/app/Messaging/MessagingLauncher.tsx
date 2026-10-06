import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { apiClient } from '../lib/apiClient';
import { messagingCopy } from './copy';
import { MessagingModal } from './MessagingModal';
import type { AuthSessionResponse } from '../api/auth.types';

export function MessagingLauncher({ session, locale }: { session: AuthSessionResponse | null | undefined; locale: string }) {
  if (!session || session.demoMode || !session.company.user_company_id) return null;
  return <Launcher key={`${session.user.id}:${session.company.id}:${session.company.user_company_id}`} userId={session.user.id} locale={locale} />;
}
function Launcher({ userId, locale }: { userId: number; locale: string }) {
  const copy = messagingCopy(locale);
  const location = useLocation();
  const navigate = useNavigate();
  const requested = Number(new URLSearchParams(location.search).get('conversation')) || null;
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => { if (requested && requested > 0) setOpen(true); }, [requested]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try { const count = await apiClient<number>('/api/v1/messaging/unread'); if (active) setUnread(count); }
      catch { if (active) setUnread(0); }
      finally { if (active) timer = setTimeout(refresh, open ? 5000 : 20000); }
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [open]);
  const close = () => {
    setOpen(false);
    if (requested) { const params = new URLSearchParams(location.search); params.delete('conversation'); navigate({ pathname: location.pathname, search: params.toString() }, { replace: true }); }
  };
  return <>
    <button type="button" onClick={() => setOpen(true)} title={copy.title} aria-label={`${copy.title}${unread ? ` (${unread})` : ''}`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-current hover:bg-blue-500/20">
      <MessageSquare size={19} />{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] text-white">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <MessagingModal userId={userId} locale={locale} initialId={requested} onClose={close} />}
  </>;
}
