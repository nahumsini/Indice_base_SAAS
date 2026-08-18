export interface AuthSessionResponse {
  user: {
    id: number;
    name: string;
    role: string | null;
    module_slugs?: string[];
    tab_permission_keys?: string[];
    tab_permissions_configured?: boolean;
  };
  company: {
    id: number;
    name: string;
    commercial_account_type: 'SUPER_ADMIN' | 'DISTRIBUTOR';
    user_company_id: number;
    role: string;
    scope: {
      type: 'corporate_office' | 'unit_headquarters' | 'business_office';
      unit_id: number | null;
      business_id: number | null;
    };
    active: boolean;
    subscription?: {
      status: string;
      plan_id: string;
      trial_end_at: string;
      access_allowed: boolean;
      lock_reason: string;
    };
  };
  companies: Array<AuthSessionResponse['company']>;
  csrfToken: string;
}

export interface MfaRequiredResponse {
  mfaRequired: true;
  challengeId: string;
  maskedDestination: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export type LoginResponse = AuthSessionResponse | MfaRequiredResponse;
