import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLanguage } from '../../../shared/context';
import { PROFILE_COUNTRY_OPTIONS } from '../../../shared/profileCountries';
import { configCenterApi, type ConfigCenterEmpresaMapUnit } from '../../../api/configCenter';
import { validateOptionalEmail } from '../../../shared/validation/email';
import { inputClassName } from './constants';
import { BusinessIdentitySection } from './components/BusinessIdentitySection';
import { OperationTypeSection } from './components/OperationTypeSection';
import { UnitsSection } from './components/UnitsSection';
import { LocationCoordinateFields } from './components/LocationCoordinateFields';
import {
  ManualLocationFields,
  validatePostalCodeForCountry,
} from '../../../components/ManualLocationFields';
import type {
  BusinessAddressFormValues,
  CoordinateSource,
  EditingNegocio,
  EstructuraType,
  LocationCoordinateData,
  LocationCoordinateFormValues,
  Negocio,
  Unidad,
} from './types';

const readImageAsPreview = (
  event: ChangeEvent<HTMLInputElement>,
  onLoad: (preview: string) => void,
) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    onLoad(String(reader.result ?? ''));
  };
  reader.readAsDataURL(file);
};

type BusinessStructureSnapshot = {
  estructuraType: EstructuraType;
  unidades: Unidad[];
  companyName: string;
  companyLogo: string;
  industry: string;
  description: string;
  companyAddress: BusinessAddressFormValues;
  companyLocation: LocationCoordinateFormValues;
};

type UnidadFormValues = LocationCoordinateFormValues & {
  name: string;
  logo: string;
  industria: string;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  cp: string;
  telefono: string;
  email: string;
};

type NegocioFormValues = LocationCoordinateFormValues & {
  name: string;
  logo: string;
  industria: string;
  direccion: string;
  ciudad: string;
  estado: string;
  pais: string;
  cp: string;
  telefono: string;
  email: string;
  gerente: string;
  horario: string;
};

type PendingDeleteTarget =
  | {
      type: 'unit';
      unidadId: string;
      name: string;
    }
  | {
      type: 'business';
      unidadId: string;
      negocioId: string;
      name: string;
    };

const createDefaultUnidades = (): Unidad[] => [];

const DEFAULT_LOCATION_COORDINATE_VALUES: LocationCoordinateFormValues = {
  latitude: '',
  longitude: '',
  radiusMeters: '100',
  coordinateSource: '',
  googleMapsUrl: '',
};
const DEFAULT_BUSINESS_ADDRESS_VALUES: BusinessAddressFormValues = {
  street: '',
  country: '',
  state: '',
  city: '',
  zip: '',
};
const CORPORATE_OFFICE_UNIT_NAME = 'Corporate office';
const LEGACY_HEADQUARTERS_UNIT_NAME = 'Headquarter';
const LEGACY_HEADQUARTERS_LOCATION_NAME = 'Headquarters';
const CORPORATE_OFFICE_BUSINESS_FALLBACK_NAME = 'Corporate office';
const UNIT_HEADQUARTERS_SUFFIX = 'headquarters';
const MODAL_PRIORITY_COUNTRY_CODES = ['CA', 'US', 'MX', 'CO', 'BR'] as const;
const MODAL_STATE_DROPDOWN_COUNTRY_CODES = ['MX', 'US', 'CA', 'CO', 'BR'] as const;
const BUSINESS_STRUCTURE_AUTO_SAVE_DEBOUNCE_MS = 900;

const modalCountryOptionsSource = PROFILE_COUNTRY_OPTIONS;

const DEFAULT_UNIDAD_FORM_VALUES: UnidadFormValues = {
  ...DEFAULT_LOCATION_COORDINATE_VALUES,
  name: '',
  logo: '',
  industria: '',
  direccion: '',
  ciudad: '',
  estado: '',
  pais: '',
  cp: '',
  telefono: '',
  email: '',
};

const DEFAULT_NEGOCIO_FORM_VALUES: NegocioFormValues = {
  ...DEFAULT_LOCATION_COORDINATE_VALUES,
  name: '',
  logo: '',
  industria: '',
  direccion: '',
  ciudad: '',
  estado: '',
  pais: '',
  cp: '',
  telefono: '',
  email: '',
  gerente: '',
  horario: '',
};

const cloneSnapshot = (
  snapshot: BusinessStructureSnapshot,
): BusinessStructureSnapshot => JSON.parse(JSON.stringify(snapshot)) as BusinessStructureSnapshot;

const createBusinessStructureSnapshot = ({
  estructuraType,
  unidades,
  companyName,
  companyLogo,
  industry,
  description,
  companyAddress,
  companyLocation,
}: BusinessStructureSnapshot): BusinessStructureSnapshot => ({
  estructuraType,
  unidades,
  companyName,
  companyLogo,
  industry,
  description,
  companyAddress,
  companyLocation,
});

const formatCoordinateValue = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return String(value);
};

const createLocationCoordinateFormValues = (
  source?: {
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    radius_meters?: number;
    coordinateSource?: string;
    coordinate_source?: string;
    googleMapsUrl?: string;
    google_maps_url?: string;
  } | null,
): LocationCoordinateFormValues => ({
  latitude: formatCoordinateValue(source?.latitude),
  longitude: formatCoordinateValue(source?.longitude),
  radiusMeters: formatCoordinateValue(source?.radiusMeters ?? source?.radius_meters ?? 100),
  coordinateSource: (source?.coordinateSource ?? source?.coordinate_source ?? '') as CoordinateSource | '',
  googleMapsUrl: source?.googleMapsUrl ?? source?.google_maps_url ?? '',
});

const formatAddressValue = (value?: unknown) => {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
};

const createBusinessAddressFormValues = (
  source?: {
    street?: unknown;
    country?: unknown;
    state?: unknown;
    city?: unknown;
    zip?: unknown;
  } | string | null,
): BusinessAddressFormValues => {
  if (typeof source === 'string') {
    return {
      ...DEFAULT_BUSINESS_ADDRESS_VALUES,
      street: source,
    };
  }

  return {
    street: formatAddressValue(source?.street),
    country: formatAddressValue(source?.country),
    state: formatAddressValue(source?.state),
    city: formatAddressValue(source?.city),
    zip: formatAddressValue(source?.zip),
  };
};

const normalizeCoordinateSource = (value: string): CoordinateSource | undefined => (
  value === 'google_maps_link' || value === 'current_location' || value === 'manual'
    ? value
    : undefined
);

const parseCoordinateNumber = (
  value: string,
  label: string,
  min: number,
  max: number,
) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return `${label} must be a valid number.`;
  }
  if (parsed < min || parsed > max) {
    return `${label} is outside the supported range.`;
  }
  return parsed;
};

const buildCoordinateSaveValues = (values: LocationCoordinateFormValues): {
  ok: true;
  values: {
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number | null;
    coordinateSource?: CoordinateSource | null;
    googleMapsUrl?: string | null;
  };
} | {
  ok: false;
  message: string;
} => {
  const hasLatitude = values.latitude.trim().length > 0;
  const hasLongitude = values.longitude.trim().length > 0;

  if (!hasLatitude && !hasLongitude) {
    return {
      ok: true,
      values: {
        latitude: null,
        longitude: null,
        radiusMeters: null,
        coordinateSource: null,
        googleMapsUrl: values.googleMapsUrl.trim() || null,
      },
    };
  }

  if (!hasLatitude || !hasLongitude) {
    return { ok: false, message: 'Latitude and longitude must both be set.' };
  }

  const latitude = parseCoordinateNumber(values.latitude, 'Latitude', -90, 90);
  if (typeof latitude === 'string') {
    return { ok: false, message: latitude };
  }

  const longitude = parseCoordinateNumber(values.longitude, 'Longitude', -180, 180);
  if (typeof longitude === 'string') {
    return { ok: false, message: longitude };
  }

  const radiusText = values.radiusMeters.trim();
  const radiusMeters = radiusText ? Number(radiusText) : 100;
  if (!Number.isInteger(radiusMeters) || radiusMeters <= 0) {
    return { ok: false, message: 'Radius meters must be a positive whole number.' };
  }

  return {
    ok: true,
    values: {
      latitude,
      longitude,
      radiusMeters,
      coordinateSource: normalizeCoordinateSource(values.coordinateSource) ?? 'manual',
      googleMapsUrl: values.googleMapsUrl.trim() || null,
    },
  };
};

const buildManualLocationSaveValues = <T extends {
  ciudad: string;
  estado: string;
  pais: string;
  cp: string;
}>(values: T): {
  ok: true;
  values: Pick<T, 'ciudad' | 'estado' | 'pais' | 'cp'>;
} | {
  ok: false;
  message: string;
} => {
  const postalValidation = validatePostalCodeForCountry(values.pais, values.cp);
  if ('message' in postalValidation) {
    return { ok: false, message: postalValidation.message };
  }

  return {
    ok: true,
    values: {
      ciudad: values.ciudad.trim(),
      estado: values.estado.trim(),
      pais: values.pais.trim().toUpperCase(),
      cp: postalValidation.normalized,
    },
  };
};

const buildConfigCoordinateFields = (source: LocationCoordinateData) => ({
  latitude: source.latitude,
  longitude: source.longitude,
  radius_meters: source.radiusMeters,
  coordinate_source: source.coordinateSource,
  google_maps_url: source.googleMapsUrl,
});

const createUnidadFormValues = (unidad?: Unidad | null): UnidadFormValues => ({
  ...createLocationCoordinateFormValues(unidad),
  name: unidad?.name ?? '',
  logo: unidad?.logo ?? '',
  industria: unidad?.industria ?? '',
  direccion: unidad?.direccion ?? '',
  ciudad: unidad?.ciudad ?? '',
  estado: unidad?.estado ?? '',
  pais: unidad?.pais ?? '',
  cp: unidad?.cp ?? '',
  telefono: unidad?.telefono ?? '',
  email: unidad?.email ?? '',
});

const createNegocioFormValues = (negocio?: Partial<Negocio> | null): NegocioFormValues => ({
  ...createLocationCoordinateFormValues(negocio),
  name: negocio?.name ?? '',
  logo: negocio?.logo ?? '',
  industria: negocio?.industria ?? '',
  direccion: negocio?.direccion ?? '',
  ciudad: negocio?.ciudad ?? '',
  estado: negocio?.estado ?? '',
  pais: negocio?.pais ?? '',
  cp: negocio?.cp ?? '',
  telefono: negocio?.telefono ?? '',
  email: negocio?.email ?? '',
  gerente: negocio?.gerente ?? '',
  horario: negocio?.horario ?? '',
});

const arePlainObjectsEqual = <T extends object>(left: T, right: T) => (
  JSON.stringify(left) === JSON.stringify(right)
);

const isHeadquartersName = (value?: string | null) => (
  [CORPORATE_OFFICE_UNIT_NAME, LEGACY_HEADQUARTERS_UNIT_NAME, LEGACY_HEADQUARTERS_LOCATION_NAME].some(
    (name) => (value ?? '').trim().toLowerCase() === name.toLowerCase(),
  )
);

const isLegacyHeadquartersName = (value?: string | null) => (
  [LEGACY_HEADQUARTERS_UNIT_NAME, LEGACY_HEADQUARTERS_LOCATION_NAME].some(
    (name) => (value ?? '').trim().toLowerCase() === name.toLowerCase(),
  )
);

const namesMatch = (first?: string | null, second?: string | null) => {
  const normalizedFirst = (first ?? '').trim().toLowerCase();
  const normalizedSecond = (second ?? '').trim().toLowerCase();
  return normalizedFirst !== '' && normalizedSecond !== '' && normalizedFirst === normalizedSecond;
};

const isCorporateOfficeBusiness = (negocio: Negocio, companyName: string, index = -1) => (
  negocio.id === 'headquarters-default-business'
  || negocio.id === 'holding-default-business'
  || isHeadquartersName(negocio.name)
  || (index === 0 && namesMatch(negocio.name, companyName))
);

const getUnitHeadquartersBusinessName = (unitName?: string | null) => (
  `${(unitName ?? '').trim() || 'Unit'} ${UNIT_HEADQUARTERS_SUFFIX}`
);

const isUnitHeadquartersBusiness = (negocio: Negocio, unitName: string, index = -1) => (
  namesMatch(negocio.name, getUnitHeadquartersBusinessName(unitName))
  || namesMatch(negocio.name, `${unitName.trim() || 'Unit'} headquarter`)
  || (index === 0 && isLegacyHeadquartersName(negocio.name))
);

const normalizeCorporateOfficeUnits = (unidades: Unidad[], fallbackToFirst = true): Unidad[] => {
  if (unidades.length === 0) {
    return [];
  }

  const selectedIndex = unidades.findIndex((unidad) => unidad.isCorporateOffice);
  const corporateOfficeIndex = selectedIndex >= 0
    ? selectedIndex
    : (fallbackToFirst ? 0 : -1);

  return unidades.map((unidad, index) => ({
    ...unidad,
    isCorporateOffice: index === corporateOfficeIndex,
  }));
};

const unidadHasMultiData = (unidad: Unidad) => (
  Boolean(unidad.legacyUnitId)
  || unidad.name.trim() !== ''
  || Boolean(unidad.logo)
  || Boolean(unidad.industria)
  || Boolean(unidad.direccion)
  || Boolean(unidad.ciudad)
  || Boolean(unidad.estado)
  || Boolean(unidad.pais)
  || Boolean(unidad.cp)
  || Boolean(unidad.telefono)
  || Boolean(unidad.email)
  || unidad.latitude !== undefined
  || unidad.longitude !== undefined
  || Boolean(unidad.googleMapsUrl)
  || unidad.negocios.length > 0
);

const hasMeaningfulMultiStructureData = (unidades: Unidad[]) => {
  if (unidades.length === 0) {
    return false;
  }

  if (unidades.length > 1) {
    return true;
  }

  const [firstUnidad] = unidades;

  if (!firstUnidad) {
    return false;
  }

  const isDefaultPlaceholderUnit = firstUnidad.id === '1'
    && firstUnidad.name === 'Principal'
    && !firstUnidad.legacyUnitId
    && !firstUnidad.logo
    && !firstUnidad.industria
    && !firstUnidad.direccion
    && !firstUnidad.ciudad
    && !firstUnidad.estado
    && !firstUnidad.pais
    && !firstUnidad.cp
    && !firstUnidad.telefono
    && !firstUnidad.email
    && firstUnidad.latitude === undefined
    && firstUnidad.longitude === undefined
    && !firstUnidad.googleMapsUrl
    && firstUnidad.negocios.length === 0;

  if (isDefaultPlaceholderUnit) {
    return false;
  }

  const isDefaultHeadquartersUnit = isHeadquartersName(firstUnidad.name)
    && firstUnidad.negocios.every((negocio) => isHeadquartersName(negocio.name));

  if (isDefaultHeadquartersUnit) {
    return false;
  }

  if (firstUnidad.negocios.length <= 1) {
    return false;
  }

  return unidadHasMultiData(firstUnidad);
};

const mapConfigUnitsToState = (resolvedMap?: ConfigCenterEmpresaMapUnit[] | null): Unidad[] => (
  Array.isArray(resolvedMap) && resolvedMap.length > 0
    ? normalizeCorporateOfficeUnits(resolvedMap.map((unidad, unidadIndex) => ({
        id: `unit-${unidadIndex}-${unidad.name}`,
        name: unidad.name,
        legacyUnitId: unidad.legacy_unit_id,
        isCorporateOffice: unidad.is_corporate_office ?? unidad.isCorporateOffice,
        logo: unidad.logo,
        industria: unidad.industria,
        direccion: unidad.direccion,
        ciudad: unidad.ciudad,
        estado: unidad.estado,
        pais: unidad.pais,
        cp: unidad.cp,
        telefono: unidad.telefono,
        email: unidad.email,
        latitude: unidad.latitude,
        longitude: unidad.longitude,
        radiusMeters: unidad.radius_meters,
        coordinateSource: normalizeCoordinateSource(unidad.coordinate_source ?? ''),
        googleMapsUrl: unidad.google_maps_url,
        negocios: (unidad.businesses ?? []).map((negocio, negocioIndex) => ({
          id: `biz-${unidadIndex}-${negocioIndex}-${negocio.name}`,
          name: negocio.name,
          legacyBusinessId: negocio.legacy_business_id,
          logo: negocio.logo,
          industria: negocio.industria,
          direccion: negocio.direccion,
          ciudad: negocio.ciudad,
          estado: negocio.estado,
          pais: negocio.pais,
          cp: negocio.cp,
          telefono: negocio.telefono,
          email: negocio.email,
          gerente: negocio.gerente,
          horario: negocio.horario,
          latitude: negocio.latitude,
          longitude: negocio.longitude,
          radiusMeters: negocio.radius_meters,
          coordinateSource: normalizeCoordinateSource(negocio.coordinate_source ?? ''),
          googleMapsUrl: negocio.google_maps_url,
        })),
      })))
    : createDefaultUnidades()
);

const buildCorporateOfficeUnidad = ({
  existingUnidad,
  existingNegocio,
  companyName,
  companyLogo,
  industry,
  coordinates,
  additionalNegocios = [],
}: {
  existingUnidad?: Unidad;
  existingNegocio?: Negocio;
  companyName: string;
  companyLogo: string;
  industry: string;
  coordinates: {
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number | null;
    coordinateSource?: CoordinateSource | null;
    googleMapsUrl?: string | null;
  };
  additionalNegocios?: Negocio[];
}): Unidad => {
  const existingUnitName = existingUnidad?.name.trim() ?? '';
  const unitName = existingUnitName && !isHeadquartersName(existingUnitName)
    ? existingUnitName
    : CORPORATE_OFFICE_UNIT_NAME;
  const coordinateFields: LocationCoordinateData = {
    latitude: coordinates.latitude ?? undefined,
    longitude: coordinates.longitude ?? undefined,
    radiusMeters: coordinates.radiusMeters ?? undefined,
    coordinateSource: coordinates.coordinateSource ?? undefined,
    googleMapsUrl: coordinates.googleMapsUrl ?? undefined,
  };

  return {
    id: existingUnidad?.id || 'headquarters-default-unit',
    legacyUnitId: existingUnidad?.legacyUnitId,
    isCorporateOffice: true,
    name: unitName,
    logo: companyLogo,
    industria: industry,
    direccion: existingUnidad?.direccion ?? '',
    ciudad: existingUnidad?.ciudad ?? '',
    estado: existingUnidad?.estado ?? '',
    pais: existingUnidad?.pais ?? '',
    cp: existingUnidad?.cp ?? '',
    telefono: existingUnidad?.telefono ?? '',
    email: existingUnidad?.email ?? '',
    ...coordinateFields,
    negocios: [
      {
        id: existingNegocio?.id || 'headquarters-default-business',
        legacyBusinessId: existingNegocio?.legacyBusinessId,
        name: CORPORATE_OFFICE_BUSINESS_FALLBACK_NAME,
        logo: companyLogo,
        industria: industry,
        direccion: existingNegocio?.direccion ?? existingUnidad?.direccion ?? '',
        ciudad: existingNegocio?.ciudad ?? existingUnidad?.ciudad ?? '',
        estado: existingNegocio?.estado ?? existingUnidad?.estado ?? '',
        pais: existingNegocio?.pais ?? existingUnidad?.pais ?? '',
        cp: existingNegocio?.cp ?? existingUnidad?.cp ?? '',
        telefono: existingNegocio?.telefono ?? existingUnidad?.telefono ?? '',
        email: existingNegocio?.email ?? existingUnidad?.email ?? '',
        gerente: existingNegocio?.gerente ?? '',
        horario: existingNegocio?.horario ?? '',
        ...coordinateFields,
      },
      ...additionalNegocios,
    ],
  };
};

const buildUnitHeadquartersNegocio = ({
  unidad,
  existingNegocio,
}: {
  unidad: Unidad;
  existingNegocio?: Negocio;
}): Negocio => {
  const coordinateFields: LocationCoordinateData = {
    latitude: existingNegocio?.latitude ?? unidad.latitude,
    longitude: existingNegocio?.longitude ?? unidad.longitude,
    radiusMeters: existingNegocio?.radiusMeters ?? unidad.radiusMeters,
    coordinateSource: existingNegocio?.coordinateSource ?? unidad.coordinateSource,
    googleMapsUrl: existingNegocio?.googleMapsUrl ?? unidad.googleMapsUrl,
  };

  return {
    id: existingNegocio?.id || `unit-headquarters-${unidad.id}`,
    legacyBusinessId: existingNegocio?.legacyBusinessId,
    name: getUnitHeadquartersBusinessName(unidad.name),
    logo: existingNegocio?.logo ?? unidad.logo,
    industria: existingNegocio?.industria ?? unidad.industria,
    direccion: existingNegocio?.direccion ?? unidad.direccion ?? '',
    ciudad: existingNegocio?.ciudad ?? unidad.ciudad ?? '',
    estado: existingNegocio?.estado ?? unidad.estado ?? '',
    pais: existingNegocio?.pais ?? unidad.pais ?? '',
    cp: existingNegocio?.cp ?? unidad.cp ?? '',
    telefono: existingNegocio?.telefono ?? unidad.telefono ?? '',
    email: existingNegocio?.email ?? unidad.email ?? '',
    gerente: existingNegocio?.gerente ?? '',
    horario: existingNegocio?.horario ?? '',
    ...coordinateFields,
  };
};

const ensureCorporateOfficeBusiness = ({
  unidad,
  companyName,
  companyLogo,
  industry,
  coordinates,
}: {
  unidad: Unidad;
  companyName: string;
  companyLogo: string;
  industry: string;
  coordinates: {
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number | null;
    coordinateSource?: CoordinateSource | null;
    googleMapsUrl?: string | null;
  };
}): Unidad => {
  if (!unidad.isCorporateOffice) {
    return unidad;
  }

  const corporateOfficeNegocio = unidad.negocios.find((negocio, index) => isCorporateOfficeBusiness(negocio, companyName, index));
  const additionalNegocios = unidad.negocios.filter((negocio, index) => !isCorporateOfficeBusiness(negocio, companyName, index));

  return buildCorporateOfficeUnidad({
    existingUnidad: unidad,
    existingNegocio: corporateOfficeNegocio,
    companyName,
    companyLogo,
    industry,
    coordinates,
    additionalNegocios,
  });
};

const ensureUnitHeadquartersBusiness = (unidad: Unidad): Unidad => {
  const unitHeadquartersNegocio = unidad.negocios.find((negocio, index) => (
    isUnitHeadquartersBusiness(negocio, unidad.name, index)
  ));
  const operationalNegocios = unidad.negocios.filter((negocio, index) => (
    !isUnitHeadquartersBusiness(negocio, unidad.name, index)
  ));

  return {
    ...unidad,
    negocios: [
      buildUnitHeadquartersNegocio({
        unidad,
        existingNegocio: unitHeadquartersNegocio,
      }),
      ...operationalNegocios,
    ],
  };
};

const buildUnidadesWithCorporateOffice = ({
  existingUnidades,
  companyName,
  companyLogo,
  industry,
  coordinates,
  includeOtherUnits,
}: {
  existingUnidades: Unidad[];
  companyName: string;
  companyLogo: string;
  industry: string;
  coordinates: {
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number | null;
    coordinateSource?: CoordinateSource | null;
    googleMapsUrl?: string | null;
  };
  includeOtherUnits: boolean;
}): Unidad[] => {
  if (includeOtherUnits) {
    return normalizeCorporateOfficeUnits(existingUnidades)
      .map((unidad) => ensureCorporateOfficeBusiness({
        unidad,
        companyName,
        companyLogo,
        industry,
        coordinates,
      }))
      .map(ensureUnitHeadquartersBusiness);
  }

  const corporateOfficeUnidad = existingUnidades.find((unidad) => unidad.isCorporateOffice) ?? existingUnidades[0];
  const corporateOfficeNegocio = corporateOfficeUnidad?.negocios.find((negocio, index) => (
    isCorporateOfficeBusiness(negocio, companyName, index)
  ));
  const additionalCorporateOfficeNegocios = corporateOfficeUnidad
    ? corporateOfficeUnidad.negocios.filter((negocio, index) => (
        !isCorporateOfficeBusiness(negocio, companyName, index)
      ))
    : [];
  const corporateOffice = buildCorporateOfficeUnidad({
    existingUnidad: corporateOfficeUnidad,
    existingNegocio: corporateOfficeNegocio,
    companyName,
    companyLogo,
    industry,
    coordinates,
    additionalNegocios: additionalCorporateOfficeNegocios,
  });

  return [corporateOffice];
};

const buildConfigMap = (_estructuraType: EstructuraType, unidades: Unidad[]) => (
  unidades.map((unidad) => ({
    name: unidad.name,
    legacy_unit_id: unidad.legacyUnitId,
    is_corporate_office: unidad.isCorporateOffice === true,
    logo: unidad.logo,
    industria: unidad.industria,
    direccion: unidad.direccion,
    ciudad: unidad.ciudad,
    estado: unidad.estado,
    pais: unidad.pais,
    cp: unidad.cp,
    telefono: unidad.telefono,
    email: unidad.email,
    ...buildConfigCoordinateFields(unidad),
    businesses: unidad.negocios.map((negocio) => ({
      name: negocio.name,
      legacy_business_id: negocio.legacyBusinessId,
      logo: negocio.logo,
      industria: negocio.industria,
      direccion: negocio.direccion,
      ciudad: negocio.ciudad,
      estado: negocio.estado,
      pais: negocio.pais,
      cp: negocio.cp,
      telefono: negocio.telefono,
      email: negocio.email,
      gerente: negocio.gerente,
      horario: negocio.horario,
      ...buildConfigCoordinateFields(negocio),
    })),
  }))
);

export default function BusinessStructure() {
  const { currentLanguage, t } = useLanguage();
  const structure = t.panelInicial.structure;
  const [estructuraType, setEstructuraType] = useState<EstructuraType>('simple');
  const [unidades, setUnidades] = useState<Unidad[]>(createDefaultUnidades);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [companyAddress, setCompanyAddress] = useState<BusinessAddressFormValues>(DEFAULT_BUSINESS_ADDRESS_VALUES);
  const [companyLocation, setCompanyLocation] = useState<LocationCoordinateFormValues>(DEFAULT_LOCATION_COORDINATE_VALUES);
  const [baselineSnapshot, setBaselineSnapshot] = useState<BusinessStructureSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showUnidadModal, setShowUnidadModal] = useState(false);
  const [showNegocioModal, setShowNegocioModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<Unidad | null>(null);
  const [editingNegocio, setEditingNegocio] = useState<EditingNegocio | null>(null);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<PendingDeleteTarget | null>(null);
  const [unidadFormValues, setUnidadFormValues] = useState<UnidadFormValues>(DEFAULT_UNIDAD_FORM_VALUES);
  const [unidadInitialValues, setUnidadInitialValues] = useState<UnidadFormValues>(DEFAULT_UNIDAD_FORM_VALUES);
  const [negocioFormValues, setNegocioFormValues] = useState<NegocioFormValues>(DEFAULT_NEGOCIO_FORM_VALUES);
  const [negocioInitialValues, setNegocioInitialValues] = useState<NegocioFormValues>(DEFAULT_NEGOCIO_FORM_VALUES);
  const [loadingOverlay, setLoadingOverlay] = useState<{
    isVisible: boolean;
    title: string;
    description?: string;
  }>({
    isVisible: false,
    title: '',
  });
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const currentSnapshotRef = useRef<BusinessStructureSnapshot | null>(null);
  const failedAutoSaveKeyRef = useRef('');

  const hideLoadingOverlay = () => {
    setLoadingOverlay({
      isVisible: false,
      title: '',
      description: '',
    });
  };

  const showSuccessToast = (message: string) => {
    setSuccessToastMessage(message);
  };

  const currentSnapshot = useMemo(
    () => createBusinessStructureSnapshot({
      estructuraType,
      unidades,
      companyName,
      companyLogo,
      industry,
      description,
      companyAddress,
      companyLocation,
    }),
    [companyAddress, companyLocation, companyLogo, companyName, description, estructuraType, industry, unidades],
  );

  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  const hasUnsavedChanges = useMemo(
    () => baselineSnapshot !== null
      && JSON.stringify(currentSnapshot) !== JSON.stringify(baselineSnapshot),
    [baselineSnapshot, currentSnapshot],
  );
  const isSimpleModeDisabled = useMemo(
    () => estructuraType !== 'simple' && hasMeaningfulMultiStructureData(unidades),
    [estructuraType, unidades],
  );
  const isUnidadModalDirty = useMemo(
    () => !arePlainObjectsEqual(unidadFormValues, unidadInitialValues),
    [unidadFormValues, unidadInitialValues],
  );
  const isNegocioModalDirty = useMemo(
    () => !arePlainObjectsEqual(negocioFormValues, negocioInitialValues),
    [negocioFormValues, negocioInitialValues],
  );
  const modalCountryOptions = useMemo(() => {
    let countryDisplayNames: Intl.DisplayNames | null = null;

    try {
      countryDisplayNames = new Intl.DisplayNames([currentLanguage.code], { type: 'region' });
    } catch {
      countryDisplayNames = null;
    }

    const options = modalCountryOptionsSource.map((country) => {
      const countryName = countryDisplayNames?.of(country.code) ?? country.fallbackName;

      return {
        value: country.code,
        label: `${country.flag} ${countryName}`,
        sortName: countryName,
      };
    });
    const priorityCountryCodes = new Set<string>(MODAL_PRIORITY_COUNTRY_CODES);
    const priorityOptions = MODAL_PRIORITY_COUNTRY_CODES
      .map((countryCode) => options.find((country) => country.value === countryCode))
      .filter((country): country is typeof options[number] => Boolean(country));
    const remainingOptions = options
      .filter((country) => !priorityCountryCodes.has(country.value))
      .sort((firstCountry, secondCountry) => (
        firstCountry.sortName.localeCompare(secondCountry.sortName, currentLanguage.code)
      ));

    return [...priorityOptions, ...remainingOptions].map(({ value, label }) => ({ value, label }));
  }, [currentLanguage.code]);
  const getModalIndustryOptions = (selectedIndustry: string) => {
    if (!selectedIndustry || structure.options.businessIdentityIndustries.some((option) => option.value === selectedIndustry)) {
      return structure.options.businessIdentityIndustries;
    }

    const selectedLegacyIndustry = structure.options.unitIndustries.find((option) => option.value === selectedIndustry);
    return selectedLegacyIndustry
      ? [selectedLegacyIndustry, ...structure.options.businessIdentityIndustries]
      : structure.options.businessIdentityIndustries;
  };

  const syncSavedStructure = (nextEstructuraType: EstructuraType, nextUnidades: Unidad[]) => {
    setBaselineSnapshot((previousSnapshot) =>
      cloneSnapshot(
        createBusinessStructureSnapshot({
          estructuraType: nextEstructuraType,
          unidades: nextUnidades,
          companyName: previousSnapshot?.companyName ?? currentSnapshot.companyName,
          companyLogo: previousSnapshot?.companyLogo ?? currentSnapshot.companyLogo,
          industry: previousSnapshot?.industry ?? currentSnapshot.industry,
          description: previousSnapshot?.description ?? currentSnapshot.description,
          companyAddress: previousSnapshot?.companyAddress ?? currentSnapshot.companyAddress,
          companyLocation: previousSnapshot?.companyLocation ?? currentSnapshot.companyLocation,
        }),
      ),
    );
  };

  const getCurrentCorporateOfficeCoordinates = () => {
    const coordinateValidation = buildCoordinateSaveValues(companyLocation);
    return coordinateValidation.ok ? coordinateValidation.values : {};
  };

  const normalizeUnidadesForPersistence = (
    nextEstructuraType: EstructuraType,
    nextUnidades: Unidad[],
  ) => buildUnidadesWithCorporateOffice({
    existingUnidades: nextUnidades,
    companyName,
    companyLogo,
    industry,
    coordinates: getCurrentCorporateOfficeCoordinates(),
    includeOtherUnits: nextEstructuraType === 'multi',
  });

  const persistStructureConfig = async (nextEstructuraType: EstructuraType, nextUnidades: Unidad[]) => {
    const normalizedUnidades = normalizeUnidadesForPersistence(nextEstructuraType, nextUnidades);
    const response = await configCenterApi.saveConfig({
      estructura: nextEstructuraType,
      map: buildConfigMap(nextEstructuraType, normalizedUnidades),
    });

    return {
      response,
      normalizedUnidades,
    };
  };

  const runStructureFeedbackTask = async ({
    title,
    description,
    task,
    successMessage,
    minimumDurationMs = 900,
  }: {
    title: string;
    description?: string;
    task: () => Promise<void>;
    successMessage: string;
    minimumDurationMs?: number;
  }) => {
    setLoadingOverlay({
      isVisible: true,
      title,
      description,
    });

    try {
      await runWithMinimumDuration(task(), minimumDurationMs);
      showSuccessToast(successMessage);
    } finally {
      hideLoadingOverlay();
    }
  };

  useEffect(() => {
    let active = true;

    runWithMinimumDuration(Promise.allSettled([configCenterApi.getEmpresa(), configCenterApi.getConfig()]))
      .then((results) => {
        if (!active) {
          return;
        }

        const empresaResult = results[0];
        const configResult = results[1];

        const empresa = empresaResult.status === 'fulfilled' ? empresaResult.value : null;
        const config = configResult.status === 'fulfilled' ? configResult.value : null;

        const resolvedStructure = (config?.estructura ?? empresa?.estructura ?? 'simple') as EstructuraType;
        const resolvedMap = config?.map ?? empresa?.map ?? [];
        const loadedUnidades = mapConfigUnitsToState(resolvedMap);
        const loadedCompanyName = empresa?.nombre_empresa ?? '';
        const loadedCompanyLogo = empresa?.logo_url ?? '';
        const loadedIndustry = (empresa?.industria as string) ?? '';
        const loadedDescription = (empresa?.descripcion as string) ?? '';
        const loadedCompanyAddress = createBusinessAddressFormValues(
          empresa?.headquarters_location?.address ?? empresa?.address ?? null,
        );
        const loadedCompanyLocation = createLocationCoordinateFormValues({
          latitude: empresa?.latitude,
          longitude: empresa?.longitude,
          radius_meters: empresa?.radius_meters,
          coordinate_source: empresa?.coordinate_source,
          google_maps_url: empresa?.google_maps_url,
        });

        setEstructuraType(resolvedStructure === 'multi' ? 'multi' : 'simple');
        setCompanyName(loadedCompanyName);
        setCompanyLogo(loadedCompanyLogo);
        setIndustry(loadedIndustry);
        setDescription(loadedDescription);
        setCompanyAddress(loadedCompanyAddress);
        setCompanyLocation(loadedCompanyLocation);
        setUnidades(loadedUnidades);
        setBaselineSnapshot(
          cloneSnapshot(
            createBusinessStructureSnapshot({
              estructuraType: resolvedStructure === 'multi' ? 'multi' : 'simple',
              unidades: loadedUnidades,
              companyName: loadedCompanyName,
              companyLogo: loadedCompanyLogo,
              industry: loadedIndustry,
              description: loadedDescription,
              companyAddress: loadedCompanyAddress,
              companyLocation: loadedCompanyLocation,
            }),
          ),
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : structure.messages.loadError);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const closeUnidadModal = () => {
    setShowUnidadModal(false);
    setEditingUnidad(null);
    setUnidadFormValues(DEFAULT_UNIDAD_FORM_VALUES);
    setUnidadInitialValues(DEFAULT_UNIDAD_FORM_VALUES);
  };

  const closeNegocioModal = () => {
    setShowNegocioModal(false);
    setEditingNegocio(null);
    setNegocioFormValues(DEFAULT_NEGOCIO_FORM_VALUES);
    setNegocioInitialValues(DEFAULT_NEGOCIO_FORM_VALUES);
  };

  const handleEstructuraTypeChange = (nextType: EstructuraType) => {
    setEstructuraType(nextType);

    if (nextType === 'simple') {
      closeUnidadModal();
      closeNegocioModal();
    }
  };

  const applyDeleteUnidad = (unidadId: string, replacementCorporateUnitId?: string) => {
    setUnidades((prevUnidades) => {
      const deletedUnidad = prevUnidades.find((unidad) => unidad.id === unidadId);
      const remainingUnidades = prevUnidades.filter((unidad) => unidad.id !== unidadId);

      if (deletedUnidad?.isCorporateOffice && replacementCorporateUnitId) {
        return remainingUnidades.map((unidad) => ({
          ...unidad,
          isCorporateOffice: unidad.id === replacementCorporateUnitId,
        }));
      }

      if (deletedUnidad?.isCorporateOffice) {
        return normalizeCorporateOfficeUnits(remainingUnidades);
      }

      return normalizeCorporateOfficeUnits(remainingUnidades);
    });
  };

  const applyDeleteNegocio = (unidadId: string, negocioId: string) => {
    setUnidades((prevUnidades) =>
      prevUnidades.map((unidad) =>
        unidad.id === unidadId
          ? {
              ...unidad,
              negocios: unidad.negocios.filter((negocio) => negocio.id !== negocioId),
            }
          : unidad,
      ),
    );
  };

  const handleRequestDeleteUnidad = (unidadId: string) => {
    const unidad = unidades.find((item) => item.id === unidadId);
    if (!unidad) {
      return;
    }

    setPendingDeleteTarget({
      type: 'unit',
      unidadId,
      name: unidad.name,
    });
  };

  const handleRequestDeleteNegocio = (unidadId: string, negocioId: string) => {
    const unidad = unidades.find((item) => item.id === unidadId);
    const negocio = unidad?.negocios.find((item) => item.id === negocioId);

    if (!unidad || !negocio) {
      return;
    }

    setPendingDeleteTarget({
      type: 'business',
      unidadId,
      negocioId,
      name: negocio.name,
    });
  };

  const handleCancelDelete = () => {
    setPendingDeleteTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteTarget) {
      return;
    }

    if (pendingDeleteTarget.type === 'unit') {
      applyDeleteUnidad(pendingDeleteTarget.unidadId);
    } else {
      applyDeleteNegocio(pendingDeleteTarget.unidadId, pendingDeleteTarget.negocioId);
    }

    setPendingDeleteTarget(null);
  };

  const handleSaveUnidad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const emailValidation = validateOptionalEmail(unidadFormValues.email);
    if (!emailValidation.ok) {
      setLoadError(t.loginPage.emailError);
      return;
    }

    const coordinateValidation = buildCoordinateSaveValues(unidadFormValues);
    if (coordinateValidation.ok === false) {
      setLoadError(coordinateValidation.message);
      return;
    }

    const manualLocationValidation = buildManualLocationSaveValues(unidadFormValues);
    if (manualLocationValidation.ok === false) {
      setLoadError(manualLocationValidation.message);
      return;
    }

    const newUnidad: Unidad = {
      id: editingUnidad?.id || String(Date.now()),
      name: unidadFormValues.name.trim(),
      isCorporateOffice: editingUnidad?.isCorporateOffice ?? unidades.length === 0,
      logo: unidadFormValues.logo,
      industria: unidadFormValues.industria,
      direccion: unidadFormValues.direccion,
      ciudad: manualLocationValidation.values.ciudad,
      estado: manualLocationValidation.values.estado,
      pais: manualLocationValidation.values.pais,
      cp: manualLocationValidation.values.cp,
      telefono: unidadFormValues.telefono,
      email: emailValidation.normalized,
      latitude: coordinateValidation.values.latitude ?? undefined,
      longitude: coordinateValidation.values.longitude ?? undefined,
      radiusMeters: coordinateValidation.values.radiusMeters ?? undefined,
      coordinateSource: coordinateValidation.values.coordinateSource ?? undefined,
      googleMapsUrl: coordinateValidation.values.googleMapsUrl ?? undefined,
      negocios: editingUnidad?.negocios || [],
    };

    void runStructureFeedbackTask({
      title: editingUnidad ? structure.messages.updateUnitTitle : structure.messages.createUnitTitle,
      description: structure.messages.unitOverlayDescription,
      successMessage: editingUnidad
        ? structure.messages.updateUnitSuccess
        : structure.messages.createUnitSuccess,
      task: async () => {
        const nextUnidades = editingUnidad
          ? unidades.map((unidad) => (unidad.id === editingUnidad.id ? newUnidad : unidad))
          : [...unidades, newUnidad];

        const { response, normalizedUnidades } = await persistStructureConfig(estructuraType, nextUnidades);
        const savedUnidades = mapConfigUnitsToState(response.map);
        const committedUnidades = savedUnidades.length > 0 ? savedUnidades : normalizedUnidades;
        setUnidades(committedUnidades);
        syncSavedStructure(estructuraType, committedUnidades);
        closeUnidadModal();
      },
    });
  };

  const handleSaveNegocio = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingNegocio?.unidadId) {
      return;
    }

    const emailValidation = validateOptionalEmail(negocioFormValues.email);
    if (!emailValidation.ok) {
      setLoadError(t.loginPage.emailError);
      return;
    }

    const coordinateValidation = buildCoordinateSaveValues(negocioFormValues);
    if (coordinateValidation.ok === false) {
      setLoadError(coordinateValidation.message);
      return;
    }

    const manualLocationValidation = buildManualLocationSaveValues(negocioFormValues);
    if (manualLocationValidation.ok === false) {
      setLoadError(manualLocationValidation.message);
      return;
    }

    const newNegocio: Negocio = {
      id: editingNegocio.id || String(Date.now()),
      name: negocioFormValues.name.trim(),
      logo: negocioFormValues.logo,
      industria: negocioFormValues.industria,
      direccion: negocioFormValues.direccion,
      ciudad: manualLocationValidation.values.ciudad,
      estado: manualLocationValidation.values.estado,
      pais: manualLocationValidation.values.pais,
      cp: manualLocationValidation.values.cp,
      telefono: negocioFormValues.telefono,
      email: emailValidation.normalized,
      gerente: negocioFormValues.gerente,
      horario: negocioFormValues.horario,
      latitude: coordinateValidation.values.latitude ?? undefined,
      longitude: coordinateValidation.values.longitude ?? undefined,
      radiusMeters: coordinateValidation.values.radiusMeters ?? undefined,
      coordinateSource: coordinateValidation.values.coordinateSource ?? undefined,
      googleMapsUrl: coordinateValidation.values.googleMapsUrl ?? undefined,
    };

    void runStructureFeedbackTask({
      title: editingNegocio.id ? structure.messages.updateBusinessTitle : structure.messages.createBusinessTitle,
      description: structure.messages.businessOverlayDescription,
      successMessage: editingNegocio.id
        ? structure.messages.updateBusinessSuccess
        : structure.messages.createBusinessSuccess,
        task: async () => {
          const nextUnidades = unidades.map((unidad) => {
            if (unidad.id !== editingNegocio.unidadId) {
              return unidad;
            }

            if (editingNegocio.id) {
              return {
                ...unidad,
                negocios: unidad.negocios.map((negocio) =>
                  negocio.id === editingNegocio.id ? newNegocio : negocio,
                ),
              };
            }

            return {
              ...unidad,
              negocios: [...unidad.negocios, newNegocio],
            };
          });

        const { response, normalizedUnidades } = await persistStructureConfig(estructuraType, nextUnidades);
        const savedUnidades = mapConfigUnitsToState(response.map);
        const committedUnidades = savedUnidades.length > 0 ? savedUnidades : normalizedUnidades;
        setUnidades(committedUnidades);
        syncSavedStructure(estructuraType, committedUnidades);
        closeNegocioModal();
      },
    });
  };

  const handleEditUnidad = (unidad: Unidad) => {
    setEditingUnidad(unidad);
    const nextFormValues = createUnidadFormValues(unidad);
    setUnidadFormValues(nextFormValues);
    setUnidadInitialValues(nextFormValues);
    setShowUnidadModal(true);
  };

  const handleCreateUnidad = () => {
    setEditingUnidad(null);
    setUnidadFormValues(DEFAULT_UNIDAD_FORM_VALUES);
    setUnidadInitialValues(DEFAULT_UNIDAD_FORM_VALUES);
    setShowUnidadModal(true);
  };

  const handleEditNegocio = (negocio: Negocio, unidadId: string) => {
    setEditingNegocio({ ...negocio, unidadId });
    const nextFormValues = createNegocioFormValues(negocio);
    setNegocioFormValues(nextFormValues);
    setNegocioInitialValues(nextFormValues);
    setShowNegocioModal(true);
  };

  const handleCreateNegocio = (unidadId: string) => {
    setEditingNegocio({ unidadId });
    setNegocioFormValues(DEFAULT_NEGOCIO_FORM_VALUES);
    setNegocioInitialValues(DEFAULT_NEGOCIO_FORM_VALUES);
    setShowNegocioModal(true);
  };

  const handlePersistBusinessStructure = async ({ silent = false }: { silent?: boolean } = {}) => {
    setIsSaving(true);
    setLoadError('');

    const snapshotToPersist = cloneSnapshot(currentSnapshot);
    const companyCoordinateValidation = buildCoordinateSaveValues(companyLocation);
    if (companyCoordinateValidation.ok === false) {
      setLoadError(companyCoordinateValidation.message);
      setIsSaving(false);
      return;
    }

    try {
      const task = async () => {
        const nextUnidades = buildUnidadesWithCorporateOffice({
          existingUnidades: unidades,
          companyName,
          companyLogo,
          industry,
          coordinates: companyCoordinateValidation.values,
          includeOtherUnits: estructuraType === 'multi',
        });

        const { response, normalizedUnidades } = await persistStructureConfig(estructuraType, nextUnidades);
        const savedUnidades = mapConfigUnitsToState(response.map);
        const committedUnidades = savedUnidades.length > 0 ? savedUnidades : normalizedUnidades;

        await configCenterApi.saveEmpresa({
          nombre_empresa: companyName,
          logo_url: companyLogo || null,
          industria: industry,
          descripcion: description,
          address: companyAddress,
          latitude: companyCoordinateValidation.values.latitude ?? null,
          longitude: companyCoordinateValidation.values.longitude ?? null,
          radius_meters: companyCoordinateValidation.values.radiusMeters ?? null,
          coordinate_source: companyCoordinateValidation.values.coordinateSource ?? null,
          google_maps_url: companyCoordinateValidation.values.googleMapsUrl ?? null,
          sync_company_location: false,
        });

        const savedSnapshot = cloneSnapshot(
          createBusinessStructureSnapshot({
            estructuraType,
            unidades: committedUnidades,
            companyName,
            companyLogo,
            industry,
            description,
            companyAddress,
            companyLocation,
          }),
        );

        const latestSnapshot = currentSnapshotRef.current;
        const canApplyCommittedUnits = latestSnapshot
          ? JSON.stringify(latestSnapshot.unidades) === JSON.stringify(snapshotToPersist.unidades)
          : true;

        if (canApplyCommittedUnits) {
          setUnidades(committedUnidades);
        }
        setBaselineSnapshot(savedSnapshot);
        failedAutoSaveKeyRef.current = '';
      };

      if (silent) {
        await task();
      } else {
        await runStructureFeedbackTask({
          title: structure.messages.saveOverlay,
          description: structure.messages.saveOverlayDescription,
          successMessage: structure.messages.saveSuccess,
          minimumDurationMs: 2500,
          task,
        });
      }
    } catch (error) {
      failedAutoSaveKeyRef.current = JSON.stringify(snapshotToPersist);
      setLoadError(error instanceof Error ? error.message : structure.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (
      isLoading
      || isSaving
      || loadingOverlay.isVisible
      || showUnidadModal
      || showNegocioModal
      || pendingDeleteTarget !== null
      || !baselineSnapshot
      || !hasUnsavedChanges
    ) {
      return undefined;
    }

    const coordinateValidation = buildCoordinateSaveValues(companyLocation);
    if (coordinateValidation.ok === false) {
      return undefined;
    }

    const autoSaveKey = JSON.stringify(currentSnapshot);
    if (failedAutoSaveKeyRef.current === autoSaveKey) {
      return undefined;
    }

    const saveTimer = window.setTimeout(() => {
      void handlePersistBusinessStructure({ silent: true });
    }, BUSINESS_STRUCTURE_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [
    baselineSnapshot,
    companyLocation,
    currentSnapshot,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    loadingOverlay.isVisible,
    pendingDeleteTarget,
    showNegocioModal,
    showUnidadModal,
  ]);

  const handleDiscardChanges = () => {
    if (!baselineSnapshot || isSaving) {
      return;
    }

    closeUnidadModal();
    closeNegocioModal();
    setLoadError('');
    setEstructuraType(baselineSnapshot.estructuraType);
    setUnidades(cloneSnapshot(baselineSnapshot).unidades);
    setCompanyName(baselineSnapshot.companyName);
    setCompanyLogo(baselineSnapshot.companyLogo);
    setIndustry(baselineSnapshot.industry);
    setDescription(baselineSnapshot.description);
    setCompanyAddress(baselineSnapshot.companyAddress);
    setCompanyLocation(baselineSnapshot.companyLocation);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 p-4 dark:border-blue-700/30 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="text-2xl">🏢</span>
              {structure.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {structure.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{structure.status.connected}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
          {structure.messages.loading}
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

      <BusinessIdentitySection
        estructuraType={estructuraType}
        structure={structure}
        companyName={companyName}
        logo={companyLogo}
        industry={industry}
        description={description}
        businessAddress={companyAddress}
        locationCoordinateValues={companyLocation}
        onCompanyNameChange={setCompanyName}
        onLogoChange={setCompanyLogo}
        onIndustryChange={setIndustry}
        onDescriptionChange={setDescription}
        onBusinessAddressChange={(updates) => setCompanyAddress((current) => ({
          ...current,
          ...updates,
        }))}
        onLocationCoordinateChange={(updates) => setCompanyLocation((current) => ({
          ...current,
          ...updates,
        }))}
        disabled={loadingOverlay.isVisible}
      />

      <OperationTypeSection
        estructuraType={estructuraType}
        structure={structure}
        isSimpleDisabled={isSimpleModeDisabled}
        onEstructuraTypeChange={handleEstructuraTypeChange}
      />

      {estructuraType === 'multi' && (
        <UnitsSection
          unidades={unidades}
          structure={structure}
          onEditUnidad={handleEditUnidad}
          onDeleteUnidad={handleRequestDeleteUnidad}
          onEditNegocio={handleEditNegocio}
          onDeleteNegocio={handleRequestDeleteNegocio}
          onCreateNegocio={handleCreateNegocio}
          onCreateUnidad={handleCreateUnidad}
        />
      )}

      {showUnidadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 bg-blue-600 p-4 dark:bg-blue-700 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {editingUnidad
                    ? structure.modal.editUnit
                    : structure.modal.newUnit}
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  {editingUnidad
                    ? structure.modal.editUnitDescription
                    : structure.modal.newUnitDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUnidadModal}
                className="p-2 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form
              onSubmit={handleSaveUnidad}
              className="overflow-y-auto max-h-[calc(90vh-160px)]"
            >
              <div className="space-y-5 p-4 sm:p-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {structure.fields.basicInfo}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.units.unitName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={unidadFormValues.name}
                        onChange={(event) => setUnidadFormValues((current) => ({
                          ...current,
                          name: event.target.value,
                        }))}
                        required
                        placeholder={structure.placeholders.unitName}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.logo}{' '}
                        <span className="text-xs text-gray-500 font-normal">
                          ({structure.fields.optional})
                        </span>
                      </label>
                      <div className="flex flex-col items-start gap-4 sm:flex-row">
                        {unidadFormValues.logo && (
                          <div className="flex-shrink-0">
                            <img
                              src={unidadFormValues.logo}
                              alt={structure.fields.logoPreviewAlt}
                              className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => readImageAsPreview(event, (preview) => {
                              setUnidadFormValues((current) => ({
                                ...current,
                                logo: preview,
                              }));
                            })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 file:cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {structure.fields.uploadHint}
                          </p>
                          {unidadFormValues.logo && (
                            <button
                              type="button"
                              onClick={() => {
                                setUnidadFormValues((current) => ({
                                  ...current,
                                  logo: '',
                                }));
                              }}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                            >
                              {structure.fields.removeLogo}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.industry}{' '}
                        <span className="text-xs text-gray-500 font-normal">
                          ({structure.fields.optional})
                        </span>
                      </label>
                      <select
                        name="industria"
                        value={unidadFormValues.industria}
                        onChange={(event) => setUnidadFormValues((current) => ({
                          ...current,
                          industria: event.target.value,
                        }))}
                        className={`${inputClassName} appearance-none cursor-pointer`}
                      >
                        <option value="">{structure.fields.selectIndustry}</option>
                        {getModalIndustryOptions(unidadFormValues.industria).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {structure.fields.location}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.address}
                      </label>
                      <input
                        type="text"
                        name="direccion"
                        value={unidadFormValues.direccion}
                        onChange={(event) => setUnidadFormValues((current) => ({
                          ...current,
                          direccion: event.target.value,
                        }))}
                        placeholder={structure.placeholders.address}
                        className={inputClassName}
                      />
                    </div>

                    <ManualLocationFields
                      values={unidadFormValues}
                      countries={modalCountryOptions}
                      labels={{
                        country: structure.fields.country,
                        selectCountry: structure.fields.selectCountry,
                        city: structure.fields.city,
                        state: structure.fields.state,
                        postalCode: structure.fields.postalCode,
                      }}
                      placeholders={{
                        city: structure.placeholders.city,
                        state: structure.placeholders.state,
                        postalCode: structure.placeholders.postalCode,
                      }}
                      onChange={(updates) => setUnidadFormValues((current) => ({
                        ...current,
                        ...updates,
                      }))}
                      stateDropdownCountryCodes={MODAL_STATE_DROPDOWN_COUNTRY_CODES}
                      disabled={loadingOverlay.isVisible}
                    />

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Coordinates
                        </h5>
                        <LocationCoordinateFields
                          values={unidadFormValues}
                          onChange={(updates) => setUnidadFormValues((current) => ({
                            ...current,
                            ...updates,
                          }))}
                          disabled={loadingOverlay.isVisible}
                        />
                      </div>
                    </div>
                  </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {structure.fields.contact}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      ({structure.fields.optional})
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.phone}
                      </label>
                      <input
                        type="tel"
                        name="telefono"
                        value={unidadFormValues.telefono}
                        onChange={(event) => setUnidadFormValues((current) => ({
                          ...current,
                          telefono: event.target.value,
                        }))}
                        placeholder={structure.placeholders.phone}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.email}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={unidadFormValues.email}
                        onChange={(event) => setUnidadFormValues((current) => ({
                          ...current,
                          email: event.target.value,
                        }))}
                        placeholder={structure.placeholders.unitEmail}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50 sm:flex-row sm:items-center sm:justify-end sm:p-6">
                <Button
                  type="button"
                  onClick={closeUnidadModal}
                  className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
                >
                  {structure.modal.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={!isUnidadModalDirty || unidadFormValues.name.trim().length === 0 || loadingOverlay.isVisible}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                  {structure.modal.save}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNegocioModal && editingNegocio && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 bg-blue-600 p-4 dark:bg-blue-700 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {editingNegocio.id
                    ? structure.modal.editBusiness
                    : structure.modal.newBusiness}
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                  {editingNegocio.id
                    ? structure.modal.editBusinessDescription
                    : structure.modal.newBusinessDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNegocioModal}
                className="p-2 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form
              onSubmit={handleSaveNegocio}
              className="overflow-y-auto max-h-[calc(90vh-160px)]"
            >
              <div className="space-y-5 p-4 sm:p-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {structure.fields.basicInfo}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.units.businessName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={negocioFormValues.name}
                        onChange={(event) => setNegocioFormValues((current) => ({
                          ...current,
                          name: event.target.value,
                        }))}
                        required
                        placeholder={structure.placeholders.businessName}
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.logo}{' '}
                        <span className="text-xs text-gray-500 font-normal">
                          ({structure.fields.optional})
                        </span>
                      </label>
                      <div className="flex flex-col items-start gap-4 sm:flex-row">
                        {negocioFormValues.logo && (
                          <div className="flex-shrink-0">
                            <img
                              src={negocioFormValues.logo}
                              alt={structure.fields.logoPreviewAlt}
                              className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                            />
                          </div>
                        )}

                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => readImageAsPreview(event, (preview) => {
                              setNegocioFormValues((current) => ({
                                ...current,
                                logo: preview,
                              }));
                            })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 file:cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {structure.fields.uploadHint}
                          </p>
                          {negocioFormValues.logo && (
                            <button
                              type="button"
                              onClick={() => {
                                setNegocioFormValues((current) => ({
                                  ...current,
                                  logo: '',
                                }));
                              }}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                            >
                              {structure.fields.removeLogo}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.industry}{' '}
                        <span className="text-xs text-gray-500 font-normal">
                          ({structure.fields.optional})
                        </span>
                      </label>
                      <select
                        name="industria"
                        value={negocioFormValues.industria}
                        onChange={(event) => setNegocioFormValues((current) => ({
                          ...current,
                          industria: event.target.value,
                        }))}
                        className={`${inputClassName} appearance-none cursor-pointer`}
                      >
                        <option value="">{structure.fields.selectIndustry}</option>
                        {getModalIndustryOptions(negocioFormValues.industria).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {structure.fields.location}
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.address}
                      </label>
                      <input
                        type="text"
                        name="direccion"
                        value={negocioFormValues.direccion}
                        onChange={(event) => setNegocioFormValues((current) => ({
                          ...current,
                          direccion: event.target.value,
                        }))}
                        placeholder={structure.placeholders.address}
                        className={inputClassName}
                      />
                    </div>

                    <ManualLocationFields
                      values={negocioFormValues}
                      countries={modalCountryOptions}
                      labels={{
                        country: structure.fields.country,
                        selectCountry: structure.fields.selectCountry,
                        city: structure.fields.city,
                        state: structure.fields.state,
                        postalCode: structure.fields.postalCode,
                      }}
                      placeholders={{
                        city: structure.placeholders.city,
                        state: structure.placeholders.state,
                        postalCode: structure.placeholders.postalCode,
                      }}
                      onChange={(updates) => setNegocioFormValues((current) => ({
                        ...current,
                        ...updates,
                      }))}
                      stateDropdownCountryCodes={MODAL_STATE_DROPDOWN_COUNTRY_CODES}
                      disabled={loadingOverlay.isVisible}
                    />

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Coordinates
                        </h5>
                        <LocationCoordinateFields
                          values={negocioFormValues}
                          onChange={(updates) => setNegocioFormValues((current) => ({
                            ...current,
                            ...updates,
                          }))}
                          disabled={loadingOverlay.isVisible}
                        />
                      </div>
                    </div>
                  </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {structure.fields.operationalInfo}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      ({structure.fields.optional})
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.phone}
                        </label>
                        <input
                          type="tel"
                          name="telefono"
                          value={negocioFormValues.telefono}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            telefono: event.target.value,
                          }))}
                          placeholder={structure.placeholders.phone}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.email}
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={negocioFormValues.email}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            email: event.target.value,
                          }))}
                          placeholder={structure.placeholders.businessEmail}
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.manager}
                        </label>
                        <input
                          type="text"
                          name="gerente"
                          value={negocioFormValues.gerente}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            gerente: event.target.value,
                          }))}
                          placeholder={structure.placeholders.manager}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.schedule}
                        </label>
                        <input
                          type="text"
                          name="horario"
                          value={negocioFormValues.horario}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            horario: event.target.value,
                          }))}
                          placeholder={structure.placeholders.schedule}
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50 sm:flex-row sm:items-center sm:justify-end sm:p-6">
                <Button
                  type="button"
                  onClick={closeNegocioModal}
                  className="w-full bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 sm:w-auto"
                >
                  {structure.modal.cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={!isNegocioModalDirty || negocioFormValues.name.trim().length === 0 || loadingOverlay.isVisible}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                  {editingNegocio.id
                    ? structure.modal.save
                    : structure.modal.createBusiness}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoadingBarOverlay
        isVisible={loadingOverlay.isVisible}
        title={loadingOverlay.title}
        description={loadingOverlay.description}
      />

      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />

      <ConfirmDeleteDialog
        isVisible={pendingDeleteTarget !== null}
        title={pendingDeleteTarget?.type === 'unit'
          ? structure.modal.confirmDeleteUnit
          : structure.modal.confirmDeleteBusiness}
        itemName={pendingDeleteTarget?.name}
        confirmLabel={structure.modal.delete}
        cancelLabel={structure.modal.cancel}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

    </div>
  );
}
