import { useCallback, useEffect, useState } from 'react';
import type {
  AttendanceControlLocation,
  AttendanceControlTemplate,
} from '../../../../api/humanResources';
import {
  defaultScheduleEndTime,
  defaultScheduleStartTime,
  defaultScheduleTemplateName,
} from '../constants/scheduleConstants';
import type {
  HorarioDiaDraft,
  ScheduleBuilderStep,
  ScheduleLocationRule,
  ScheduleMode,
} from '../types/scheduleTypes';
import {
  draftFromTemplate,
  emptyScheduleDays,
} from '../utils/schedulePayloads';

interface UseScheduleDraftStateInput {
  availableTemplates: AttendanceControlTemplate[];
  exactLocationOptions: AttendanceControlLocation[];
  isOpen: boolean;
  selectedTemplateId?: number | null;
  templates: AttendanceControlTemplate[];
  onErrorClear: () => void;
  onScrollReset: () => void;
}

export function useScheduleDraftState({
  availableTemplates,
  exactLocationOptions,
  isOpen,
  selectedTemplateId,
  templates,
  onErrorClear,
  onScrollReset,
}: UseScheduleDraftStateInput) {
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedScheduleTemplateId, setSelectedScheduleTemplateId] = useState<number | null>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('strict');
  const [toleranciaIngreso, setToleranciaIngreso] = useState(10);
  const [locationRule, setLocationRule] = useState<ScheduleLocationRule>('business');
  const [noPermitirFueraUbicacion, setNoPermitirFueraUbicacion] = useState(false);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [horarios, setHorarios] = useState<HorarioDiaDraft[]>(emptyScheduleDays());
  const [builderStep, setBuilderStep] = useState<ScheduleBuilderStep>('setup');

  const applyTemplateDraft = useCallback((template: AttendanceControlTemplate | null) => {
    const templateDraft = draftFromTemplate(template);
    setSelectedTemplateName(template?.name ?? defaultScheduleTemplateName);
    setSelectedScheduleTemplateId(template?.id ?? null);
    setScheduleMode(templateDraft.scheduleMode);
    setToleranciaIngreso(templateDraft.toleranciaIngreso);
    setLocationRule(templateDraft.locationRule);
    setNoPermitirFueraUbicacion(templateDraft.noPermitirFueraUbicacion);
    setUbicacionSeleccionada(templateDraft.ubicacionSeleccionada);
    setHorarios(templateDraft.horarios);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
    applyTemplateDraft(initialTemplate);
    setBuilderStep('setup');
  }, [applyTemplateDraft, isOpen, selectedTemplateId, templates]);

  useEffect(() => {
    if (!noPermitirFueraUbicacion || !ubicacionSeleccionada) {
      return;
    }

    const selectedLocationStillAvailable = exactLocationOptions.some((location) => String(location.id) === ubicacionSeleccionada);
    if (!selectedLocationStillAvailable) {
      setUbicacionSeleccionada('');
    }
  }, [exactLocationOptions, noPermitirFueraUbicacion, ubicacionSeleccionada]);

  const handleLocationRuleChange = useCallback((value: string) => {
    const nextRule = (value === 'temporary' || value === 'open' || value === 'business')
      ? value
      : 'business';
    const useExactLocation = nextRule === 'temporary';
    setLocationRule(nextRule);
    setNoPermitirFueraUbicacion(useExactLocation);
    if (nextRule === 'open') {
      setScheduleMode('open');
    } else if (scheduleMode === 'open') {
      setScheduleMode('strict');
    }
    if (!useExactLocation) {
      setUbicacionSeleccionada('');
    }
  }, [scheduleMode]);

  const handleScheduleModeChange = useCallback((value: ScheduleMode) => {
    setScheduleMode(value);
    if (value === 'open') {
      setLocationRule('open');
      setNoPermitirFueraUbicacion(false);
      setUbicacionSeleccionada('');
      return;
    }

    if (locationRule === 'open') {
      setLocationRule('business');
      setNoPermitirFueraUbicacion(false);
      setUbicacionSeleccionada('');
    }
  }, [locationRule]);

  const updateHorario = useCallback((index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => {
    setHorarios((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, [field]: value } : item));
  }, []);

  const updateWorkingDay = useCallback((index: number, isWorkingDay: boolean) => {
    setHorarios((current) =>
      current.map((item, currentIndex) => {
        if (currentIndex !== index) {
          return item;
        }

        return {
          ...item,
          isRestDay: !isWorkingDay,
          entrada: item.entrada || defaultScheduleStartTime,
          salida: item.salida || defaultScheduleEndTime,
        };
      }),
    );
  }, []);

  const copyMondayToAllDays = useCallback(() => {
    setHorarios((current) => {
      const monday = current.find((item) => item.dayOfWeek === 1) ?? current[0];
      if (!monday) {
        return current;
      }

      return current.map((item) => (
        item.dayOfWeek === monday.dayOfWeek
          ? item
          : {
            ...item,
            entrada: monday.entrada,
            salida: monday.salida,
            comida: monday.comida,
            descanso: monday.descanso,
            isRestDay: monday.isRestDay,
          }
      ));
    });
  }, []);

  const resetSchedule = useCallback(() => {
    applyTemplateDraft(null);
    onErrorClear();
    onScrollReset();
  }, [applyTemplateDraft, onErrorClear, onScrollReset]);

  const handleScheduleTemplateChange = useCallback((value: string) => {
    if (!value) {
      resetSchedule();
      return;
    }

    const template = availableTemplates.find((option) => String(option.id) === value) ?? null;
    applyTemplateDraft(template);
    onErrorClear();
    onScrollReset();
  }, [applyTemplateDraft, availableTemplates, onErrorClear, onScrollReset, resetSchedule]);

  return {
    builderStep,
    copyMondayToAllDays,
    handleLocationRuleChange,
    handleScheduleModeChange,
    handleScheduleTemplateChange,
    horarios,
    isOpenSchedule: scheduleMode === 'open',
    locationRule,
    noPermitirFueraUbicacion,
    resetSchedule,
    scheduleMode,
    selectedScheduleTemplateId,
    selectedTemplateName,
    setBuilderStep,
    setSelectedScheduleTemplateId,
    setSelectedTemplateName,
    setToleranciaIngreso,
    setUbicacionSeleccionada,
    toleranciaIngreso,
    ubicacionSeleccionada,
    updateHorario,
    updateWorkingDay,
  };
}
