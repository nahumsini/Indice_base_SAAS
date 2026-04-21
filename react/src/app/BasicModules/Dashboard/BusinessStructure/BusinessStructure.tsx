import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SaveChangesBar } from '../../../components/SaveChangesBar';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLanguage } from '../../../shared/context';
import { configCenterApi } from '../../../api/configCenter';
import { validateOptionalEmail } from '../../../shared/validation/email';
import { inputClassName } from './constants';
import { BusinessIdentitySection } from './components/BusinessIdentitySection';
import { OperationTypeSection } from './components/OperationTypeSection';
import { UnitsSection } from './components/UnitsSection';
import type { EditingNegocio, EstructuraType, Negocio, Unidad } from './types';

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
  industry: string;
  description: string;
};

type UnidadFormValues = {
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

type NegocioFormValues = {
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

const createDefaultUnidades = (): Unidad[] => [
  { id: '1', name: 'Principal', negocios: [] },
];

const DEFAULT_UNIDAD_FORM_VALUES: UnidadFormValues = {
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
  industry,
  description,
}: BusinessStructureSnapshot): BusinessStructureSnapshot => ({
  estructuraType,
  unidades,
  companyName,
  industry,
  description,
});

const createUnidadFormValues = (unidad?: Unidad | null): UnidadFormValues => ({
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
  || unidad.negocios.length > 0
);

const hasMeaningfulMultiStructureData = (unidades: Unidad[]) => {
  if (unidades.length > 1) {
    return true;
  }

  if (unidades.length === 0) {
    return false;
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
    && firstUnidad.negocios.length === 0;

  if (isDefaultPlaceholderUnit) {
    return false;
  }

  return unidadHasMultiData(firstUnidad);
};

const buildConfigMap = (estructuraType: EstructuraType, unidades: Unidad[]) => (
  estructuraType === 'multi'
    ? unidades.map((unidad) => ({
        name: unidad.name,
        legacy_unit_id: unidad.legacyUnitId,
        logo: unidad.logo,
        industria: unidad.industria,
        direccion: unidad.direccion,
        ciudad: unidad.ciudad,
        estado: unidad.estado,
        pais: unidad.pais,
        cp: unidad.cp,
        telefono: unidad.telefono,
        email: unidad.email,
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
        })),
      }))
    : []
);

export default function BusinessStructure() {
  const { t } = useLanguage();
  const structure = t.panelInicial.structure;
  const [estructuraType, setEstructuraType] = useState<EstructuraType>('simple');
  const [unidades, setUnidades] = useState<Unidad[]>(createDefaultUnidades);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
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
      industry,
      description,
    }),
    [companyName, description, estructuraType, industry, unidades],
  );

  const hasUnsavedChanges = useMemo(
    () => baselineSnapshot !== null
      && JSON.stringify(currentSnapshot) !== JSON.stringify(baselineSnapshot),
    [baselineSnapshot, currentSnapshot],
  );
  const isSimpleModeDisabled = useMemo(
    () => hasMeaningfulMultiStructureData(unidades),
    [unidades],
  );
  const isUnidadModalDirty = useMemo(
    () => !arePlainObjectsEqual(unidadFormValues, unidadInitialValues),
    [unidadFormValues, unidadInitialValues],
  );
  const isNegocioModalDirty = useMemo(
    () => !arePlainObjectsEqual(negocioFormValues, negocioInitialValues),
    [negocioFormValues, negocioInitialValues],
  );

  const syncSavedStructure = (nextEstructuraType: EstructuraType, nextUnidades: Unidad[]) => {
    setBaselineSnapshot((previousSnapshot) =>
      cloneSnapshot(
        createBusinessStructureSnapshot({
          estructuraType: nextEstructuraType,
          unidades: nextUnidades,
          companyName: previousSnapshot?.companyName ?? currentSnapshot.companyName,
          industry: previousSnapshot?.industry ?? currentSnapshot.industry,
          description: previousSnapshot?.description ?? currentSnapshot.description,
        }),
      ),
    );
  };

  const persistStructureConfig = async (nextEstructuraType: EstructuraType, nextUnidades: Unidad[]) => {
    await configCenterApi.saveConfig({
      estructura: nextEstructuraType,
      map: buildConfigMap(nextEstructuraType, nextUnidades),
    });
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

    Promise.allSettled([configCenterApi.getEmpresa(), configCenterApi.getConfig()])
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
        const loadedUnidades = Array.isArray(resolvedMap) && resolvedMap.length > 0
          ? resolvedMap.map((unidad, unidadIndex) => ({
              id: `unit-${unidadIndex}-${unidad.name}`,
              name: unidad.name,
              legacyUnitId: unidad.legacy_unit_id,
              logo: unidad.logo,
              industria: unidad.industria,
              direccion: unidad.direccion,
              ciudad: unidad.ciudad,
              estado: unidad.estado,
              pais: unidad.pais,
              cp: unidad.cp,
              telefono: unidad.telefono,
              email: unidad.email,
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
              })),
            }))
          : createDefaultUnidades();
        const loadedCompanyName = empresa?.nombre_empresa ?? '';
        const loadedIndustry = (empresa?.industria as string) ?? '';
        const loadedDescription = (empresa?.descripcion as string) ?? '';

        setEstructuraType(resolvedStructure === 'multi' ? 'multi' : 'simple');
        setCompanyName(loadedCompanyName);
        setIndustry(loadedIndustry);
        setDescription(loadedDescription);
        setUnidades(loadedUnidades);
        setBaselineSnapshot(
          cloneSnapshot(
            createBusinessStructureSnapshot({
              estructuraType: resolvedStructure === 'multi' ? 'multi' : 'simple',
              unidades: loadedUnidades,
              companyName: loadedCompanyName,
              industry: loadedIndustry,
              description: loadedDescription,
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

  const applyDeleteUnidad = (unidadId: string) => {
    setUnidades((prevUnidades) => prevUnidades.filter((unidad) => unidad.id !== unidadId));
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

    const newUnidad: Unidad = {
      id: editingUnidad?.id || String(Date.now()),
      name: unidadFormValues.name.trim(),
      logo: unidadFormValues.logo,
      industria: unidadFormValues.industria,
      direccion: unidadFormValues.direccion,
      ciudad: unidadFormValues.ciudad,
      estado: unidadFormValues.estado,
      pais: unidadFormValues.pais,
      cp: unidadFormValues.cp,
      telefono: unidadFormValues.telefono,
      email: emailValidation.normalized,
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

        await persistStructureConfig(estructuraType, nextUnidades);
        setUnidades(nextUnidades);
        syncSavedStructure(estructuraType, nextUnidades);
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

    const newNegocio: Negocio = {
      id: editingNegocio.id || String(Date.now()),
      name: negocioFormValues.name.trim(),
      logo: negocioFormValues.logo,
      industria: negocioFormValues.industria,
      direccion: negocioFormValues.direccion,
      ciudad: negocioFormValues.ciudad,
      estado: negocioFormValues.estado,
      pais: negocioFormValues.pais,
      cp: negocioFormValues.cp,
      telefono: negocioFormValues.telefono,
      email: emailValidation.normalized,
      gerente: negocioFormValues.gerente,
      horario: negocioFormValues.horario,
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

        await persistStructureConfig(estructuraType, nextUnidades);
        setUnidades(nextUnidades);
        syncSavedStructure(estructuraType, nextUnidades);
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

  const handlePersistBusinessStructure = async () => {
    setIsSaving(true);
    setLoadError('');

    try {
      await runStructureFeedbackTask({
        title: structure.messages.saveOverlay,
        description: structure.messages.saveOverlayDescription,
        successMessage: structure.messages.saveSuccess,
        minimumDurationMs: 2500,
        task: async () => {
          await persistStructureConfig(estructuraType, unidades);

          await configCenterApi.saveEmpresa({
            nombre_empresa: companyName,
            industria: industry,
            descripcion: description,
          });

          setBaselineSnapshot(cloneSnapshot(currentSnapshot));
        },
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : structure.messages.saveError);
    } finally {
      setIsSaving(false);
    }
  };

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
    setIndustry(baselineSnapshot.industry);
    setDescription(baselineSnapshot.description);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 p-4 dark:border-purple-700/30 sm:p-6">
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
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700 dark:border-purple-700/30 dark:bg-purple-900/20 dark:text-purple-300">
          {structure.messages.loading}
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          {loadError}
        </div>
      ) : null}

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

      <BusinessIdentitySection
        estructuraType={estructuraType}
        structure={structure}
        companyName={companyName}
        industry={industry}
        description={description}
        onCompanyNameChange={setCompanyName}
        onIndustryChange={setIndustry}
        onDescriptionChange={setDescription}
      />

      {showUnidadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 bg-purple-600 p-4 dark:bg-purple-700 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {editingUnidad
                    ? structure.modal.editUnit
                    : structure.modal.newUnit}
                </h3>
                <p className="text-sm text-purple-100 mt-1">
                  {editingUnidad
                    ? structure.modal.editUnitDescription
                    : structure.modal.newUnitDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUnidadModal}
                className="p-2 hover:bg-purple-700 dark:hover:bg-purple-800 rounded-lg transition-colors"
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
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 file:cursor-pointer"
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
                        {structure.options.unitIndustries.map((option) => (
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
                    {structure.fields.location}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      ({structure.fields.optional})
                    </span>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.city}
                        </label>
                        <input
                          type="text"
                          name="ciudad"
                          value={unidadFormValues.ciudad}
                          onChange={(event) => setUnidadFormValues((current) => ({
                            ...current,
                            ciudad: event.target.value,
                          }))}
                          placeholder={structure.placeholders.city}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.state}
                        </label>
                        <input
                          type="text"
                          name="estado"
                          value={unidadFormValues.estado}
                          onChange={(event) => setUnidadFormValues((current) => ({
                            ...current,
                            estado: event.target.value,
                          }))}
                          placeholder={structure.placeholders.state}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.postalCode}
                        </label>
                        <input
                          type="text"
                          name="cp"
                          value={unidadFormValues.cp}
                          onChange={(event) => setUnidadFormValues((current) => ({
                            ...current,
                            cp: event.target.value,
                          }))}
                          placeholder={structure.placeholders.postalCode}
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.country}
                      </label>
                      <select
                        name="pais"
                        value={unidadFormValues.pais}
                        onChange={(event) => setUnidadFormValues((current) => ({
                          ...current,
                          pais: event.target.value,
                        }))}
                        className={`${inputClassName} appearance-none cursor-pointer`}
                      >
                        <option value="">{structure.fields.selectCountry}</option>
                        {structure.options.countries.map((option) => (
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
                  className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
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
            <div className="flex items-start justify-between gap-4 bg-purple-600 p-4 dark:bg-purple-700 sm:p-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {editingNegocio.id
                    ? structure.modal.editBusiness
                    : structure.modal.newBusiness}
                </h3>
                <p className="text-sm text-purple-100 mt-1">
                  {editingNegocio.id
                    ? structure.modal.editBusinessDescription
                    : structure.modal.newBusinessDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNegocioModal}
                className="p-2 hover:bg-purple-700 dark:hover:bg-purple-800 rounded-lg transition-colors"
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
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 dark:file:bg-purple-900/30 dark:file:text-purple-400 hover:file:bg-purple-100 dark:hover:file:bg-purple-900/50 file:cursor-pointer"
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
                        {structure.options.unitIndustries.map((option) => (
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
                    {structure.fields.location}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      ({structure.fields.optional})
                    </span>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.city}
                        </label>
                        <input
                          type="text"
                          name="ciudad"
                          value={negocioFormValues.ciudad}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            ciudad: event.target.value,
                          }))}
                          placeholder={structure.placeholders.city}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.state}
                        </label>
                        <input
                          type="text"
                          name="estado"
                          value={negocioFormValues.estado}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            estado: event.target.value,
                          }))}
                          placeholder={structure.placeholders.state}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {structure.fields.postalCode}
                        </label>
                        <input
                          type="text"
                          name="cp"
                          value={negocioFormValues.cp}
                          onChange={(event) => setNegocioFormValues((current) => ({
                            ...current,
                            cp: event.target.value,
                          }))}
                          placeholder={structure.placeholders.postalCode}
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {structure.fields.country}
                      </label>
                      <select
                        name="pais"
                        value={negocioFormValues.pais}
                        onChange={(event) => setNegocioFormValues((current) => ({
                          ...current,
                          pais: event.target.value,
                        }))}
                        className={`${inputClassName} appearance-none cursor-pointer`}
                      >
                        <option value="">{structure.fields.selectCountry}</option>
                        {structure.options.countries.map((option) => (
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
                  className="w-full bg-purple-600 text-white hover:bg-purple-700 sm:w-auto"
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

      <SaveChangesBar
        isVisible={!isLoading && hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handlePersistBusinessStructure}
        onDiscard={handleDiscardChanges}
        saveLabel={structure.actions.save}
        savingLabel={structure.actions.saving}
        discardLabel={t.panelInicial.profile.actions.discard}
      />
    </div>
  );
}
