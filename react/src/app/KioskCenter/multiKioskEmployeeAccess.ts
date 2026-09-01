export type KioskTabScopeRequirement = {
  required_tab_scope?: string;
  required_tab_scopes?: string[];
};

export type KioskOrganizationScope = {
  unit_id?: number | null;
  business_id?: number | null;
};

export type KioskEmployeeAccessSubject = KioskOrganizationScope & {
  module_slugs: string[];
  tab_scopes?: string[];
};

export type KioskEmployeeAccessTarget = KioskOrganizationScope & KioskTabScopeRequirement & {
  module_slug: string;
};

const requiredScopeAliases = (kiosk: KioskTabScopeRequirement): string[] => {
  const declared = kiosk.required_tab_scopes?.length
    ? kiosk.required_tab_scopes
    : (kiosk.required_tab_scope ? [kiosk.required_tab_scope] : []);
  return [...new Set(declared.map(scope => scope.trim()).filter(Boolean))];
};

export const employeeHasRequiredKioskTabScopes = (
  kiosks: KioskTabScopeRequirement[],
  employeeScopes: string[] | undefined,
  unrestricted: boolean,
): boolean => {
  const requirements = kiosks.map(requiredScopeAliases);
  if (requirements.some(aliases => aliases.length === 0)) return false;
  if (unrestricted) return true;
  if (!Array.isArray(employeeScopes)) return false;
  const granted = new Set(employeeScopes);
  return requirements.every(aliases => aliases.some(alias => granted.has(alias)));
};

export const employeeMatchesKioskOrganizationScope = (
  employee: KioskOrganizationScope,
  kiosk: KioskOrganizationScope,
): boolean => {
  const corporateEmployee = employee.unit_id == null && employee.business_id == null;
  const unitAllowed = corporateEmployee || kiosk.unit_id == null || employee.unit_id === kiosk.unit_id;
  const businessAllowed = corporateEmployee
    || kiosk.business_id == null
    || employee.business_id == null
    || employee.business_id === kiosk.business_id;
  return unitAllowed && businessAllowed;
};

export const evaluateEmployeeKioskAccess = (
  employee: KioskEmployeeAccessSubject,
  kiosk: KioskEmployeeAccessTarget,
  unrestricted: boolean,
) => ({
  moduleAllowed: unrestricted || employee.module_slugs.includes(kiosk.module_slug),
  organizationAllowed: employeeMatchesKioskOrganizationScope(employee, kiosk),
  scopeAllowed: employeeHasRequiredKioskTabScopes(
    [kiosk], employee.tab_scopes, unrestricted),
});
