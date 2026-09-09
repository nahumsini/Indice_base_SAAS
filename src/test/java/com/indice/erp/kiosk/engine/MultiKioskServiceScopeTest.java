package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class MultiKioskServiceScopeTest {

    private static final String TEST_PIN = "246810";

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private KioskPayloadProtectionService protection;
    @Mock private KioskEmployeeAccessService employeeAccess;
    @Mock private KioskEmployeeToolCatalogService employeeTools;
    @Mock private KioskProviderToolCatalogService providerTools;
    @Mock private KioskMultiDashboardService dashboard;
    @Mock private KioskProviderMultiDashboardService providerDashboard;
    @Mock private KioskRateLimitService rateLimits;
    @Mock private KioskPaymentCollectionGuard collectionGuard;

    private BCryptPasswordEncoder passwordEncoder;
    private MultiKioskService service;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        service = new MultiKioskService(
            jdbcTemplate, new ObjectMapper(), passwordEncoder, protection,
            employeeAccess, employeeTools, providerTools, dashboard, providerDashboard,
            rateLimits, collectionGuard, 28_800, 43_200);
    }

    @Test
    void overdueCompanyCannotBootstrapAuthenticateResumeOrUseChildOperations() throws Exception {
        stubPublicQueries(List.of());
        assertCollectionRestriction();
    }

    @Test
    void overdueCompanyCannotUseProviderCenterOrRegisterProviders() throws Exception {
        stubProviderPublicQueries(List.of());
        assertCollectionRestriction();
        assertThatThrownBy(() -> service.registerProvider("public-token", Map.of(), "network"))
            .isInstanceOf(KioskUnavailableException.class);
        verify(collectionGuard, times(7)).requireOperationalAccess(7L);
        verifyNoInteractions(providerTools, providerDashboard, rateLimits);
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    private void assertCollectionRestriction() throws Exception {
        doThrow(new KioskUnavailableException()).when(collectionGuard).requireOperationalAccess(7L);

        assertThatThrownBy(() -> service.bootstrap("public-token"))
            .isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(() -> service.authenticate("public-token", TEST_PIN, "browser", "network"))
            .isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(() -> service.session("public-token", "parent-session", "browser"))
            .isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(() -> service.launchChild("public-token", "parent-session", 17L, "browser"))
            .isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(() -> service.childWorkspace(
            "public-token", "parent-session", "child-session", 17L, "browser"))
            .isInstanceOf(KioskUnavailableException.class);
        assertThatThrownBy(() -> service.childAction(
            "public-token", "parent-session", "child-session", 17L, "tasks.create", "browser",
            Map.of(), "retry-key"))
            .isInstanceOf(KioskUnavailableException.class);

        verify(collectionGuard, times(6)).requireOperationalAccess(7L);
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(dashboard, employeeAccess, employeeTools, rateLimits);
        assertThat(wasQueryCalled("FROM multi_kiosk_sessions")).isFalse();
        assertThat(wasQueryCalled("SELECT name FROM companies")).isFalse();
        assertThat(wasQueryCalled("credential.secret_hash")).isFalse();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void activeCompanyMemberAuthenticatesWithoutAssignmentOrParentOrganizationMatch()
            throws Exception {
        var hash = passwordEncoder.encode(TEST_PIN);
        stubPublicQueries(List.of(identityRow(81L, 91L, hash)));
        given(dashboard.listForMultiKiosk(any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L)))
            .willReturn(List.of());

        var result = service.authenticate(
            "public-token", TEST_PIN, "browser-session", "test-network");

        assertThat(result).containsKeys("session_token", "employee", "kiosks");
        assertThat(wasQueryCalled("FROM user_companies membership")).isTrue();
        assertThat(wasQueryCalled("credential.status = 'ACTIVE'")).isTrue();
        assertThat(wasQueryCalled("LIMIT 250")).isFalse();
        assertThat(wasSqlUsed("multi_kiosk_assignments")).isFalse();
        assertThat(wasQueryCalled("user_work_profiles")).isFalse();
        assertThat(wasUpdateCalled("INSERT INTO multi_kiosk_sessions")).isTrue();
        verify(rateLimits).releaseSuccessfulMultiKioskPinAttempt(7L, 44L, "test-network");
        verify(dashboard).listForMultiKiosk(any(AuthSessionUser.class),
            org.mockito.ArgumentMatchers.eq(44L));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void employeeAndUserCredentialsForSameMembershipAreOneIdentity() throws Exception {
        var hash = passwordEncoder.encode(TEST_PIN);
        stubPublicQueries(List.of(
            identityRow(81L, 91L, hash),
            identityRow(81L, 91L, hash)));

        service.authenticate("public-token", TEST_PIN, "browser-session", "test-network");

        assertThat(countUpdates("INSERT INTO multi_kiosk_sessions")).isEqualTo(1);
        verify(rateLimits).releaseSuccessfulMultiKioskPinAttempt(7L, 44L, "test-network");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void samePinAcrossDifferentMembershipsFailsClosed() throws Exception {
        var hash = passwordEncoder.encode(TEST_PIN);
        stubPublicQueries(List.of(
            identityRow(81L, 91L, hash),
            identityRow(82L, 92L, hash)));

        assertThatThrownBy(() -> service.authenticate(
            "public-token", TEST_PIN, "browser-session", "test-network"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Invalid personal PIN.");

        assertThat(wasUpdateCalled("INSERT INTO multi_kiosk_sessions")).isFalse();
        verify(rateLimits, never()).releaseSuccessfulMultiKioskPinAttempt(
            7L, 44L, "test-network");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void providerAuthenticatesByCompanyScopedNameAndSixDigitPin() throws Exception {
        var hash = passwordEncoder.encode(TEST_PIN);
        stubProviderPublicQueries(List.of(providerIdentityRow(501L, hash)));
        given(providerDashboard.listForMultiKiosk(7L, 44L, 501L))
            .willReturn(List.of(Map.of("id", 77L, "name", "Seguimiento y pagos")));

        var result = service.authenticate(
            "public-token", "Proveedor Uno", TEST_PIN, "browser-session", "test-network");

        assertThat(result).containsKeys("session_token", "identity", "provider", "kiosks");
        assertThat(result.get("provider")).isEqualTo(Map.of("id", 501L, "name", "Proveedor Uno"));
        assertThat(wasQueryCalled("provider.company_id = ?")).isTrue();
        assertThat(wasQueryCalled("credential_origin = 'PROVIDER_CENTER_ADMIN'")).isTrue();
        assertThat(wasUpdateCalled("'PROVIDER'")).isTrue();
        verify(rateLimits).releaseSuccessfulMultiKioskPinAttempt(7L, 44L, "test-network");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void unknownProviderNameFailsWithoutCreatingASession() throws Exception {
        stubProviderPublicQueries(List.of());

        assertThatThrownBy(() -> service.authenticate(
            "public-token", "Proveedor inexistente", TEST_PIN,
            "browser-session", "test-network"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Nombre de proveedor o NIP incorrecto.");

        assertThat(wasUpdateCalled("INSERT INTO multi_kiosk_sessions")).isFalse();
        var failureAudit = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .filter(invocation -> String.valueOf((Object) invocation.getArgument(0))
                .contains("INSERT INTO multi_kiosk_audit_events"))
            .findFirst()
            .orElseThrow();
        assertThat(failureAudit.getArguments()[5]).isEqualTo("PROVIDER_CENTER_PIN_FAILED");
        assertThat(failureAudit.getArguments()[6]).isEqualTo("FAILED");
        assertThat(String.valueOf(failureAudit.getArguments()[9]))
            .contains("\"access_population\":\"PROVIDER_NAME_PIN\"");
        verify(providerDashboard, never()).listForMultiKiosk(
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void sessionResumeRequiresActiveMembershipAndActivePersonalPinWithoutAssignmentOrWrite()
            throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("FROM multi_kiosk_definitions")) {
                    return List.of(mapper.mapRow(definitionRow(2L, 3L), 0));
                }
                if (sql.contains("FROM multi_kiosk_sessions session")) {
                    return List.of(mapper.mapRow(sessionRow(), 0));
                }
                if (sql.contains("SELECT name FROM companies")) {
                    return List.of(mapper.mapRow(companyRow(), 0));
                }
                return List.of();
            });

        var result = service.session("public-token", "parent-session", "browser-session");

        assertThat(result).containsKeys("employee", "kiosks", "expires_at");
        assertThat(wasQueryCalled("credential.status = 'ACTIVE'")).isTrue();
        assertThat(wasQueryCalled("membership.company_id = session.company_id")).isTrue();
        assertThat(wasSqlUsed("multi_kiosk_assignments")).isFalse();
        assertThat(wasUpdateCalled("last_activity_at = CURRENT_TIMESTAMP")).isFalse();
        verify(dashboard).listForMultiKiosk(any(AuthSessionUser.class),
            org.mockito.ArgumentMatchers.eq(44L));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void childOperationsDelegateEffectiveAuthorizationOnlyOnceToDashboard() throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("FROM multi_kiosk_definitions")) {
                    return List.of(mapper.mapRow(definitionRow(null, null), 0));
                }
                if (sql.contains("FROM multi_kiosk_sessions session")) {
                    return List.of(mapper.mapRow(sessionRow(), 0));
                }
                return List.of();
            });
        var launch = Map.<String, Object>of("kiosk_session_id", "child-session");
        var workspace = Map.<String, Object>of("experience_status", "READY");
        var action = new KioskDispatchResult(
            Map.of("result_status", "success"), "child-session", "attendance.punch.create@1");
        given(dashboard.createMobileSession(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L),
            org.mockito.ArgumentMatchers.eq(17L), org.mockito.ArgumentMatchers.eq("browser-session")))
            .willReturn(launch);
        given(dashboard.mobileWorkspace(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L),
            org.mockito.ArgumentMatchers.eq(17L), org.mockito.ArgumentMatchers.eq("child-token"),
            org.mockito.ArgumentMatchers.eq("browser-session")))
            .willReturn(workspace);
        given(dashboard.executeMobileAction(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L),
            org.mockito.ArgumentMatchers.eq(17L),
            org.mockito.ArgumentMatchers.eq("attendance.punch.create@1"),
            org.mockito.ArgumentMatchers.eq("child-token"),
            org.mockito.ArgumentMatchers.eq("browser-session"),
            org.mockito.ArgumentMatchers.eq(Map.of("event_type", "check_in")),
            org.mockito.ArgumentMatchers.eq("idempotency-key")))
            .willReturn(action);

        assertThat(service.launchChild(
            "public-token", "parent-session", 17L, "browser-session")).isSameAs(launch);
        assertThat(service.childWorkspace(
            "public-token", "parent-session", "child-token", 17L, "browser-session"))
            .isSameAs(workspace);
        assertThat(service.childAction(
            "public-token", "parent-session", "child-token", 17L,
            "attendance.punch.create@1", "browser-session",
            Map.of("event_type", "check_in"), "idempotency-key"))
            .isSameAs(action);

        verify(dashboard, never()).listForMultiKiosk(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.anyLong());
        verify(dashboard).createMobileSession(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L),
            org.mockito.ArgumentMatchers.eq(17L), org.mockito.ArgumentMatchers.eq("browser-session"));
        verify(dashboard).mobileWorkspace(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L),
            org.mockito.ArgumentMatchers.eq(17L), org.mockito.ArgumentMatchers.eq("child-token"),
            org.mockito.ArgumentMatchers.eq("browser-session"));
        verify(dashboard).executeMobileAction(
            any(AuthSessionUser.class), org.mockito.ArgumentMatchers.eq(44L),
            org.mockito.ArgumentMatchers.eq(17L),
            org.mockito.ArgumentMatchers.eq("attendance.punch.create@1"),
            org.mockito.ArgumentMatchers.eq("child-token"),
            org.mockito.ArgumentMatchers.eq("browser-session"),
            org.mockito.ArgumentMatchers.eq(Map.of("event_type", "check_in")),
            org.mockito.ArgumentMatchers.eq("idempotency-key"));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void createIgnoresLegacyParentScopeAndReportsCompanyPinPopulation() throws Exception {
        given(dashboard.contextualCatalog(7L)).willReturn(List.of(Map.of(
            "id", 17L,
            "unit_id", 24L,
            "business_id", 29L)));
        given(protection.protect(anyString())).willReturn("protected-token");
        given(protection.reveal("protected-token")).willReturn("public-token");
        given(jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class)).willReturn(44L);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("SELECT definition.*")) {
                    return List.of(mapper.mapRow(adminRow(), 0));
                }
                if (sql.contains("FROM multi_kiosk_items item")) {
                    return List.of(mapper.mapRow(itemRow(), 0));
                }
                return List.of();
            });

        var created = service.create(7L, 81L, Map.of(
            "name", "Company operations",
            "unit_id", 6L,
            "business_id", 8L,
            "kiosk_definition_ids", List.of(17L)));

        assertThat(created)
            .containsEntry("access_population", "COMPANY_PIN")
            .containsEntry("eligible_member_count", 3)
            .containsEntry("employee_count", 3)
            .containsEntry("employees", List.of());
        assertThat(wasUpdateCalled("INSERT INTO multi_kiosk_definitions")).isTrue();
        var insert = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .filter(invocation -> String.valueOf((Object) invocation.getArgument(0))
                .contains("INSERT INTO multi_kiosk_definitions"))
            .findFirst()
            .orElseThrow();
        var insertValues = insert.getArguments();
        assertThat(insertValues[5]).isEqualTo("EMPLOYEE");
        assertThat(insertValues[6]).isEqualTo(false);
        assertThat(insertValues[7]).isNull();
        assertThat(insertValues[8]).isNull();
        assertThat(wasSqlUsed("FROM units")).isFalse();
        assertThat(wasSqlUsed("FROM businesses")).isFalse();
        assertThat(wasSqlUsed("multi_kiosk_assignments")).isFalse();
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void stubPublicQueries(List<ResultSet> identityRows) throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("FROM multi_kiosk_definitions")) {
                    return List.of(mapper.mapRow(definitionRow(2L, 3L), 0));
                }
                if (sql.contains("credential.secret_hash")) {
                    var mapped = new java.util.ArrayList<>();
                    for (var index = 0; index < identityRows.size(); index++) {
                        mapped.add(mapper.mapRow(identityRows.get(index), index));
                    }
                    return mapped;
                }
                if (sql.contains("SELECT name FROM companies")) {
                    return List.of(mapper.mapRow(companyRow(), 0));
                }
                return List.of();
            });
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void stubProviderPublicQueries(List<ResultSet> identityRows) throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("SELECT COALESCE(updated_by, created_by)")) {
                    return List.of(mapper.mapRow(actorRow(), 0));
                }
                if (sql.contains("FROM multi_kiosk_definitions")) {
                    return List.of(mapper.mapRow(providerDefinitionRow(), 0));
                }
                if (sql.contains("FROM finance_providers provider")) {
                    var mapped = new java.util.ArrayList<>();
                    for (var index = 0; index < identityRows.size(); index++) {
                        mapped.add(mapper.mapRow(identityRows.get(index), index));
                    }
                    return mapped;
                }
                return List.of();
            });
    }

    private ResultSet definitionRow(Long unitId, Long businessId) throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("id")).willReturn(44L);
        given(rs.getLong("company_id")).willReturn(7L);
        given(rs.getString("name")).willReturn("Company operations");
        given(rs.getString("description")).willReturn("Employee launcher");
        given(rs.getString("audience_type")).willReturn("EMPLOYEE");
        given(rs.getBoolean("allow_provider_registration")).willReturn(false);
        given(rs.getString("status")).willReturn("ACTIVE");
        given(rs.getObject("unit_id", Long.class)).willReturn(unitId);
        given(rs.getObject("business_id", Long.class)).willReturn(businessId);
        given(rs.getString("theme_key")).willReturn("indice-blue");
        given(rs.getString("default_locale")).willReturn("es-MX");
        given(rs.getTimestamp("expires_at"))
            .willReturn(Timestamp.from(Instant.now().plusSeconds(3_600)));
        return rs;
    }

    private ResultSet identityRow(long userId, long membershipId, String hash) throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("user_id")).willReturn(userId);
        given(rs.getLong("user_company_id")).willReturn(membershipId);
        given(rs.getString("name")).willReturn("Active member " + membershipId);
        given(rs.getString("role")).willReturn("user");
        given(rs.getString("secret_hash")).willReturn(hash);
        return rs;
    }

    private ResultSet providerDefinitionRow() throws Exception {
        var rs = definitionRow(null, null);
        given(rs.getString("name")).willReturn("Centro de Proveedores");
        given(rs.getString("description")).willReturn("Acceso de proveedores");
        given(rs.getString("audience_type")).willReturn("PROVIDER");
        return rs;
    }

    private ResultSet providerIdentityRow(long providerId, String hash) throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("provider_id")).willReturn(providerId);
        given(rs.getString("name")).willReturn("Proveedor Uno");
        given(rs.getString("secret_hash")).willReturn(hash);
        return rs;
    }

    private ResultSet actorRow() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("actor_id")).willReturn(81L);
        return rs;
    }

    private ResultSet sessionRow() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getString("session_id")).willReturn("session-id");
        given(rs.getLong("user_id")).willReturn(81L);
        given(rs.getLong("user_company_id")).willReturn(91L);
        given(rs.getString("name")).willReturn("Active member");
        given(rs.getString("role")).willReturn("user");
        given(rs.getLong("expires_in")).willReturn(3_600L);
        return rs;
    }

    private ResultSet companyRow() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getString("name")).willReturn("Indice Demo");
        return rs;
    }

    private ResultSet adminRow() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("id")).willReturn(44L);
        given(rs.getString("code")).willReturn("MK-TEST");
        given(rs.getString("name")).willReturn("Company operations");
        given(rs.getString("description")).willReturn("");
        given(rs.getString("audience_type")).willReturn("EMPLOYEE");
        given(rs.getBoolean("allow_provider_registration")).willReturn(false);
        given(rs.getString("status")).willReturn("ACTIVE");
        given(rs.getString("unit_name")).willReturn("");
        given(rs.getString("business_name")).willReturn("");
        given(rs.getString("theme_key")).willReturn("indice-blue");
        given(rs.getString("default_locale")).willReturn("es-MX");
        given(rs.getString("public_token_hint")).willReturn("hint");
        given(rs.getString("protected_public_token")).willReturn("protected-token");
        given(rs.getInt("configuration_version")).willReturn(1);
        given(rs.getInt("kiosk_count")).willReturn(1);
        given(rs.getInt("tool_count")).willReturn(0);
        given(rs.getInt("eligible_member_count")).willReturn(3);
        return rs;
    }

    private ResultSet itemRow() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("id")).willReturn(17L);
        given(rs.getString("name")).willReturn("Tasks");
        given(rs.getString("owner_module")).willReturn("PROCESS_TASKS");
        given(rs.getString("kiosk_type")).willReturn("TASKS");
        given(rs.getString("code")).willReturn("LEGACY-TASKS");
        given(rs.getInt("sort_order")).willReturn(0);
        return rs;
    }

    private boolean wasSqlUsed(String fragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> invocation.getArguments().length > 0)
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .anyMatch(sql -> sql.contains(fragment));
    }

    private boolean wasQueryCalled(String fragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "query".equals(invocation.getMethod().getName()))
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .anyMatch(sql -> sql.contains(fragment));
    }

    private boolean wasUpdateCalled(String fragment) {
        return countUpdates(fragment) > 0;
    }

    private long countUpdates(String fragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .filter(sql -> sql.contains(fragment))
            .count();
    }
}
