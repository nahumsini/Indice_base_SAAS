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
  country?: string;
  preferred_language?: string;
  avatar_url?: string;
  role?: string | null;
}

export interface SaveCurrentUserPayload {
  primer_nombre: string;
  apellido_paterno: string;
  telefono?: string;
  country?: string;
  preferred_language?: string;
  avatar_url?: string;
  new_password?: string;
  confirm_new_password?: string;
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
  role: string;
  department?: string | null;
  status: string;
  created_at?: string | null;
  business_id?: number | null;
  module_slugs: string[];
  is_protected: boolean;
  source: string;
}

export interface UpdateConfigCenterUserPayload {
  role: string;
  status: string;
  module_slugs: string[];
}

export interface InviteConfigCenterUserPayload {
  name: string;
  email: string;
  role: string;
}

export interface ConfigCenterInviteResponse {
  email: string;
  invite_link: string;
}

export interface ConfigCenterCatalogModule {
  slug: string;
  name: string;
}

export interface ConfigCenterCatalogBusiness {
  id: number;
  name: string;
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
}

export interface ConfigCenterEmpresaMapUnit {
  name: string;
  legacy_unit_id?: number;
  logo?: string;
  industria?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  businesses: ConfigCenterEmpresaMapBusiness[];
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
  map?: ConfigCenterEmpresaMapUnit[];
}

interface CurrentUserResponse {
  ok: boolean;
  user: ConfigCenterCurrentUser;
}

interface UsersResponse {
  ok: boolean;
  users: ConfigCenterUser[];
  catalog: {
    businesses: ConfigCenterCatalogBusiness[];
    modules: ConfigCenterCatalogModule[];
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

export interface SaveStructurePayload {
  estructura: 'simple' | 'multi';
  map: Array<{
    name: string;
    legacy_unit_id?: number;
    logo?: string;
    industria?: string;
    direccion?: string;
    ciudad?: string;
    estado?: string;
    pais?: string;
    cp?: string;
    telefono?: string;
    email?: string;
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
    }>;
  }>;
}

export interface SaveEmpresaPayload {
  nombre_empresa: string;
  industria?: string;
  descripcion?: string;
  tamano_empresa?: string;
  modelo_negocio?: string;
  moneda?: string;
  zona_horaria?: string;
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

  getUsers() {
    return apiClient<{
      users: ConfigCenterUser[];
      catalog: {
        businesses: ConfigCenterCatalogBusiness[];
        modules: ConfigCenterCatalogModule[];
      };
    }>(endpoints.configCenter.users);
  },

  updateUser(id: number, payload: UpdateConfigCenterUserPayload) {
    return apiClient<{ success: boolean }>(`${endpoints.configCenter.updateUser}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
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

  getEmpresa() {
    return apiClient<ConfigCenterEmpresa>(endpoints.configCenter.empresa);
  },

  getConfig() {
    return apiClient<ConfigResponse['data']>(endpoints.configCenter.config);
  },

  saveConfig(payload: SaveStructurePayload) {
    return apiClient(endpoints.configCenter.saveConfig, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  saveEmpresa(payload: SaveEmpresaPayload) {
    return apiClient(endpoints.configCenter.saveEmpresa, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
