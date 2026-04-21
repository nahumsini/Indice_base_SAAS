export type EstructuraType = 'simple' | 'multi';

export interface Negocio {
  id: string;
  name: string;
  legacyBusinessId?: number;
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

export interface Unidad {
  id: string;
  name: string;
  legacyUnitId?: number;
  logo?: string;
  industria?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  negocios: Negocio[];
}

export interface EditingNegocio extends Partial<Negocio> {
  unidadId: string;
}
