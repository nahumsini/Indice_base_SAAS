export type EstructuraType = 'simple' | 'multi';

export type CoordinateSource = 'google_maps_link' | 'current_location' | 'manual';

export interface LocationCoordinateData {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  coordinateSource?: CoordinateSource;
  googleMapsUrl?: string;
}

export interface LocationCoordinateFormValues {
  latitude: string;
  longitude: string;
  radiusMeters: string;
  coordinateSource: CoordinateSource | '';
  googleMapsUrl: string;
}

export interface BusinessAddressFormValues {
  street: string;
  country: string;
  state: string;
  city: string;
  zip: string;
}

export interface Negocio extends LocationCoordinateData {
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

export interface Unidad extends LocationCoordinateData {
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
