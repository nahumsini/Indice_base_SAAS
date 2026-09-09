import type { PlatformCatalog } from '../../api/platformAdmin';

export type StripeSetupStatus = {
  mode: 'TEST' | 'LIVE' | null;
  integration: 'DISABLED' | 'ENABLED_UNVERIFIED' | 'UNKNOWN';
  liveSynchronization: 'ENABLED' | 'LOCKED_IN_TEST' | 'LOCKED_INTEGRATION' | 'LOCKED_CONFIGURATION' | 'UNKNOWN';
};

/** These flags describe server configuration, not a successful Stripe connection. */
export function getStripeSetupStatus(environment: PlatformCatalog['stripe_environment']): StripeSetupStatus {
  const mode = environment?.mode === 'TEST' || environment?.mode === 'LIVE' ? environment.mode : null;
  const integration = environment?.enabled === true
    ? 'ENABLED_UNVERIFIED'
    : environment?.enabled === false ? 'DISABLED' : 'UNKNOWN';
  let liveSynchronization: StripeSetupStatus['liveSynchronization'] = 'UNKNOWN';
  if (mode === 'TEST') liveSynchronization = 'LOCKED_IN_TEST';
  else if (integration === 'DISABLED') liveSynchronization = 'LOCKED_INTEGRATION';
  else if (environment?.catalog_live_sync_enabled === false) liveSynchronization = 'LOCKED_CONFIGURATION';
  else if (mode === 'LIVE' && integration === 'ENABLED_UNVERIFIED' && environment?.catalog_live_sync_enabled === true) {
    liveSynchronization = 'ENABLED';
  }
  return { mode, integration, liveSynchronization };
}
