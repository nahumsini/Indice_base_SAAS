import { useQuerySection } from '../../../hooks/useQuerySection';
export const integrationSections = ['connections', 'guide', 'ideas'] as const;
export type WorkspaceSection = typeof integrationSections[number];
export const useIntegrationSection = () => useQuerySection('ai-section', integrationSections, 'guide');
