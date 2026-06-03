import { useCallback, useMemo, useState } from 'react';
import type { AttendanceControlTemplate } from '../../../../api/humanResources';

interface UseScheduleTemplateCollectionInput {
  templates: AttendanceControlTemplate[];
}

export function useScheduleTemplateCollection({
  templates,
}: UseScheduleTemplateCollectionInput) {
  const [createdTemplates, setCreatedTemplates] = useState<AttendanceControlTemplate[]>([]);
  const [deletedTemplateIds, setDeletedTemplateIds] = useState<number[]>([]);

  const availableTemplates = useMemo(() => {
    const deletedTemplateIdSet = new Set(deletedTemplateIds);
    const templateMap = new Map<number, AttendanceControlTemplate>();
    templates.forEach((template) => {
      if (!deletedTemplateIdSet.has(template.id)) {
        templateMap.set(template.id, template);
      }
    });
    createdTemplates.forEach((template) => {
      if (!deletedTemplateIdSet.has(template.id)) {
        templateMap.set(template.id, template);
      }
    });
    return Array.from(templateMap.values());
  }, [createdTemplates, deletedTemplateIds, templates]);

  const addCreatedTemplate = useCallback((template: AttendanceControlTemplate) => {
    setCreatedTemplates((current) => [...current.filter((item) => item.id !== template.id), template]);
  }, []);

  const removeCreatedTemplate = useCallback((templateId: number) => {
    setCreatedTemplates((current) => current.filter((item) => item.id !== templateId));
  }, []);

  const markTemplateDeleted = useCallback((templateId: number) => {
    setDeletedTemplateIds((current) => Array.from(new Set([...current, templateId])));
  }, []);

  return {
    addCreatedTemplate,
    availableTemplates,
    markTemplateDeleted,
    removeCreatedTemplate,
  };
}
