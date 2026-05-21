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
  };
  csrfToken: string;
}
