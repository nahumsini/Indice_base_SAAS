import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const page = read('src/app/DistributorPortal/DistributorPortalPage.tsx');
const contracts = read('src/app/DistributorPortal/contracts-access/ContractsAccessPage.tsx');
const table = read('src/app/DistributorPortal/contracts-access/components/ClientPortfolioTable.tsx');
const api = read('src/app/DistributorPortal/contracts-access/services/distributorPortalApi.ts');
const consultingPage = read('src/app/DistributorPortal/DistributorConsultingPage.tsx');
const consultingShared = read('src/app/PlatformAdmin/ConsultingAdminTab.tsx');
const sessionModal = read('src/app/PlatformAdmin/ConsultingSessions/SessionCreateModal.tsx');
const routes = read('src/app/routes.tsx');
const header = read('src/app/components/Header.tsx');
const publicDemoPage = read('src/app/Auth/PublicDemoPage.tsx');
const systemTickets = read('src/app/SystemTickets/SystemTicketsWorkspace.tsx');
const systemTicketsApi = read('src/app/SystemTickets/systemTicketsApi.ts');

test('el distribuidor entra desde su menu a contratos y accesos', () => {
  assert.match(header, /isDistributorAccount/);
  assert.match(header, /navigate\('\/distributor-portal'\)/);
  assert.match(routes, /path: '\/distributor-portal'/);
  assert.match(routes, /requireDistributorPortalSession/);
  assert.match(page, /copy\.tabs\.contractsAccess/);
});

test('tickets de sistema permite reportar y seguir solo los folios del distribuidor', () => {
  assert.match(page, /ticketCopy\.tab/);
  assert.match(page, /portal="distributor"/);
  assert.match(systemTickets, /SystemTicketsWorkspace/);
  assert.match(systemTickets, /systemTicketsApi\.create/);
  assert.match(systemTickets, /copy\.active/);
  assert.match(systemTicketsApi, /endpoints\.distributorPortal\.systemTickets/);
  assert.doesNotMatch(systemTickets, /localStorage/);
});

test('la cartera usa un API dedicado con los mismos flujos operativos de Root', () => {
  assert.match(api, /distributorPortal\.contractsAccess/);
  assert.match(api, /distributorPortal\.companies/);
  assert.match(api, /createCompanyAccount/);
  assert.match(api, /updateTrialProducts/);
  assert.match(api, /inviteCompanyUser/);
  assert.match(contracts, /useContractsAccess/);
  assert.match(contracts, /PortfolioMetrics/);
  assert.match(contracts, /IndiceFilterSearch/);
  assert.match(contracts, /IndiceFilterSelect/);
  assert.match(contracts, /AccountCreationModal/);
  assert.match(contracts, /CompanyAccountDrawer/);
  assert.match(contracts, /lockedAccountType="SUPER_ADMIN"/);
});

test('la tabla explica contrato acceso usuarios y proximo evento', () => {
  assert.match(table, /client\.module_names/);
  assert.match(table, /client\.active_members/);
  assert.match(table, /client\.seat_capacity/);
  assert.match(table, /client\.next_event_at/);
  assert.match(table, /CommercialStageBadge/);
  assert.match(table, /copy\.actions\.manage/);
});

test('la pestaña conserva traducciones locales en los ocho idiomas soportados', () => {
  for (const locale of ['en-CA', 'en-US', 'fr-CA', 'es-MX', 'es-CO', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.equal(existsSync(resolve(root, `src/app/DistributorPortal/contracts-access/translations/${locale}.ts`)), true);
  }
});

test('consultorias reutiliza el flujo Root y lo limita a la cartera del distribuidor', () => {
  assert.match(page, /copy\.tabs\.consulting/);
  assert.match(page, /DistributorConsultingPage/);
  assert.match(consultingPage, /ConsultingAdminTab/);
  assert.match(consultingPage, /operations=\{distributorPortalApi\}/);
  assert.match(consultingPage, /distributorPortalApi\.getContext\(\)/);
  assert.match(consultingPage, /attendingConsultant=/);
  assert.match(consultingPage, /createSessions: true/);
  assert.match(consultingPage, /manageAppointments: true/);
  assert.match(consultingPage, /managePayments: false/);
  assert.match(api, /getConsulting/);
  assert.match(api, /createConsultingAppointment/);
  assert.match(api, /updateConsultingAppointment/);
  assert.match(consultingShared, /operations\.getConsulting/);
  assert.match(consultingShared, /operations\.createConsultingAppointment/);
  assert.match(consultingShared, /operations\.updateConsultingAppointment/);
});

test('el distribuidor que registra una sesion queda asignado automaticamente', () => {
  assert.match(consultingShared, /attendingConsultant=\{attendingConsultant\}/);
  assert.match(sessionModal, /Se asigna automáticamente al distribuidor que la registra/);
  assert.match(sessionModal, /attendingConsultant \|\| value\.consultantEmail/);
  assert.match(sessionModal, /attendingConsultant \? \(/);
});

test('el distribuidor puede abrir demos publicas sin ampliar el acceso a su cartera', () => {
  assert.match(header, /authApi\.getPublicDemos\(\)/);
  assert.match(header, /Demos para presentaciones/);
  assert.match(header, /handlePublicDemoSelect/);
  assert.match(header, /\/demo\?companyId=/);
  assert.match(routes, /allowPublicDemoOrDistributorSession/);
  assert.match(routes, /commercial_account_type === 'DISTRIBUTOR'/);
  assert.match(publicDemoPage, /searchParams\.get\('companyId'\)/);
  assert.match(publicDemoPage, /Acceso desde la cuenta distribuidora/);
  assert.match(publicDemoPage, /authApi\.demoLogin/);
});
