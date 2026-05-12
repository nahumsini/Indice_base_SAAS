import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { ProjectsLocale, ProjectsTranslations } from './types';

export const projectsFallbackLocale: ProjectsLocale = 'en-CA';

export const projectsTranslations: Record<ProjectsLocale, ProjectsTranslations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'en-US': enUS,
  'en-CA': enCA,
  'fr-CA': frCA,
  'pt-BR': ptBR,
  'ko-CA': koCA,
  'zh-CA': zhCA,
};

export const defaultProjectsTranslations = esMX;

export function resolveProjectsLocale(locale?: string | null): ProjectsLocale {
  if (locale && Object.prototype.hasOwnProperty.call(projectsTranslations, locale)) {
    return locale as ProjectsLocale;
  }

  return projectsFallbackLocale;
}

export function getProjectsTranslations(locale?: string | null) {
  return projectsTranslations[resolveProjectsLocale(locale)];
}

export function useProjectsTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(() => getProjectsTranslations(currentLanguage.code), [currentLanguage.code]);
}

export type { ProjectsColumnCopy, ProjectsLocale, ProjectsTranslations } from './types';
