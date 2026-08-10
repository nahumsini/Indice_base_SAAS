import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface ConfigCenterCurrentUser {
  id: number;
  email: string;
  apodo?: string;
  nombres: string;
  apellidos: string;
  primer_nombre?: string;
  apellido_paterno?: string;
  telefono?: string;
  phone_numbers?: ConfigCenterPhoneNumber[];
  country?: string;
  preferred_language?: string;
  avatar_url?: string;
  avatar_object_key?: string;
  avatar_content_type?: string;
  role?: string | null;
}

export interface ConfigCenterPhoneNumber {
  id?: number;
  label: string;
  phone: string;
  country?: string | null;
  is_primary?: boolean;
}

export interface SaveCurrentUserPayload {
  primer_nombre: string;
  apellido_paterno: string;
  telefono?: string;
  phone_numbers?: ConfigCenterPhoneNumber[];
  country?: string;
  preferred_language?: string;
  avatar_object_key?: string;
  avatar_content_type?: string;
  new_password?: string;
  confirm_new_password?: string;
}

export interface CurrentUserAvatarPresignPayload {
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface CurrentUserAvatarPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
  content_type: string;
}

export interface ConfigCenterUser {
  id: number;
  invitation_id?: number | null;
  user_company_id: number | null;
  apodo?: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  avatar_url?: string | null;
  avatar_object_key?: string | null;
  avatar_content_type?: string | null;
  role: string;
  department?: string | null;
  status: string;
  created_at?: string | null;
  scope_type?: 'corporate_office' | 'unit_headquarters' | 'business_office';
  unit_id?: number | null;
  unit_name?: string | null;
  business_id?: number | null;
  business_name?: string | null;
  module_slugs: string[];
  kiosk_definition_ids?: number[];
  tab_permission_keys?: string[];
  tab_permissions_configured?: boolean;
  is_protected: boolean;
  source: string;
  capabilities?: {
    can_edit_access: boolean;
    can_activate: boolean;
    can_deactivate: boolean;
    can_resend_invitation: boolean;
    can_cancel_invitation: boolean;
  };
}

export interface UpdateConfigCenterUserPayload {
  role: string;
  status: string;
  module_slugs: string[];
  tab_permission_keys?: string[];
  kiosk_definition_ids?: number[];
  unit_id?: number | null;
  business_id?: number | null;
}

export interface InviteConfigCenterUserPayload {
  name: string;
  email: string;
  role: string;
  module_slugs?: string[];
  tab_permission_keys?: string[];
  kiosk_definition_ids?: number[];
  unit_id?: number | null;
  business_id?: number | null;
}

export interface ConfigCenterInviteResponse {
  email: string;
  invite_link: string;
  email_sent: boolean;
  email_status: string;
  email_message?: string;
}

export interface InvitationDetails {
  email: string;
  full_name: string;
  role: string;
  company_id: number;
  company_name: string;
  status: 'pending' | 'accepted' | 'expired' | string;
  expires_at?: string | null;
  existing_user?: boolean;
}

export interface AcceptInvitationPayload {
  password: string;
  confirm_password: string;
}

export interface AcceptInvitationResponse {
  accepted: boolean;
  user_id: number;
  email: string;
  full_name: string;
  company_id: number;
  company_name: string;
  role: string;
  status: string;
}

export interface ConfigCenterCatalogModule {
  slug: string;
  name: string;
  description?: string;
  category?: 'basic' | 'complementary' | 'ai';
  lifecycle_status?: 'planned' | 'development' | 'pilot' | 'released' | 'retired';
  access_model?: 'module' | 'tabs';
  assignment_enabled?: boolean;
  route_key?: string;
  entitled?: boolean;
  assignable?: boolean;
}

export interface ConfigCenterCatalogTab {
  module_slug: string;
  tab_key: string;
  permission_key: string;
  name: string;
  name_en?: string;
  name_es?: string;
  description_en?: string;
  description_es?: string;
  access_level?: 'personal' | 'self_service' | 'operational' | 'management' | 'protected';
  compatible_roles?: Array<'user' | 'admin' | 'superadmin'>;
  role_access?: Partial<Record<'user' | 'admin' | 'superadmin', {
    allowed: boolean;
    summary_en?: string;
    summary_es?: string;
    capability_keys?: Array<
      | 'view'
      | 'personal_use'
      | 'operate_scope'
      | 'manage_scope'
      | 'manage_company'
      | 'delegate_owned'
      | 'delegate_access'
      | 'protected_access'
    >;
    restriction_reason_en?: string;
    restriction_reason_es?: string;
  }>>;
  module_order?: number;
  tab_order?: number;
  protected_scope?: boolean;
}

export interface ConfigCenterCatalogUnit {
  id: number;
  name: string;
}

export interface ConfigCenterCatalogBusiness {
  id: number;
  unit_id?: number | null;
  name: string;
}

export interface ConfigCenterEmployeeKiosk {
  id: number;
  name: string;
  owner_module: string;
  module_slug: string;
  kiosk_type: string;
  unit_id?: number | null;
  unit_name?: string | null;
  business_id?: number | null;
  business_name?: string | null;
  access_level: string;
}

export interface ConfigCenterEmpresaMapBusiness {
  name: string;
  legacy_business_id?: number;
  logo?: string;
  industria?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  gerente?: string;
  horario?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  coordinate_source?: string;
  google_maps_url?: string;
}

export interface ConfigCenterEmpresaMapUnit {
  name: string;
  legacy_unit_id?: number;
  is_corporate_office?: boolean;
  isCorporateOffice?: boolean;
  logo?: string;
  industria?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  coordinate_source?: string;
  google_maps_url?: string;
  businesses: ConfigCenterEmpresaMapBusiness[];
}

export interface ConfigCenterAddress {
  street?: string;
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
}

export interface ConfigCenterHeadquartersLocation {
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  coordinate_source?: string;
  google_maps_url?: string;
  address?: ConfigCenterAddress | string;
}

export interface ConfigCenterEmpresa {
  id: number;
  nombre_empresa: string;
  logo_url?: string;
  plan_id?: number | null;
  industria?: string;
  modelo_negocio?: string;
  descripcion?: string;
  moneda?: string;
  zona_horaria?: string;
  tamano_empresa?: string;
  colaboradores?: number;
  estructura?: 'simple' | 'multi';
  empresa_template?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  coordinate_source?: string;
  google_maps_url?: string;
  address?: ConfigCenterAddress | string;
  headquarters_location?: ConfigCenterHeadquartersLocation;
  map?: ConfigCenterEmpresaMapUnit[];
}

interface CurrentUserResponse {
  ok: boolean;
  user: ConfigCenterCurrentUser;
}

interface UsersResponse {
  ok: boolean;
  users: ConfigCenterUser[];
  company_id?: number;
  capabilities?: {
    can_manage_users: boolean;
    can_invite: boolean;
    can_assign_super_admin: boolean;
  };
  catalog: {
    units: ConfigCenterCatalogUnit[];
    businesses: ConfigCenterCatalogBusiness[];
    modules: ConfigCenterCatalogModule[];
    tabs?: ConfigCenterCatalogTab[];
    employee_kiosks?: ConfigCenterEmployeeKiosk[];
  };
}

interface EmpresaResponse {
  ok: boolean;
  empresa: ConfigCenterEmpresa;
}

interface ConfigResponse {
  ok: boolean;
  data: {
    estructura?: 'simple' | 'multi';
    colaboradores?: number;
    empresa_template?: Record<string, unknown>;
    map?: ConfigCenterEmpresaMapUnit[];
  } | null;
}

export interface SaveStructureResponse {
  modo?: 'simple' | 'multi';
  estructura?: 'simple' | 'multi';
  colaboradores?: number;
  unidades_aprox?: number;
  map?: ConfigCenterEmpresaMapUnit[];
}

export interface SaveStructurePayload {
  estructura: 'simple' | 'multi';
  map: Array<{
    name: string;
    legacy_unit_id?: number;
    is_corporate_office?: boolean;
    logo?: string;
    industria?: string;
    direccion?: string;
    ciudad?: string;
    estado?: string;
    pais?: string;
    cp?: string;
    telefono?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
    coordinate_source?: string;
    google_maps_url?: string;
    businesses: Array<{
      name: string;
      legacy_business_id?: number;
      logo?: string;
      industria?: string;
      direccion?: string;
      ciudad?: string;
      estado?: string;
      pais?: string;
      cp?: string;
      telefono?: string;
      email?: string;
      gerente?: string;
      horario?: string;
      latitude?: number;
      longitude?: number;
      radius_meters?: number;
      coordinate_source?: string;
      google_maps_url?: string;
    }>;
  }>;
}

export interface SaveEmpresaPayload {
  nombre_empresa: string;
  logo_url?: string | null;
  logo?: string | null;
  industria?: string;
  descripcion?: string;
  tamano_empresa?: string;
  modelo_negocio?: string;
  moneda?: string;
  zona_horaria?: string;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  coordinate_source?: string | null;
  google_maps_url?: string | null;
  address?: ConfigCenterAddress | null;
  sync_company_location?: boolean;
  syncCompanyLocation?: boolean;
}

interface SaveEmpresaResponse {
  logo: string | null;
  data: Partial<ConfigCenterEmpresa>;
  message: string;
}

export interface ConfigCenterCoordinateExtractionPayload {
  map_url: string;
}

export interface ConfigCenterCoordinateExtractionResponse {
  latitude: number;
  longitude: number;
  resolved_url: string;
}

export const configCenterApi = {
  getCurrentUser() {
    return apiClient<ConfigCenterCurrentUser>(endpoints.configCenter.currentUser);
  },

  saveCurrentUser(payload: SaveCurrentUserPayload) {
    return apiClient<ConfigCenterCurrentUser>(endpoints.configCenter.saveCurrentUser, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  presignCurrentUserAvatarUpload(payload: CurrentUserAvatarPresignPayload) {
    return apiClient<CurrentUserAvatarPresignResponse>(endpoints.configCenter.currentUserAvatarPresignUpload, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadCurrentUserAvatar(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('Profile photo upload failed.');
    }
  },

  getUsers() {
    return apiClient<UsersResponse>(endpoints.configCenter.users);
  },

  updateUser(id: number, payload: UpdateConfigCenterUserPayload) {
    return apiClient<{ success: boolean }>(`${endpoints.configCenter.updateUser}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id: number) {
    return apiClient<{ success: boolean; deleted: boolean }>(`${endpoints.configCenter.updateUser}/${id}`, {
      method: 'DELETE',
    });
  },

  activateUser(id: number) {
    return apiClient<{ success: boolean; active: boolean }>(`${endpoints.configCenter.updateUser}/${id}/activate`, {
      method: 'POST',
    });
  },

  inviteUser(payload: InviteConfigCenterUserPayload) {
    return apiClient<ConfigCenterInviteResponse>(endpoints.configCenter.inviteUser, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resendInvitation(id: number, email?: string) {
    return apiClient<ConfigCenterInviteResponse>(`${endpoints.configCenter.resendInvitation}/${id}/resend`, {
      method: 'POST',
      body: JSON.stringify(email ? { email } : {}),
    });
  },

  deleteInvitation(id: number) {
    return apiClient<{ success: boolean; deleted: boolean }>(`${endpoints.configCenter.resendInvitation}/${id}`, {
      method: 'DELETE',
    });
  },

  getInvitation(token: string) {
    return apiClient<InvitationDetails>(`${endpoints.invitations.base}/${encodeURIComponent(token)}`);
  },

  acceptInvitation(token: string, payload: AcceptInvitationPayload) {
    return apiClient<AcceptInvitationResponse>(`${endpoints.invitations.base}/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getEmpresa() {
    return apiClient<ConfigCenterEmpresa>(endpoints.configCenter.empresa);
  },

  getConfig() {
    return apiClient<ConfigResponse['data']>(endpoints.configCenter.config);
  },

  saveConfig(payload: SaveStructurePayload) {
    return apiClient<SaveStructureResponse>(endpoints.configCenter.saveConfig, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  saveEmpresa(payload: SaveEmpresaPayload) {
    return apiClient<SaveEmpresaResponse>(endpoints.configCenter.saveEmpresa, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  extractLocationCoordinates(payload: ConfigCenterCoordinateExtractionPayload) {
    return apiClient<ConfigCenterCoordinateExtractionResponse>(
      endpoints.configCenter.locationCoordinateExtraction,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};
