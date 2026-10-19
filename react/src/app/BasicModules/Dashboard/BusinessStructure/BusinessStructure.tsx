import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Building2, Landmark } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { IndiceModalFrame } from '../../../components/indice-modal';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLanguage } from '../../../shared/context';
import { DashboardTitleBar } from '../components/DashboardTitleBar';
import { PROFILE_COUNTRY_OPTIONS } from '../../../shared/profileCountries';
import { canOpenAccountTab } from '../../../access/headerMenuAccess';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { getCachedAuthSession, setCachedAuthSession } from '../../../api/authSessionStore';
import { ApiClientError } from '../../../lib/apiClient';
import { getCompanySettingsFeedback, getCompanyPostalFeedback } from './companySettingsFeedback';
import { readCompanyLogo } from './companyLogo';
import { configCenterApi, currentProfileActor, type ConfigCenterEmpresaMapUnit } from '../../../api/configCenter';
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
import { useBusinessStructureTranslations } from './hooks/useBusinessStructureTranslations';

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
}): Unidad => {
  const existingIsStandaloneCorporateOffice = isHeadquartersName(existingUnidad?.name);
  const coordinateFields: LocationCoordinateData = {
    latitude: coordinates.latitude ?? undefined,
    longitude: coordinates.longitude ?? undefined,
    radiusMeters: coordinates.radiusMeters ?? undefined,
    coordinateSource: coordinates.coordinateSource ?? undefined,
    googleMapsUrl: coordinates.googleMapsUrl ?? undefined,
  };

  return {
    id: existingIsStandaloneCorporateOffice ? existingUnidad?.id || 'headquarters-default-unit' : 'headquarters-default-unit',
    legacyUnitId: existingIsStandaloneCorporateOffice ? existingUnidad?.legacyUnitId : undefined,
    isCorporateOffice: true,
    name: CORPORATE_OFFICE_UNIT_NAME,
    logo: companyLogo,
    industria: industry,
    direccion: existingNegocio?.direccion ?? existingUnidad?.direccion ?? '',
    ciudad: existingNegocio?.ciudad ?? existingUnidad?.ciudad ?? '',
    estado: existingNegocio?.estado ?? existingUnidad?.estado ?? '',
    pais: existingNegocio?.pais ?? existingUnidad?.pais ?? '',
    cp: existingNegocio?.cp ?? existingUnidad?.cp ?? '',
    telefono: existingNegocio?.telefono ?? existingUnidad?.telefono ?? '',
    email: existingNegocio?.email ?? existingUnidad?.email ?? '',
    ...coordinateFields,
    negocios: [],
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
  const normalizedExistingUnits = normalizeCorporateOfficeUnits(existingUnidades);
  const corporateOfficeUnidad = normalizedExistingUnits.find((unidad) => unidad.isCorporateOffice) ?? normalizedExistingUnits[0];
  const corporateOfficeNegocio = corporateOfficeUnidad?.negocios.find((negocio, index) => (
    isCorporateOfficeBusiness(negocio, companyName, index)
  ));
  const corporateOffice = buildCorporateOfficeUnidad({
    existingUnidad: corporateOfficeUnidad,
    existingNegocio: corporateOfficeNegocio,
    companyName,
    companyLogo,
    industry,
    coordinates,
  });

  if (!includeOtherUnits) {
    return [corporateOffice];
  }

  const operationalUnits = normalizedExistingUnits.flatMap((unidad) => {
    if (unidad === corporateOfficeUnidad && isHeadquartersName(unidad.name)) {
      return [];
    }

    return [{
      ...unidad,
      isCorporateOffice: false,
      negocios: unidad.negocios.filter((negocio, index) => (
        !isCorporateOfficeBusiness(negocio, companyName, index)
      )),
    }];
  }).map(ensureUnitHeadquartersBusiness);

  return [corporateOffice, ...operationalUnits];
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
  const revision = useAuthorizationRevision();
  const actor = currentProfileActor();
  return <CompanySettingsEditor key={`${actor}:${revision}`} actor={actor} />;
}

function CompanySettingsEditor({ actor }: { actor: string | null }) {
  const { currentLanguage } = useLanguage();
  const structure = useBusinessStructureTranslations();
  const feedback = getCompanySettingsFeedback(currentLanguage.code);
  const alive = useRef(true);
  const mutationRef = useRef(false);
  const savedReceiptRef = useRef<BusinessStructureSnapshot | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [logoBusy, setLogoBusy] = useState(false);
  const [coordinateBusy, setCoordinateBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const modalErrorRef = useRef<HTMLDivElement>(null);
  const isCurrent = () => alive.current && actor !== null && currentProfileActor() === actor;
  const readableError = (error: unknown, fallback = feedback.save) => {
    const code = error instanceof ApiClientError ? error.code : error instanceof Error ? error.message : '';
    const messages: Record<string, string> = {
      company_actor_changed: feedback.changed, company_name_required: feedback.name,
      company_name_too_long: feedback.longName, company_logo_size: feedback.logoSize,
      company_invalid_logo: feedback.logo, company_duplicate_name: feedback.organization,
      company_invalid_organization: feedback.organization, company_organization_changed: feedback.changed,
      company_invalid_email: structure.validation.invalidEmail, company_address_too_long: feedback.address,
    };
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return feedback.permission;
    if (code && messages[code]) return messages[code];
    if (code?.startsWith('Latitude') || code?.startsWith('Longitude')) return feedback.coordinates;
    if (code?.startsWith('Radius')) return feedback.radius;
    return fallback;
  };
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
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
  const [canEditStructure, setCanEditStructure] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const currentSnapshotRef = useRef<BusinessStructureSnapshot | null>(null);
  const failedAutoSaveKeyRef = useRef('');
  const isStructureReadOnly = !canEditStructure || isLoading || !baselineSnapshot || loadingOverlay.isVisible || logoBusy;
  const isMutationBusy = isSaving || loadingOverlay.isVisible || logoBusy || coordinateBusy;

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

  currentSnapshotRef.current = currentSnapshot;

  useEffect(() => {
    if (loadError) (showUnidadModal || showNegocioModal ? modalErrorRef : errorRef).current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [loadError, showUnidadModal, showNegocioModal]);

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

  const syncSavedStructure = (_nextType: EstructuraType, _nextUnits: Unidad[]) => {
    if (isCurrent() && savedReceiptRef.current) setBaselineSnapshot(cloneSnapshot(savedReceiptRef.current));
  };

  const readImageAsPreview = async (event: ChangeEvent<HTMLInputElement>, onLoad: (preview: string) => void) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isMutationBusy || mutationRef.current || !isCurrent()) return;
    setLogoBusy(true);
    setLoadError('');
    try { const preview = await readCompanyLogo(file); if (isCurrent()) onLoad(preview); }
    catch (error) { if (isCurrent()) setLoadError(readableError(error)); }
    finally { if (isCurrent()) setLogoBusy(false); }
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
    if (!isCurrent() || !canEditStructure || !baselineSnapshot || mutationRef.current || logoBusy || coordinateBusy)
      throw new Error('company_actor_changed');
    const before = cloneSnapshot(currentSnapshotRef.current!);
    if (!before.companyName.trim()) throw new Error('company_name_required');
    if ([...before.companyName.trim()].length > 120) throw new Error('company_name_too_long');
    const coordinates = buildCoordinateSaveValues(before.companyLocation);
    if (coordinates.ok === false) throw new Error(coordinates.message);
    const postal = validatePostalCodeForCountry(before.companyAddress.country, before.companyAddress.zip);
    if ('message' in postal) throw new Error('company_postal_invalid');
    const normalizedUnidades = normalizeUnidadesForPersistence(nextEstructuraType, nextUnidades);
    mutationRef.current = true;
    setIsSaving(true);
    setLoadError('');
    try {
      const response = await configCenterApi.saveConfig({
        estructura: nextEstructuraType, map: buildConfigMap(nextEstructuraType, normalizedUnidades),
        company: {
          nombre_empresa: before.companyName.trim(), logo_url: before.companyLogo || null,
          industria: before.industry, descripcion: before.description, address: before.companyAddress,
          latitude: coordinates.values.latitude ?? null, longitude: coordinates.values.longitude ?? null,
          radius_meters: coordinates.values.radiusMeters ?? null, coordinate_source: coordinates.values.coordinateSource ?? null,
          google_maps_url: coordinates.values.googleMapsUrl ?? null, sync_company_location: false,
        },
      }, actor);
      if (!isCurrent()) throw new Error('company_actor_changed');
      if (!Array.isArray(response.map) || !response.map.length || String(response.company?.id) !== actor?.split(':')[0]) throw new Error('company_invalid_receipt');
      const savedUnits = mapConfigUnitsToState(response.map);
      const savedSnapshot = cloneSnapshot({ ...before, companyName: response.company!.nombre_empresa, estructuraType: nextEstructuraType, unidades: savedUnits });
      savedReceiptRef.current = savedSnapshot;
      setBaselineSnapshot(savedSnapshot);
      if (JSON.stringify(currentSnapshotRef.current?.unidades) === JSON.stringify(before.unidades)) setUnidades(savedUnits);
      if (currentSnapshotRef.current?.companyName === before.companyName) setCompanyName(savedSnapshot.companyName);
      failedAutoSaveKeyRef.current = '';
      const session = getCachedAuthSession();
      if (session && currentProfileActor() === actor) {
        setCachedAuthSession({ ...session, company: { ...session.company, name: savedSnapshot.companyName }, companies: session.companies?.map((company) => company.id === session.company.id ? { ...company, name: savedSnapshot.companyName } : company) });
        window.dispatchEvent(new CustomEvent('indice:company-settings-saved', { detail: { actor, name: savedSnapshot.companyName } }));
      }
      return { response, normalizedUnidades: savedUnits };
    } finally {
      mutationRef.current = false;
      if (isCurrent()) setIsSaving(false);
    }
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
      if (isCurrent()) showSuccessToast(successMessage);
    } catch (error) {
      if (isCurrent()) {
        const postal = validatePostalCodeForCountry(companyAddress.country, companyAddress.zip);
        setLoadError(error instanceof Error && error.message === 'company_postal_invalid' && 'message' in postal ? getCompanyPostalFeedback(currentLanguage.code, companyAddress.country) : readableError(error));
      }
    } finally {
      if (isCurrent()) hideLoadingOverlay();
    }
  };

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError('');
    runWithMinimumDuration(Promise.all([
      configCenterApi.getEmpresa(actor),
      configCenterApi.getConfig(actor),
    ]))
      .then(([empresa, config]) => {
        if (!active || !isCurrent()) {
          return;
        }

        if (!empresa || String(empresa.id) !== actor?.split(':')[0] || !config || !Array.isArray(config.map)) throw new Error('company_load_incomplete');
        const session = getCachedAuthSession();
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
        setCanEditStructure(canOpenAccountTab(session, 'business-structure') && config.can_edit === true);
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
        if (!active || !isCurrent()) return;
        setLoadError(readableError(error, feedback.load));
      })
      .finally(() => {
        if (active && isCurrent()) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const closeUnidadModal = (confirmed = false) => {
    if (!confirmed && (mutationRef.current || isMutationBusy)) return;
    setLoadError('');
    setShowUnidadModal(false);
    setEditingUnidad(null);
    setUnidadFormValues(DEFAULT_UNIDAD_FORM_VALUES);
    setUnidadInitialValues(DEFAULT_UNIDAD_FORM_VALUES);
  };

  const closeNegocioModal = (confirmed = false) => {
    if (!confirmed && (mutationRef.current || isMutationBusy)) return;
    setLoadError('');
    setShowNegocioModal(false);
    setEditingNegocio(null);
    setNegocioFormValues(DEFAULT_NEGOCIO_FORM_VALUES);
    setNegocioInitialValues(DEFAULT_NEGOCIO_FORM_VALUES);
  };

  const handleEstructuraTypeChange = (nextType: EstructuraType) => {
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

    setEstructuraType(nextType);

    if (nextType === 'simple') {
      closeUnidadModal();
      closeNegocioModal();
    }
  };

  const handleRequestDeleteUnidad = (unidadId: string) => {
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

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
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

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
    if (isMutationBusy || mutationRef.current) return;
    setLoadError('');
    setPendingDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!canEditStructure || !isCurrent() || !pendingDeleteTarget || isMutationBusy || mutationRef.current) {
      return;
    }

    const nextUnidades = pendingDeleteTarget.type === 'unit'
      ? normalizeCorporateOfficeUnits(unidades.filter((unidad) => unidad.id !== pendingDeleteTarget.unidadId))
      : unidades.map((unidad) => unidad.id === pendingDeleteTarget.unidadId
        ? {
            ...unidad,
            negocios: unidad.negocios.filter((negocio) => negocio.id !== pendingDeleteTarget.negocioId),
          }
        : unidad);

    setIsSaving(true);
    setLoadError('');
    try {
      const { response, normalizedUnidades } = await persistStructureConfig(estructuraType, nextUnidades);
      const savedUnidades = mapConfigUnitsToState(response.map);
      const committedUnidades = savedUnidades.length > 0 ? savedUnidades : normalizedUnidades;
      setUnidades(committedUnidades);
      syncSavedStructure(estructuraType, committedUnidades);
      setPendingDeleteTarget(null);
      failedAutoSaveKeyRef.current = '';
      showSuccessToast(structure.messages.saveSuccess);
    } catch (error) {
      if (isCurrent()) setLoadError(readableError(error));
    } finally {
      if (isCurrent()) setIsSaving(false);
    }
  };

  const handleSaveUnidad = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

    const emailValidation = validateOptionalEmail(unidadFormValues.email);
    if (!emailValidation.ok) {
      setLoadError(structure.validation.invalidEmail);
      return;
    }

    const coordinateValidation = buildCoordinateSaveValues(unidadFormValues);
    if (coordinateValidation.ok === false) {
      setLoadError(readableError(new Error(coordinateValidation.message)));
      return;
    }

    const manualLocationValidation = buildManualLocationSaveValues(unidadFormValues);
    if (manualLocationValidation.ok === false) {
      setLoadError(getCompanyPostalFeedback(currentLanguage.code, unidadFormValues.pais));
      return;
    }

    const newUnidad: Unidad = {
      id: editingUnidad?.id || crypto.randomUUID(),
      legacyUnitId: editingUnidad?.legacyUnitId,
      name: unidadFormValues.name.trim(),
      isCorporateOffice: editingUnidad?.isCorporateOffice ?? false,
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
      negocios: editingUnidad?.negocios.map((negocio, index) => isUnitHeadquartersBusiness(negocio, editingUnidad.name, index)
        ? { ...negocio, name: getUnitHeadquartersBusinessName(unidadFormValues.name.trim()) }
        : negocio) || [],
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
          : [...normalizeUnidadesForPersistence(estructuraType, unidades), newUnidad];

        const { response, normalizedUnidades } = await persistStructureConfig(estructuraType, nextUnidades);
        const savedUnidades = mapConfigUnitsToState(response.map);
        const committedUnidades = savedUnidades.length > 0 ? savedUnidades : normalizedUnidades;
        if (!isCurrent()) return;
        setUnidades(committedUnidades);
        syncSavedStructure(estructuraType, committedUnidades);
        closeUnidadModal(true);
      },
    });
  };

  const handleSaveNegocio = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current || !editingNegocio?.unidadId) {
      return;
    }

    const emailValidation = validateOptionalEmail(negocioFormValues.email);
    if (!emailValidation.ok) {
      setLoadError(structure.validation.invalidEmail);
      return;
    }

    const coordinateValidation = buildCoordinateSaveValues(negocioFormValues);
    if (coordinateValidation.ok === false) {
      setLoadError(readableError(new Error(coordinateValidation.message)));
      return;
    }

    const manualLocationValidation = buildManualLocationSaveValues(negocioFormValues);
    if (manualLocationValidation.ok === false) {
      setLoadError(getCompanyPostalFeedback(currentLanguage.code, negocioFormValues.pais));
      return;
    }

    const newNegocio: Negocio = {
      id: editingNegocio.id || crypto.randomUUID(),
      legacyBusinessId: editingNegocio.legacyBusinessId,
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
        if (!isCurrent()) return;
        setUnidades(committedUnidades);
        syncSavedStructure(estructuraType, committedUnidades);
        closeNegocioModal(true);
      },
    });
  };

  const handleEditUnidad = (unidad: Unidad) => {
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

    setLoadError('');
    setEditingUnidad(unidad);
    const nextFormValues = createUnidadFormValues(unidad);
    setUnidadFormValues(nextFormValues);
    setUnidadInitialValues(nextFormValues);
    setShowUnidadModal(true);
  };

  const handleCreateUnidad = () => {
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

    setLoadError('');
    setEditingUnidad(null);
    setUnidadFormValues(DEFAULT_UNIDAD_FORM_VALUES);
    setUnidadInitialValues(DEFAULT_UNIDAD_FORM_VALUES);
    setShowUnidadModal(true);
  };

  const handleEditNegocio = (negocio: Negocio, unidadId: string) => {
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

    setLoadError('');
    setEditingNegocio({ ...negocio, unidadId });
    const nextFormValues = createNegocioFormValues(negocio);
    setNegocioFormValues(nextFormValues);
    setNegocioInitialValues(nextFormValues);
    setShowNegocioModal(true);
  };

  const handleCreateNegocio = (unidadId: string) => {
    if (!canEditStructure || !isCurrent() || isMutationBusy || mutationRef.current) {
      return;
    }

    setLoadError('');
    setEditingNegocio({ unidadId });
    setNegocioFormValues(DEFAULT_NEGOCIO_FORM_VALUES);
    setNegocioInitialValues(DEFAULT_NEGOCIO_FORM_VALUES);
    setShowNegocioModal(true);
  };

  const handlePersistBusinessStructure = async (_options: { silent?: boolean } = {}) => {
    if (!canEditStructure || !isCurrent() || mutationRef.current || isMutationBusy) return;
    const snapshotToPersist = cloneSnapshot(currentSnapshotRef.current!);
    setLoadError('');
    try { await persistStructureConfig(estructuraType, unidades); }
    catch (error) {
      if (!isCurrent()) return;
      failedAutoSaveKeyRef.current = JSON.stringify(snapshotToPersist);
      const postal = validatePostalCodeForCountry(companyAddress.country, companyAddress.zip);
      setLoadError(error instanceof Error && error.message === 'company_postal_invalid' && 'message' in postal ? getCompanyPostalFeedback(currentLanguage.code, companyAddress.country) : readableError(error));
    }
  };

  useEffect(() => {
    if (
      isLoading
      || isMutationBusy
      || !canEditStructure
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
    if (coordinateValidation.ok === false || !companyName.trim() || [...companyName.trim()].length > 120 || 'message' in validatePostalCodeForCountry(companyAddress.country, companyAddress.zip)) return undefined;

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
    canEditStructure,
    companyLocation,
    currentSnapshot,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    logoBusy,
    coordinateBusy,
    loadingOverlay.isVisible,
    pendingDeleteTarget,
    showNegocioModal,
    showUnidadModal,
  ]);

  const handleDiscardChanges = () => {
    if (!baselineSnapshot || isMutationBusy || mutationRef.current) {
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

  useEffect(() => {
    if (!hasUnsavedChanges && !isUnidadModalDirty && !isNegocioModalDirty && !isMutationBusy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges, isUnidadModalDirty, isNegocioModalDirty, isMutationBusy]);

  const errorBanner = loadError ? <div ref={showUnidadModal || showNegocioModal ? modalErrorRef : errorRef} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">{loadError}</div> : null;
  const presentationUnidades = normalizeUnidadesForPersistence(estructuraType, unidades);

  return (
    <div className="space-y-4">
      <DashboardTitleBar
        emoji="🏢"
        subtitle={structure.subtitle}
        title={structure.title}
      />

      {isLoading ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300">
          {structure.messages.loading}
        </div>
      ) : null}

      {!showUnidadModal && !showNegocioModal && !pendingDeleteTarget ? errorBanner : null}
      {!isLoading && !baselineSnapshot ? <Button className="min-h-11" onClick={() => setLoadAttempt((value) => value + 1)}>{feedback.retry}</Button> : null}
      {!isLoading && baselineSnapshot && !canEditStructure ? <p className="text-sm text-slate-600 dark:text-slate-300">{feedback.permission}</p> : null}

      <OperationTypeSection
        estructuraType={estructuraType}
        structure={structure}
        isSimpleDisabled={isSimpleModeDisabled}
        disabled={isStructureReadOnly || isSaving || coordinateBusy}
        onEstructuraTypeChange={handleEstructuraTypeChange}
      />

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
        onLogoFileChange={(event) => { void readImageAsPreview(event, setCompanyLogo); }}
        onCoordinateBusyChange={setCoordinateBusy}
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
        disabled={isStructureReadOnly}
      />

      <UnitsSection
        estructuraType={estructuraType}
        unidades={presentationUnidades}
        structure={structure}
        onEditUnidad={handleEditUnidad}
        onDeleteUnidad={handleRequestDeleteUnidad}
        onEditNegocio={handleEditNegocio}
        onDeleteNegocio={handleRequestDeleteNegocio}
        onCreateNegocio={handleCreateNegocio}
        onCreateUnidad={handleCreateUnidad}
        disabled={isStructureReadOnly || isSaving || coordinateBusy}
      />

      {baselineSnapshot && canEditStructure ? (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className="text-sm text-slate-600 dark:text-slate-300">{isSaving ? structure.actions.saving : hasUnsavedChanges ? feedback.pending : feedback.saved}</p>
          {hasUnsavedChanges ? <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" disabled={isMutationBusy} onClick={handleDiscardChanges}>{feedback.discard}</Button>
            <Button className="min-h-11" disabled={isMutationBusy} onClick={() => { void handlePersistBusinessStructure(); }}>{loadError ? feedback.retry : structure.modal.save}</Button>
          </div> : null}
        </div>
      ) : null}

      {showUnidadModal && (
        <IndiceModalFrame
          busy={isMutationBusy}
          description={editingUnidad ? structure.modal.editUnitDescription : structure.modal.newUnitDescription}
          footer={(
            <Button
              type="submit"
              form="dashboard-business-unit-form"
              disabled={!isUnidadModalDirty || unidadFormValues.name.trim().length === 0 || isMutationBusy}
            >
              {structure.modal.save}
            </Button>
          )}
          footerLeading={(
            <Button
              type="button"
              variant="outline"
              onClick={() => closeUnidadModal()}
              disabled={isMutationBusy}
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
            >
              {structure.modal.cancel}
            </Button>
          )}
          footerSummary={unidadFormValues.name.trim() || structure.modal.newUnit}
          icon={<Building2 className="h-5 w-5" />}
          modalType="standard-form"
          onOpenChange={(open) => {
            if (!open) closeUnidadModal();
          }}
          open
          title={editingUnidad ? structure.modal.editUnit : structure.modal.newUnit}
          tone="blue"
        >
            <form
              id="dashboard-business-unit-form"
              onSubmit={handleSaveUnidad}
              className="space-y-5"
            >
              {errorBanner}
              <fieldset disabled={isMutationBusy} className="min-w-0 space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                        aria-label={structure.units.unitName}
                        maxLength={160}
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
                        aria-label={structure.fields.industry}
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                        aria-label={structure.fields.address}
                        maxLength={255}
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
                      disabled={loadingOverlay.isVisible || isSaving || logoBusy}
                      controlClassName={inputClassName}
                    />

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {structure.fields.location}
                        </h5>
                        <LocationCoordinateFields
                          values={unidadFormValues}
                          onChange={(updates) => setUnidadFormValues((current) => ({
                            ...current,
                            ...updates,
                          }))}
                          disabled={loadingOverlay.isVisible || isSaving || logoBusy}
                          onBusyChange={setCoordinateBusy}
                        />
                      </div>
                    </div>
                  </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                        aria-label={structure.fields.phone}
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
                        aria-label={structure.fields.email}
                        maxLength={254}
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
              </fieldset>

            </form>
        </IndiceModalFrame>
      )}

      {showNegocioModal && editingNegocio && (
        <IndiceModalFrame
          busy={isMutationBusy}
          description={editingNegocio.id ? structure.modal.editBusinessDescription : structure.modal.newBusinessDescription}
          footer={(
            <Button
              type="submit"
              form="dashboard-business-form"
              disabled={!isNegocioModalDirty || negocioFormValues.name.trim().length === 0 || isMutationBusy}
            >
              {editingNegocio.id ? structure.modal.save : structure.modal.createBusiness}
            </Button>
          )}
          footerLeading={(
            <Button
              type="button"
              variant="outline"
              onClick={() => closeNegocioModal()}
              disabled={isMutationBusy}
              className="h-11 rounded-xl border-white bg-white px-5 text-sm font-medium text-slate-600 hover:bg-white/90"
            >
              {structure.modal.cancel}
            </Button>
          )}
          footerSummary={negocioFormValues.name.trim() || structure.modal.newBusiness}
          icon={<Landmark className="h-5 w-5" />}
          modalType="standard-form"
          onOpenChange={(open) => {
            if (!open) closeNegocioModal();
          }}
          open
          title={editingNegocio.id ? structure.modal.editBusiness : structure.modal.newBusiness}
          tone="blue"
        >
            <form
              id="dashboard-business-form"
              onSubmit={handleSaveNegocio}
              className="space-y-5"
            >
              {errorBanner}
              <fieldset disabled={isMutationBusy} className="min-w-0 space-y-5">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                        aria-label={structure.units.businessName}
                        maxLength={160}
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
                        aria-label={structure.fields.industry}
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
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                        aria-label={structure.fields.address}
                        maxLength={255}
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
                      disabled={loadingOverlay.isVisible || isSaving || logoBusy}
                      controlClassName={inputClassName}
                    />

                      <div>
                        <h5 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {structure.fields.location}
                        </h5>
                        <LocationCoordinateFields
                          values={negocioFormValues}
                          onChange={(updates) => setNegocioFormValues((current) => ({
                            ...current,
                            ...updates,
                          }))}
                          disabled={loadingOverlay.isVisible || isSaving || logoBusy}
                          onBusyChange={setCoordinateBusy}
                        />
                      </div>
                    </div>
                  </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
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
                          aria-label={structure.fields.phone}
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
                          aria-label={structure.fields.email}
                          maxLength={254}
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
                          aria-label={structure.fields.manager}
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
                          aria-label={structure.fields.schedule}
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
              </fieldset>

            </form>
        </IndiceModalFrame>
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
        confirmDisabled={isMutationBusy}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      >{errorBanner}</ConfirmDeleteDialog>

    </div>
  );
}
