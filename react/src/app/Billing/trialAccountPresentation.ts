import type { TrialPaymentWorkspaceData } from '../api/trialPayment';

/** Display only. Native subscription access and verified payments remain authoritative. */
export function trialAccountPresentation(
  workspace: TrialPaymentWorkspaceData | null,
  now: number,
  trialAccessBlocked = false,
) {
  if (!workspace?.cohort || workspace.converted || !workspace.trialEndsAt
    || !/(Z|[+-]\d{2}:\d{2})$/.test(workspace.trialEndsAt)) return null;
  const deadline = Date.parse(workspace.trialEndsAt);
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return null;
  const remaining = deadline - now;
  const expired = trialAccessBlocked || remaining <= 0;
  const days = expired ? 0 : Math.ceil(remaining / 86_400_000);
  const registered = workspace.setupStatus === 'METHOD_REGISTERED';
  const pending = workspace.setupStatus === 'SETUP_PENDING';
  const canChoosePlan = workspace.paymentReady
    && (workspace.setupStatus === 'NONE' || workspace.setupStatus === null);
  return { deadline, expired, days, lastDay: !expired && remaining < 86_400_000,
    registered, pending, canChoosePlan, paymentReady: workspace.paymentReady };
}
