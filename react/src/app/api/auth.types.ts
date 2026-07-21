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
    user_company_id: number;
    role: string;
    scope: {
      type: 'corporate_office' | 'unit_headquarters' | 'business_office';
      unit_id: number | null;
      business_id: number | null;
    };
    active: boolean;
  };
  companies: Array<AuthSessionResponse['company']>;
  csrfToken: string;
}
