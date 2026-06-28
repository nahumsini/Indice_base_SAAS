import type { HumanResourcesTranslations } from './types';

export const enUS = {
  title: 'Human Resources',
  subtitle: 'Manage employees, attendance, payroll, and team operations.',
  back: 'Back',
  loading: {
    title: 'Loading HR tab',
    description: 'Downloading only the selected human resources workspace.',
  },
  access: {
    loadingTitle: 'Loading HR access',
    loadingDescription: 'Checking which workspaces are available.',
    empty: 'No Human Resources tabs are available for this user.',
  },
  tabError: {
    eyebrow: 'Tab unavailable',
    title: 'This Human Resources tab could not load',
    description: 'The app could not download this workspace. Refresh the tab to request the module again.',
    reload: 'Refresh tab',
  },
  tabs: {
    collaborators: 'Employees',
    attendance: 'Attendance',
    control: 'Control',
    payroll: 'Payroll',
    announcements: 'Announcements',
    assets: 'Assets',
    records: 'Records',
    permissions: 'Permissions',
    incentives: 'Incentives',
    kpis: 'KPIs',
  },
} satisfies HumanResourcesTranslations;
