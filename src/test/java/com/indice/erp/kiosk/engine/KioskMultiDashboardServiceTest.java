package com.indice.erp.kiosk.engine;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.ResultSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class KioskMultiDashboardServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private KioskRegistryService registry;
    @Mock
    private KioskAdapterRegistry adapterRegistry;
    @Mock
    private KioskEngineFeatureFlags featureFlags;
    @Mock
    private KioskSessionService sessions;
    @Mock
    private KioskEmployeeAccessService employeeAccess;
    @Mock
    private KioskEmployeeToolCatalogService employeeTools;
    @Mock
    private KioskActionDispatcher dispatcher;
    @Mock
    private TabPermissionAccessService tabPermissions;
    @Mock
    private ModuleAccessService moduleAccess;
    @Mock
    private KioskModuleAdapter adapter;

    private KioskMultiDashboardService service;
    private AuthSessionUser user;
    private KioskResolvedDefinition definition;
    private KioskCapabilityDescriptor tasksRead;

    @BeforeEach
    @SuppressWarnings({"rawtypes", "unchecked"})
    void setUp() {
        service = new KioskMultiDashboardService(
            jdbcTemplate, registry, adapterRegistry, featureFlags, sessions,
            employeeAccess, employeeTools, dispatcher, tabPermissions, moduleAccess);
        user = new AuthSessionUser(9L, 7L, 19L, "Employee", "user");
        definition = new KioskResolvedDefinition(
            17L, 7L, "PROCESS_TASKS", "task_access", 31L, "TASKS", "Tasks",
            KioskDefinitionStatus.ACTIVE, null, null, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", false, 1, 1);
        tasksRead = new KioskCapabilityDescriptor(
            "process-tasks.tasks.read", 1, "PROCESS_TASKS",
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED,
            false, false);

        lenient().when(registry.list(7L)).thenReturn(List.of(definition));
        lenient().when(employeeAccess.isEmployeeEligible(7L, 17L)).thenReturn(true);
        lenient().when(featureFlags.adapterEnabled("PROCESS_TASKS")).thenReturn(true);
        lenient().when(moduleAccess.canAccess(user, "processes")).thenReturn(true);
        lenient().when(adapterRegistry.requireAdapter("PROCESS_TASKS")).thenReturn(adapter);
        lenient().when(registry.requireById(7L, 17L)).thenReturn(definition);
        lenient().when(adapter.employeeCenterTabPermissionKeys(definition))
            .thenReturn(Set.of("processes.calendar"));
        lenient().when(adapter.employeeCenterAccessAllows(
            any(KioskResolvedDefinition.class), anyLong(), any(), anyBoolean()))
            .thenAnswer(invocation -> invocation.getArgument(3));
    }

    @Test
    void revokedModuleEntitlementHidesCatalogAndDeniesWorkspaceAndAction() {
        given(moduleAccess.canAccess(user, "processes")).willReturn(false);

        assertThat(service.list(user)).isEmpty();
        assertThatThrownBy(() -> service.workspace(
            user, 17L, "child-token", "browser"))
            .isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(() -> service.executeAction(
            user, 17L, tasksRead.versionedKey(), "child-token", "browser",
            Map.of(), "idempotency-key"))
            .isInstanceOf(KioskUnavailableException.class);

        then(tabPermissions).shouldHaveNoInteractions();
        then(sessions).shouldHaveNoInteractions();
        then(dispatcher).shouldHaveNoInteractions();
    }

    @Test
    void tabPermissionIsAnAdditionalRequiredGate() {
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(false);

        assertThat(service.list(user)).isEmpty();

        var requirement = ArgumentCaptor.forClass(TabPermissionRequirement.class);
        then(tabPermissions).should().canAccess(eq(user), requirement.capture());
        assertThat(requirement.getValue().anyOf()).containsExactly("processes.calendar");
        then(jdbcTemplate).should(never()).queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class));
    }

    @Test
    void tabPermissionDoesNotReplaceTheExplicitKioskGrant() {
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class)))
            .willReturn(0);

        assertThat(service.list(user)).isEmpty();

        then(jdbcTemplate).should().queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class));
        then(registry).should(never()).capabilityEnabled(anyLong(), any());
    }

    @Test
    void multiKioskCatalogNeedsNoPersistentGrantButKeepsEffectiveCardGates()
            throws Exception {
        allowEmployeeCapability();
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        composeInMultiKiosk(17L);

        assertThat(service.listForMultiKiosk(user, 23L))
            .singleElement()
            .satisfies(card -> assertThat(card)
                .containsEntry("id", 17L)
                .containsEntry("module", "PROCESS_TASKS"));

        then(jdbcTemplate).should(never()).queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class));
        then(registry).should().capabilityEnabled(17L, tasksRead);
    }

    @Test
    void moduleOwnedExactAssignmentCanSatisfyScopeForOnlyItsDefinition()
            throws Exception {
        var pettyDefinition = new KioskResolvedDefinition(
            27L, 7L, "PETTY_CASH", "receipt_capture", 41L,
            "PETTY-41", "Caja asignada", KioskDefinitionStatus.ACTIVE,
            24L, 5L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        var receiptCreate = new KioskCapabilityDescriptor(
            "petty-cash.receipt.create", 1, "PETTY_CASH",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            true, true);
        given(registry.list(7L)).willReturn(List.of(pettyDefinition));
        given(employeeAccess.isEmployeeEligible(7L, 27L)).willReturn(true);
        given(featureFlags.adapterEnabled("PETTY_CASH")).willReturn(true);
        given(moduleAccess.canAccess(user, "petty_cash")).willReturn(true);
        given(adapterRegistry.requireAdapter("PETTY_CASH")).willReturn(adapter);
        given(adapter.employeeCenterTabPermissionKeys(pettyDefinition))
            .willReturn(Set.of("petty_cash.cash"));
        given(adapter.employeeCenterAccessAllows(pettyDefinition, 9L, 19L, false))
            .willReturn(true);
        given(adapter.supportsEmployeeCenter(pettyDefinition)).willReturn(true);
        given(adapter.capabilities(pettyDefinition)).willReturn(Set.of(receiptCreate));
        given(adapter.employeeCapabilityTabPermissionKeys(pettyDefinition, receiptCreate))
            .willReturn(Set.of("petty_cash.cash"));
        given(registry.capabilityEnabled(27L, receiptCreate)).willReturn(true);
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        composeInMultiKiosk(27L);

        assertThat(service.listForMultiKiosk(user, 23L))
            .singleElement()
            .satisfies(card -> assertThat(card)
                .containsEntry("id", 27L)
                .containsEntry("module", "PETTY_CASH"));
    }

    @Test
    void companyWideRoleCanOpenScopedPosFromItsWarehouseAndRegister()
            throws Exception {
        var superadmin = new AuthSessionUser(9L, 7L, 19L, "Owner", "superadmin");
        var posDefinition = new KioskResolvedDefinition(
            28L, 7L, "POINT_OF_SALE", "self_service", 42L,
            "POS-42", "Pre-ticket sucursal", KioskDefinitionStatus.ACTIVE,
            24L, 29L, 11L, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        var catalogRead = new KioskCapabilityDescriptor(
            "pos.self-service.catalog.read", 1, "POINT_OF_SALE",
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED,
            false, false);
        given(registry.list(7L)).willReturn(List.of(posDefinition));
        given(employeeAccess.isEmployeeEligible(7L, 28L)).willReturn(true);
        given(featureFlags.adapterEnabled("POINT_OF_SALE")).willReturn(true);
        given(moduleAccess.canAccess(superadmin, "pos")).willReturn(true);
        given(adapterRegistry.requireAdapter("POINT_OF_SALE")).willReturn(adapter);
        given(adapter.supportsEmployeeCenter(posDefinition)).willReturn(true);
        given(adapter.capabilities(posDefinition)).willReturn(Set.of(catalogRead));
        given(registry.capabilityEnabled(28L, catalogRead)).willReturn(true);
        composeInMultiKiosk(28L);

        assertThat(service.listForMultiKiosk(superadmin, 23L))
            .singleElement()
            .satisfies(card -> assertThat(card)
                .containsEntry("id", 28L)
                .containsEntry("module", "POINT_OF_SALE"));

        then(jdbcTemplate).should(never()).query(
            contains("FROM user_work_profiles"),
            any(RowMapper.class), any(Object[].class));
        then(tabPermissions).shouldHaveNoInteractions();
    }

    @Test
    void posModuleAssignmentIsSufficientForARegularMultiKioskUser() throws Exception {
        var posDefinition = new KioskResolvedDefinition(
            28L, 7L, "POINT_OF_SALE", "self_service", 42L,
            "POS-42", "Pre-ticket sucursal", KioskDefinitionStatus.ACTIVE,
            24L, 29L, 11L, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        var catalogRead = new KioskCapabilityDescriptor(
            "pos.self-service.catalog.read", 1, "POINT_OF_SALE",
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED,
            false, false);
        given(registry.list(7L)).willReturn(List.of(posDefinition));
        given(employeeAccess.isEmployeeEligible(7L, 28L)).willReturn(true);
        given(featureFlags.adapterEnabled("POINT_OF_SALE")).willReturn(true);
        given(moduleAccess.canAccess(user, "pos")).willReturn(true);
        given(adapterRegistry.requireAdapter("POINT_OF_SALE")).willReturn(adapter);
        given(adapter.supportsEmployeeCenter(posDefinition)).willReturn(true);
        given(adapter.capabilities(posDefinition)).willReturn(Set.of(catalogRead));
        given(registry.capabilityEnabled(28L, catalogRead)).willReturn(true);
        composeInMultiKiosk(28L);

        assertThat(service.listForMultiKiosk(user, 23L))
            .singleElement()
            .satisfies(card -> assertThat(card).containsEntry("module", "POINT_OF_SALE"));

        then(tabPermissions).shouldHaveNoInteractions();
        then(adapter).should(never()).employeeCenterAccessAllows(
            any(), anyLong(), any(), anyBoolean());
    }

    @Test
    void mobileMultiKioskHidesUnsupportedLegacyWorkspaceButAuthenticatedWebRemainsCompatible()
            throws Exception {
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        given(adapter.capabilities(definition)).willReturn(Set.of(tasksRead));
        given(registry.capabilityEnabled(17L, tasksRead)).willReturn(true);
        given(adapter.supportsEmployeeCenter(definition)).willReturn(false);
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);
        composeInMultiKiosk(17L);

        assertThat(service.listForMultiKiosk(user, 23L)).isEmpty();
        assertThat(service.list(user))
            .singleElement()
            .satisfies(card -> assertThat(card).containsEntry("id", 17L));

        then(sessions).shouldHaveNoInteractions();
    }

    @Test
    void cardRequiresTabPermissionGrantAndEnabledScopedCapability() {
        allowEmployeeCapability();
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);

        assertThat(service.list(user))
            .singleElement()
            .satisfies(card -> assertThat(card)
                .containsEntry("id", 17L)
                .containsEntry("module", "PROCESS_TASKS"));

        then(registry).should().synchronizeCapabilities(definition, Set.of(tasksRead));
        then(registry).should().capabilityEnabled(17L, tasksRead);
    }

    @Test
    void catalogComputesEmployeeWorkspaceReadinessOnlyOncePerCandidate() {
        allowEmployeeCapability();
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);

        assertThat(service.list(user)).hasSize(1);

        then(adapter).should(times(1)).supportsEmployeeCenter(definition);
    }

    @Test
    void contextualCatalogPublishesOnlyReadyScopedDefinitionsWithoutWritingOnRead() {
        var pettyDefinition = new KioskResolvedDefinition(
            27L, 7L, "PETTY_CASH", "receipt_capture", 41L,
            "PETTY-01", "Caja principal", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        var receiptCreate = new KioskCapabilityDescriptor(
            "petty-cash.receipt.create", 1, "PETTY_CASH",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            true, true);
        given(employeeAccess.catalog(7L)).willReturn(List.of(Map.of(
            "id", 27L,
            "name", "Caja principal",
            "owner_module", "PETTY_CASH",
            "kiosk_type", "receipt_capture",
            "unit_name", "Unidad Norte",
            "business_name", "Negocio Centro")));
        given(registry.requireById(7L, 27L)).willReturn(pettyDefinition);
        given(featureFlags.adapterEnabled("PETTY_CASH")).willReturn(true);
        given(moduleAccess.companyCanAccess(7L, "petty_cash")).willReturn(true);
        given(adapterRegistry.requireAdapter("PETTY_CASH")).willReturn(adapter);
        given(adapter.supportsEmployeeCenter(pettyDefinition)).willReturn(true);
        given(adapter.employeeCenterTabPermissionKeys(pettyDefinition))
            .willReturn(Set.of("petty_cash.cash"));
        given(adapter.employeeCapabilityTabPermissionKeys(pettyDefinition, receiptCreate))
            .willReturn(Set.of("petty_cash.cash"));
        given(adapter.capabilities(pettyDefinition)).willReturn(Set.of(receiptCreate));
        assertThat(service.contextualCatalog(7L))
            .singleElement()
            .satisfies(item -> assertThat(item)
                .containsEntry("id", 27L)
                .containsEntry("employee_center_supported", true)
                .containsEntry("audience_policy", "SCOPED_COMPANY_MEMBERS")
                .containsEntry("readiness", "AVAILABLE"));

        then(registry).should(never()).synchronizeCapabilities(any(), any());
    }

    @Test
    void contextualCatalogDoesNotHideLegacyKioskBeforeCapabilityProjectionIsMaterialized() {
        var pettyDefinition = new KioskResolvedDefinition(
            27L, 7L, "PETTY_CASH", "receipt_capture", 41L,
            "PETTY-01", "Caja principal", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        var receiptCreate = new KioskCapabilityDescriptor(
            "petty-cash.receipt.create", 1, "PETTY_CASH",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            true, true);
        given(employeeAccess.catalog(7L)).willReturn(List.of(Map.of(
            "id", 27L,
            "name", "Caja principal",
            "owner_module", "PETTY_CASH",
            "kiosk_type", "receipt_capture")));
        given(registry.requireById(7L, 27L)).willReturn(pettyDefinition);
        given(featureFlags.adapterEnabled("PETTY_CASH")).willReturn(true);
        given(moduleAccess.companyCanAccess(7L, "petty_cash")).willReturn(true);
        given(adapterRegistry.requireAdapter("PETTY_CASH")).willReturn(adapter);
        given(adapter.supportsEmployeeCenter(pettyDefinition)).willReturn(true);
        given(adapter.employeeCenterTabPermissionKeys(pettyDefinition))
            .willReturn(Set.of("petty_cash.cash"));
        given(adapter.employeeCapabilityTabPermissionKeys(pettyDefinition, receiptCreate))
            .willReturn(Set.of("petty_cash.cash"));
        given(adapter.capabilities(pettyDefinition)).willReturn(Set.of(receiptCreate));
        assertThat(service.contextualCatalog(7L))
            .singleElement()
            .satisfies(item -> assertThat(item)
                .containsEntry("id", 27L)
                .containsEntry("readiness", "AVAILABLE"));

        then(registry).should(never()).synchronizeCapabilities(any(), any());
    }

    @Test
    void contextualCatalogRejectsPosTypesOutsideWaiterAndPreticket() {
        var selfCheckout = new KioskResolvedDefinition(
            28L, 7L, "POINT_OF_SALE", "self_checkout", 42L,
            "CHECKOUT-01", "Autocobro", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 11L, KioskAccessLevel.PUBLIC,
            null, "tokenhint", true, 1, 1);
        given(employeeAccess.catalog(7L)).willReturn(List.of(Map.of(
            "id", 28L,
            "name", "Autocobro",
            "owner_module", "POINT_OF_SALE",
            "kiosk_type", "self_checkout")));
        given(registry.requireById(7L, 28L)).willReturn(selfCheckout);

        assertThat(service.contextualCatalog(7L)).isEmpty();

        then(adapterRegistry).should(never()).requireAdapter("POINT_OF_SALE");
    }

    @Test
    void mobileActionAcceptsLegacyVNotationButDispatchesCanonicalCapability()
            throws Exception {
        allowEmployeeCapability();
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        composeInMultiKiosk(17L);
        given(registry.requireById(7L, 17L)).willReturn(definition);
        var principal = new KioskSessionPrincipal(
            "mobile-session", 17L, 7L, "USER", 9L,
            Set.of(tasksRead.versionedKey()), java.time.Instant.now().plusSeconds(600));
        given(sessions.requireMobileMultiKioskSession(
            definition, 23L, "child-token", "browser", 9L, 19L))
            .willReturn(principal);
        var dispatchResult = new KioskDispatchResult(
            Map.of("items", List.of()), "mobile-session", tasksRead.versionedKey());
        given(dispatcher.dispatchWithMetadata(any(), any(), eq(null)))
            .willReturn(dispatchResult);

        assertThat(service.executeMobileAction(
            user, 23L, 17L, "process-tasks.tasks.read@v1", "child-token",
            "browser", Map.of(), null)).isSameAs(dispatchResult);

        var context = ArgumentCaptor.forClass(KioskExecutionContext.class);
        var request = ArgumentCaptor.forClass(KioskActionRequest.class);
        then(dispatcher).should().dispatchWithMetadata(
            context.capture(), request.capture(), eq(null));
        assertThat(context.getValue().channel())
            .isEqualTo(KioskExecutionChannels.MOBILE_MULTI_KIOSK);
        assertThat(request.getValue().versionedCapabilityKey())
            .isEqualTo("process-tasks.tasks.read@1");
        then(jdbcTemplate).should(never()).queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class));
    }

    @Test
    void mobileOpenByIdFailsClosedWhenChildIsNotComposed() throws Exception {
        allowEmployeeCapability();
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        composeInMultiKiosk(17L);

        assertThatThrownBy(() -> service.createMobileSession(
            user, 23L, 18L, "browser"))
            .isInstanceOf(KioskUnavailableException.class);

        then(registry).should(never()).requireById(7L, 18L);
        then(sessions).shouldHaveNoInteractions();
    }

    @Test
    void authenticatedWebActionKeepsItsAuthoritativeIdentityForRateLimiting() {
        allowEmployeeCapability();
        given(tabPermissions.canAccess(eq(user), any(TabPermissionRequirement.class)))
            .willReturn(true);
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);
        given(registry.requireById(7L, 17L)).willReturn(definition);
        var principal = new KioskSessionPrincipal(
            "web-session", 17L, 7L, "USER", 9L,
            Set.of(tasksRead.versionedKey()), java.time.Instant.now().plusSeconds(600));
        given(sessions.requireAuthenticatedIndexSession(
            definition, "web-token", "browser", 9L)).willReturn(principal);
        var dispatchResult = new KioskDispatchResult(
            Map.of("items", List.of()), "web-session", tasksRead.versionedKey());
        given(dispatcher.dispatchWithMetadata(any(), any(), eq(null)))
            .willReturn(dispatchResult);

        assertThat(service.executeAction(
            user, 17L, tasksRead.versionedKey(), "web-token", "browser",
            Map.of(), null)).isSameAs(dispatchResult);

        var context = ArgumentCaptor.forClass(KioskExecutionContext.class);
        then(dispatcher).should().dispatchWithMetadata(context.capture(), any(), eq(null));
        assertThat(context.getValue().channel())
            .isEqualTo(KioskExecutionChannels.AUTHENTICATED_WEB);
        assertThat(context.getValue().session()).isSameAs(principal);
    }

    private void allowEmployeeCapability() {
        given(adapter.employeeCapabilityTabPermissionKeys(definition, tasksRead))
            .willReturn(Set.of("processes.calendar"));
        given(adapter.capabilities(definition)).willReturn(Set.of(tasksRead));
        given(adapter.supportsEmployeeCenter(definition)).willReturn(true);
        given(registry.capabilityEnabled(17L, tasksRead)).willReturn(true);
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void composeInMultiKiosk(long... kioskIds) throws Exception {
        given(jdbcTemplate.query(
            contains("FROM multi_kiosk_items item"),
            any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                var rows = new java.util.ArrayList<>();
                for (var index = 0; index < kioskIds.length; index++) {
                    var row = mock(ResultSet.class);
                    given(row.getLong("kiosk_definition_id")).willReturn(kioskIds[index]);
                    rows.add(mapper.mapRow(row, index));
                }
                return rows;
            });
    }
}
