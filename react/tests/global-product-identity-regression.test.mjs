import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const readSource = (path) => readFileSync(resolve(root, path), 'utf8');

const themeSource = readSource('src/styles/theme.css');
const frontendOperatingSystemSource = readSource('../docs/indice-frontend-operating-system-v2.md');
const moduleColorsSource = readSource('src/app/styles/moduleColors.ts');
const headerSource = readSource('src/app/components/Header.tsx');
const kpiCardSource = readSource('src/app/components/KPICard.tsx');
const kpiConfigurationSource = readSource('src/app/components/KPIConfiguration.tsx');
const aiOAuthSource = readSource('src/app/Auth/AiOAuthAuthorizePage.tsx');
const inviteAcceptSource = readSource('src/app/Auth/InviteAcceptPage.tsx');
const publicDemoSource = readSource('src/app/Auth/PublicDemoPage.tsx');
const resetPasswordSource = readSource('src/app/Auth/ResetPasswordPage.tsx');
const signupCompleteSource = readSource('src/app/Auth/SignupCompletePage.tsx');
const signupSource = readSource('src/app/Auth/SignupPage.tsx');

const globalShellPaths = [
  'src/app/components/Header.tsx',
  'src/app/components/NotificationCenter.tsx',
  'src/app/components/notifications/NotificationMenu.tsx',
  'src/app/components/notifications/NotificationFilterBar.tsx',
  'src/app/components/notifications/NotificationItemCard.tsx',
  'src/app/components/notifications/NotificationSettingsView.tsx',
  'src/app/components/notifications/NotificationSummaryStrip.tsx',
  'src/app/BasicModules/shared/PreferredCurrencyControl.tsx',
];

const legacyGlobalPalette = /#(?:59C3A5|3AAE90|177D66|126553|E7F3F2|B9E5D9|257B68|1E6557|8FE0CA)/i;
const hardcodedProductPalette = /#(?:2563EB|1D4ED8|1E40AF|143675|EFF6FF|DBEAFE|BFDBFE|93C5FD|F8FAFC)/i;

const sharedBlueTonePaths = [
  'src/app/components/indice-modal/IndiceModalFrame.tsx',
  'src/app/components/indice-modal/IndiceModalFooter.tsx',
  'src/app/components/indice-modal/IndiceModalWizardStepper.tsx',
  'src/app/components/frontend-os/IndiceFilterBar.tsx',
  'src/app/components/frontend-os/IndiceFilterDisclosure.tsx',
  'src/app/components/ui/horizontal-scroll-controls.tsx',
];

test('Indice defines blue product tokens without deleting the aqua module identity', () => {
  assert.match(themeSource, /--indice-brand-primary:\s*#2563EB/);
  assert.match(themeSource, /--indice-brand-primary-hover:\s*#1D4ED8/);
  assert.match(themeSource, /--indice-brand-primary-pressed:\s*#1E40AF/);
  assert.match(themeSource, /--indice-brand-shell:\s*var\(--indice-brand-primary\)/);
  assert.match(themeSource, /--indice-brand-shell-foreground:\s*#F8FAFC/);
  assert.match(themeSource, /--indice-brand-soft:\s*#EFF6FF/);
  assert.match(themeSource, /--indice-brand-soft-strong:\s*#DBEAFE/);
  assert.match(themeSource, /--indice-brand-border:\s*#BFDBFE/);
  assert.match(themeSource, /--indice-brand-aqua:\s*#59C3A5/);
  assert.match(frontendOperatingSystemSource, /Indice uses blue as its primary product signature/);
  assert.match(frontendOperatingSystemSource, /stable identity color of Human Resources/);
});

test('global dashboard chrome consumes brand tokens instead of hardcoded palettes', () => {
  for (const path of globalShellPaths) {
    const source = readSource(path);
    assert.doesNotMatch(source, legacyGlobalPalette, `${path} still uses the legacy global aqua palette`);
    assert.doesNotMatch(source, hardcodedProductPalette, `${path} hardcodes the product palette`);
    assert.match(source, /var\(--indice-brand-/, `${path} must consume the product identity tokens`);
  }
});

test('the authenticated top bar uses the solid blue product surface and white foreground', () => {
  assert.match(headerSource, /<header className="[^"]*bg-\[var\(--indice-brand-shell\)\][^"]*text-\[var\(--indice-brand-shell-foreground\)\]/);
  assert.match(headerSource, /<h1 className="[^"]*text-\[var\(--indice-brand-shell-foreground\)\]/);
  assert.match(headerSource, /HEADER_ACTION_BUTTON_CLASSES = '[^']*text-slate-50\/85/);
  assert.doesNotMatch(headerSource, hardcodedProductPalette);
  assert.match(headerSource, /Sunrise className="[^"]*text-orange-300/);
  assert.match(headerSource, /Sun className="[^"]*text-amber-300/);
  assert.match(headerSource, /Moon className="[^"]*text-violet-200/);
});

test('module-owned colors remain stable while system KPI controls use blue', () => {
  assert.match(moduleColorsSource, /aqua:\s*\{[\s\S]*?primary:\s*INDICE_BRAND_COLORS\.aqua/);
  assert.match(moduleColorsSource, /green:\s*\{[\s\S]*?primary:\s*'#147514'/);
  assert.match(moduleColorsSource, /coral:\s*\{[\s\S]*?primary:\s*INDICE_BRAND_COLORS\.coral/);
  assert.match(moduleColorsSource, /yellow:\s*\{[\s\S]*?primary:\s*INDICE_BRAND_COLORS\.yellow/);
  assert.match(kpiCardSource, /humanResources:[^\n]+#59C3A5/);
  assert.match(kpiCardSource, /system:[^\n]+var\(--indice-brand-primary\)/);
  assert.match(kpiConfigurationSource, /aqua:\s*\{[^\n]+#59C3A5/);

  const configurationChrome = kpiConfigurationSource.slice(
    kpiConfigurationSource.indexOf('{/* Configuration trigger */}'),
  );
  assert.doesNotMatch(configurationChrome, legacyGlobalPalette);
  assert.doesNotMatch(configurationChrome, hardcodedProductPalette);
  assert.match(configurationChrome, /bg-\[var\(--indice-brand-primary\)\]/);
});

test('shared controls keep the Indice blue fallback in light and dark mode', () => {
  const darkThemeSource = themeSource.slice(themeSource.indexOf('.dark {'));
  assert.match(darkThemeSource, /--indice-brand-soft:\s*#172554/);
  assert.match(darkThemeSource, /--indice-brand-text:\s*#BFDBFE/);
  assert.match(darkThemeSource, /--primary:\s*var\(--indice-brand-action\)/);
  assert.match(darkThemeSource, /--primary-foreground:\s*var\(--indice-brand-shell-foreground\)/);
  assert.match(darkThemeSource, /--ring:\s*var\(--indice-brand-primary\)/);
  assert.match(darkThemeSource, /--sidebar-primary:\s*var\(--indice-brand-action\)/);

  for (const path of sharedBlueTonePaths) {
    const source = readSource(path);
    assert.doesNotMatch(source, hardcodedProductPalette, `${path} hardcodes the shared blue tone`);
    assert.match(source, /var\(--indice-brand-/, `${path} must consume the product identity tokens`);
  }
});

test('institutional entry surfaces use blue tokens for actions and selection', () => {
  assert.match(aiOAuthSource, /bg-\[var\(--indice-brand-action\)\]/);
  assert.doesNotMatch(aiOAuthSource, /(?:bg|text|border)-blue-(?:100|600|700)/);

  assert.match(inviteAcceptSource, /focus-visible:ring-\[var\(--indice-brand-action\)\]/);
  assert.match(inviteAcceptSource, /bg-\[var\(--indice-brand-soft\)\]/);

  assert.match(publicDemoSource, /bg-\[var\(--indice-brand-shell\)\]/);
  assert.match(publicDemoSource, /ring-\[var\(--indice-brand-action\)\]\/15/);
  assert.doesNotMatch(publicDemoSource, /(?:bg|text|border|ring)-blue-(?:50|300|500|950)/);

  assert.match(resetPasswordSource, /bg-\[var\(--indice-brand-shell\)\]/);
  assert.doesNotMatch(resetPasswordSource, /#(?:143675|0f2855)/i);
  assert.match(signupCompleteSource, /ShieldCheck className="[^"]*text-\[var\(--indice-brand-action\)\]/);
  assert.doesNotMatch(signupSource, /text-blue-600 transition hover:text-blue-700/);
});
