import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  configCenterApi,
  type InvitationDetails,
} from '../api/configCenter';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type PageState = 'loading' | 'ready' | 'accepted' | 'expired' | 'invalid' | 'complete';

export default function InviteAcceptPage() {
  const navigate = useNavigate();
  const { token = '' } = useParams();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const loadInvitation = async () => {
      if (!token.trim()) {
        setPageState('invalid');
        return;
      }

      try {
        setPageState('loading');
        setErrorMessage('');
        const details = await configCenterApi.getInvitation(token);
        if (!active) {
          return;
        }

        setInvitation(details);
        if (details.status === 'accepted') {
          setPageState('accepted');
        } else if (details.status === 'expired') {
          setPageState('expired');
        } else {
          setPageState('ready');
        }
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : 'Invitation could not be loaded.');
        setPageState('invalid');
      }
    };

    void loadInvitation();

    return () => {
      active = false;
    };
  }, [token]);

  const canSubmit = useMemo(
    () => password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword && !isSubmitting,
    [confirmPassword, isSubmitting, password],
  );

  const handleAcceptInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setErrorMessage(
        password !== confirmPassword
          ? 'Password and confirmation must match.'
          : 'Password must be at least 8 characters long.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await configCenterApi.acceptInvitation(token, {
        password,
        confirm_password: confirmPassword,
      });
      setPageState('complete');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invitation could not be accepted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = pageState === 'complete'
    ? (invitation?.existing_user ? 'Workspace connected' : 'Your account is ready')
    : pageState === 'accepted'
      ? 'Invitation already accepted'
      : pageState === 'expired'
        ? 'Invitation expired'
        : pageState === 'invalid'
          ? 'Invitation unavailable'
          : (invitation?.existing_user ? 'Connect another workspace' : 'Accept your Indice invitation');

  const description = pageState === 'complete'
    ? (invitation?.existing_user
      ? 'This company is now available from your existing Indice account.'
      : 'You can now sign in with your email and the password you just created.')
    : pageState === 'accepted'
      ? 'This invite link was already used. Sign in with the account created from this invitation.'
      : pageState === 'expired'
        ? 'Ask an administrator to resend your invitation so you can create your account.'
        : pageState === 'invalid'
          ? (errorMessage || 'This invite link is invalid or no longer available.')
          : (invitation?.existing_user
            ? 'Confirm your current password to add this company to your existing account.'
            : 'Create your password to join the company workspace.');

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(20,54,117,0.45)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#143675] p-8 text-white sm:p-10">
            <div className="flex h-full min-h-72 flex-col justify-between gap-10">
              <div className="space-y-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/12">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight">Indice</h1>
                  <p className="max-w-sm text-sm leading-6 text-blue-100">
                    Secure company access for operations, people, finances, and daily work.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/8 p-4 text-sm leading-6 text-blue-50">
                Invitations are single-use and expire automatically. Existing accounts keep the same password across every company.
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#143675]/8 px-3 py-1 text-sm font-medium text-[#143675]">
                <KeyRound className="h-4 w-4" />
                User invitation
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              <p className="text-sm leading-6 text-slate-600">{description}</p>
            </div>

            {pageState === 'loading' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Loading invitation...
              </div>
            ) : null}

            {pageState === 'ready' && invitation ? (
              <form onSubmit={handleAcceptInvitation} className="space-y-5">
                <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <InviteDetail label="Company" value={invitation.company_name || 'Indice workspace'} />
                  <InviteDetail label="Role" value={invitation.role || 'user'} />
                  <InviteDetail label="Name" value={invitation.full_name || 'Invited user'} />
                  <InviteDetail label="Email" value={invitation.email} />
                </div>

                <PasswordField
                  label={invitation.existing_user ? 'Current password' : 'Create password'}
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggleShow={() => setShowPassword((current) => !current)}
                  autoComplete={invitation.existing_user ? 'current-password' : 'new-password'}
                />
                <PasswordField
                  label={invitation.existing_user ? 'Confirm current password' : 'Confirm password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirmPassword}
                  onToggleShow={() => setShowConfirmPassword((current) => !current)}
                  autoComplete={invitation.existing_user ? 'current-password' : 'new-password'}
                />

                {errorMessage ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="h-12 w-full rounded-xl bg-[#143675] text-white hover:bg-[#0f2855]"
                >
                  {isSubmitting ? (invitation.existing_user ? 'Connecting workspace...' : 'Creating account...') : (
                    <>
                      {invitation.existing_user ? 'Connect workspace' : 'Accept invitation'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : null}

            {['accepted', 'expired', 'invalid', 'complete'].includes(pageState) ? (
              <div className="space-y-5">
                <div className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-sm ${
                  pageState === 'complete'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
                >
                  {pageState === 'complete' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <span>{description}</span>
                </div>

                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="h-12 w-full rounded-xl bg-[#143675] text-white hover:bg-[#0f2855]"
                >
                  Go to login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function InviteDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete = 'new-password',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-12 text-sm shadow-sm"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
