package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class KioskSessionServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsPersonalGrantAndShortLivedBrowserBoundSessionWithoutPersistingRawToken() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var definition = definition();
        var expiresAt = Instant.now().plusSeconds(120);
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(1);

        var session = service.createControlledSession(
            definition, "EMPLOYEE", 81L, "raw-identification-token", "browser-17",
            Set.of("process-tasks.tasks.read@1"), expiresAt);

        assertThat(session.kioskDefinitionId()).isEqualTo(17L);
        assertThat(session.identityId()).isEqualTo(81L);
        assertThat(session.expiresAt()).isEqualTo(expiresAt);
        assertThat(wasUpdateCalled("INSERT IGNORE INTO kiosk_grants")).isTrue();
        assertThat(wasUpdateCalled("INSERT INTO kiosk_sessions")).isTrue();
        assertThat(wasUpdateCalled("TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP)")).isTrue();
        assertThat(wasUpdateCalled("INSERT INTO kiosk_audit_events")).isTrue();
    }

    @Test
    void createsAnEngineOwnedTokenForAControlledSessionLaunch() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(1);

        var launch = service.createControlledSessionLaunch(
            definition(), "EMPLOYEE", 81L, "attendance-tab-1234567890-1234567890",
            Set.of("process-tasks.tasks.read@1"), Instant.now().plusSeconds(120));

        assertThat(launch.session().identityId()).isEqualTo(81L);
        assertThat(launch.accessToken()).isNotBlank().hasSizeGreaterThanOrEqualTo(32);
        assertThat(launch.accessToken()).isNotEqualTo("81").doesNotContain("attendance-tab");
        assertThat(wasUpdateCalled("INSERT INTO kiosk_sessions")).isTrue();
    }

    @Test
    void doesNotReactivateARevokedPersonalGrantWhenCreatingANewSession() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(0);

        assertThatThrownBy(() -> service.createControlledSession(
            definition(), "PROVIDER", 81L, "raw-identification-token", "browser-17",
            Set.of("payables.submission.create@1"), Instant.now().plusSeconds(120)))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk grant is not active.");

        assertThat(wasUpdateCalled("INSERT INTO kiosk_sessions")).isFalse();
    }

    @Test
    void supplierPortalRequiresAnExistingExplicitGrantWithoutAutoCreatingOne() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(0);

        assertThatThrownBy(() -> service.createControlledSession(
            supplierDefinition(), "PROVIDER", 81L, "raw-identification-token", "browser-17",
            Set.of("procurement.catalog.read@1"), Instant.now().plusSeconds(120)))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk grant is not active.");

        assertThat(wasUpdateCalled("INSERT IGNORE INTO kiosk_grants")).isFalse();
        assertThat(wasUpdateCalled("INSERT INTO kiosk_sessions")).isFalse();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rejectsASessionExcludedByTheDatabaseTemporalGuardsBeforeRefreshingItsActivity() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThatThrownBy(() -> service.requireSession(
            definition(), capability(), Map.of("identification_token", "raw-token"), null))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk authentication is required.");

        assertThat(wasQueryCalled("expires_at > CURRENT_TIMESTAMP")).isTrue();
        assertThat(wasQueryCalled("last_activity_at >= TIMESTAMPADD")).isTrue();
        verify(jdbcTemplate, never()).update(
            contains("last_activity_at = CURRENT_TIMESTAMP"), any(Object[].class));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rejectsCapabilityThatWasNotFrozenIntoTheSession() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"process-tasks.task.create@1\"]", 300);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });

        assertThatThrownBy(() -> service.requireSession(
            definition(), capability(), Map.of("identification_token", "raw-token"), null))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk capability is not granted.");

        verify(jdbcTemplate, never()).queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void supplierPortalKeepsSessionAliveWithinItsFifteenMinuteWindow() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"procurement.catalog.read@1\"]", 300);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(1);

        var session = service.requireSession(
            supplierDefinition(), supplierCapability(),
            Map.of("kiosk_session_token", "raw-token"), null);

        assertThat(session.sessionId()).isEqualTo("session-1");
        verify(jdbcTemplate).update(
            contains("last_activity_at = CURRENT_TIMESTAMP"), any(Object[].class));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void processTasksKeepsAnActiveWorkSessionForThirtyMinutes() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"process-tasks.tasks.read@1\"]", 60 * 60);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(1);

        var session = service.requireSession(
            definition(), capability(), Map.of("identification_token", "raw-token"), null);

        assertThat(session.sessionId()).isEqualTo("session-1");
        verify(jdbcTemplate).update(
            contains("last_activity_at = CURRENT_TIMESTAMP"), any(Object[].class));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void mobileSessionTokenCanBeRevalidatedAfterParentAuthorityWasChecked() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"process-tasks.tasks.read@1\"]", 60 * 60);
        lenient().when(rs.getString("identity_type")).thenReturn("USER");
        lenient().when(rs.getLong("identity_id")).thenReturn(9L);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
        });
        var expectedSession = new KioskSessionPrincipal(
            "session-1", 17L, 7L, "USER", 9L, Set.of(),
            Instant.now().plusSeconds(600));
        var session = service.requirePrevalidatedMobileSession(
            definition(), capability(), Map.of("kiosk_session_token", "mobile-child-token"),
            "browser-17", expectedSession);

        assertThat(session.identityType()).isEqualTo("USER");
        assertThat(session.identityId()).isEqualTo(9L);
        verify(jdbcTemplate, never()).queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class));
        var sessionQuery = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "query".equals(invocation.getMethod().getName()))
            .filter(invocation -> String.valueOf((Object) invocation.getArgument(0))
                .contains("AND channel = ?"))
            .findFirst()
            .orElseThrow();
        assertThat(List.of(sessionQuery.getArguments()))
            .contains(KioskExecutionChannels.MOBILE_MULTI_KIOSK);
        assertThat(sessionQuery.getArguments()[5]).isEqualTo(-28800L);
        verify(jdbcTemplate).update(
            contains("last_activity_at = CURRENT_TIMESTAMP"), any(Object[].class));
    }

    @Test
    void sessionChannelsKeepPublicAndEmployeeAuthoritySeparated() {
        assertThat(KioskExecutionChannels.persistedSessionChannel(
            KioskExecutionChannels.LEGACY_PUBLIC_LINK))
            .isEqualTo(KioskExecutionChannels.PUBLIC_LINK);
        assertThat(KioskExecutionChannels.persistedSessionChannel(
            KioskExecutionChannels.AUTHENTICATED_WEB))
            .isEqualTo(KioskExecutionChannels.AUTHENTICATED_WEB);
        assertThat(KioskExecutionChannels.persistedSessionChannel(
            KioskExecutionChannels.MOBILE_MULTI_KIOSK))
            .isEqualTo(KioskExecutionChannels.MOBILE_MULTI_KIOSK);
        assertThatThrownBy(() -> KioskExecutionChannels.persistedSessionChannel("FORGED_CHANNEL"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Unsupported kiosk execution channel.");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void authenticatedWebSessionDoesNotTreatMultiKioskCompositionAsAGrant() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"process-tasks.tasks.read@1\"]", 60 * 60);
        lenient().when(rs.getString("identity_type")).thenReturn("USER");
        lenient().when(rs.getLong("identity_id")).thenReturn(9L);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
        });
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(0);

        assertThatThrownBy(() -> service.requireSession(
            definition(), capability(), Map.of("kiosk_session_token", "mobile-child-token"),
            "browser-17", KioskExecutionChannels.AUTHENTICATED_WEB))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk grant is not active.");

        assertThat(explicitGrantQuerySql())
            .contains("FROM kiosk_grants")
            .doesNotContain("multi_kiosk_items", "multi_kiosk_assignments");
        verify(jdbcTemplate, never()).update(
            contains("last_activity_at = CURRENT_TIMESTAMP"), any(Object[].class));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void pettyCashKeepsAnActiveWorkSessionForFifteenMinutes() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"process-tasks.tasks.read@1\"]", 60 * 60);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
        given(jdbcTemplate.queryForObject(
            contains("FROM kiosk_grants"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(1);

        var session = service.requireSession(
            pettyCashDefinition(), capability(), Map.of("identification_token", "raw-token"), null);

        assertThat(session.sessionId()).isEqualTo("session-1");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void expensesUsesDatabaseTimeToEnforceItsFiveMinuteInactivityWindow() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThatThrownBy(() -> service.requireSession(
            expensesDefinition(), capability(), Map.of("identification_token", "raw-token"), null))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk authentication is required.");

        assertThat(wasQueryCalled("last_activity_at >= TIMESTAMPADD(SECOND, ?, CURRENT_TIMESTAMP)"))
            .isTrue();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void employeeCenterUsesTheEightHourWorkdayInactivityWindow() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThatThrownBy(() -> service.requireAuthenticatedIndexSession(
            definition(), "employee-session-token", "browser-17", 81L))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Employee kiosk authentication is required.");

        var invocation = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(candidate -> "query".equals(candidate.getMethod().getName()))
            .filter(candidate -> String.valueOf((Object) candidate.getArgument(0))
                .contains("channel = 'AUTHENTICATED_WEB'"))
            .findFirst()
            .orElseThrow();
        var arguments = invocation.getArguments();
        assertThat(arguments).hasSize(6);
        assertThat(arguments[5]).isEqualTo(-28800L);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void mobileChildSessionIsBoundToTheMultiKioskThatLaunchedIt() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThatThrownBy(() -> service.requireMobileMultiKioskSession(
            definition(), 44L, "mobile-child-token", "browser-17", 81L, 91L))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Mobile kiosk authentication is required.");

        var invocation = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(candidate -> "query".equals(candidate.getMethod().getName()))
            .filter(candidate -> String.valueOf((Object) candidate.getArgument(0))
                .contains("channel = 'MOBILE_MULTI_KIOSK'"))
            .findFirst()
            .orElseThrow();
        assertThat(String.valueOf((Object) invocation.getArgument(0)))
            .contains("$.multi_kiosk_id");
        assertThat(invocation.getArguments()[5]).isEqualTo(44L);
        assertThat(invocation.getArguments()[6]).isEqualTo(-28800L);
    }

    @Test
    void createsAChildSessionForTheExactActiveCompanyMembershipWithoutAssignmentOrParentScope() {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        given(jdbcTemplate.queryForObject(
            contains("FROM multi_kiosk_items"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(1);

        var launch = service.createMobileMultiKioskSession(
            definition(), 44L, 81L, 91L, "browser-17",
            Set.of("process-tasks.tasks.read@1"));

        assertThat(launch.session().identityId()).isEqualTo(81L);
        assertThat(wasUpdateCalled("INSERT INTO kiosk_sessions")).isTrue();
        assertCompanyMembershipCompositionQuery(44L, 7L, 91L, 81L, 17L);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void refusesToUseAChildSessionWhenCompanyMembershipOrCompositionNoLongerMatches() throws Exception {
        var service = new KioskSessionService(jdbcTemplate, new ObjectMapper());
        var rs = sessionRow("[\"process-tasks.tasks.read@1\"]", 300);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
        given(jdbcTemplate.queryForObject(
            contains("FROM multi_kiosk_items"), org.mockito.ArgumentMatchers.eq(Integer.class),
            any(Object[].class))).willReturn(0);

        assertThatThrownBy(() -> service.requireMobileMultiKioskSession(
            definition(), 44L, "mobile-child-token", "browser-17", 81L, 91L))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Mobile kiosk authentication is required.");

        assertCompanyMembershipCompositionQuery(44L, 7L, 91L, 81L, 17L);
        verify(jdbcTemplate, never()).update(
            contains("last_activity_at = CURRENT_TIMESTAMP"), any(Object[].class));
    }

    private ResultSet sessionRow(String capabilities, long expiresInSeconds) throws Exception {
        var rs = mock(ResultSet.class);
        lenient().when(rs.getString("session_id")).thenReturn("session-1");
        lenient().when(rs.getLong("kiosk_definition_id")).thenReturn(17L);
        lenient().when(rs.getLong("company_id")).thenReturn(7L);
        lenient().when(rs.getString("identity_type")).thenReturn("EMPLOYEE");
        lenient().when(rs.getLong("identity_id")).thenReturn(81L);
        lenient().when(rs.getString("granted_capabilities_json")).thenReturn(capabilities);
        given(rs.getLong("expires_in_seconds")).willReturn(expiresInSeconds);
        given(rs.getString("browser_session_hash")).willReturn(null);
        return rs;
    }

    private KioskCapabilityDescriptor capability() {
        return new KioskCapabilityDescriptor(
            "process-tasks.tasks.read", 1, "PROCESS_TASKS",
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED,
            false, false);
    }

    private KioskCapabilityDescriptor supplierCapability() {
        return new KioskCapabilityDescriptor(
            "procurement.catalog.read", 1, "PROCUREMENT",
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED,
            true, false);
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, "PROCESS_TASKS", "task_access", 31L, "TASKS", "Tasks",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", false, 1, 1);
    }

    private KioskResolvedDefinition supplierDefinition() {
        return new KioskResolvedDefinition(
            18L, 7L, "PROCUREMENT", "supplier_portal", 32L,
            "SUPPLIER-PORTAL-32", "Supplier", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
    }

    private KioskResolvedDefinition pettyCashDefinition() {
        return new KioskResolvedDefinition(
            19L, 7L, "PETTY_CASH", "receipt_capture", 33L,
            "PETTY-CASH-33", "Petty cash", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
    }

    private KioskResolvedDefinition expensesDefinition() {
        return new KioskResolvedDefinition(
            20L, 7L, "EXPENSES", "accounts_payable", 34L,
            "EXPENSES-34", "Expenses", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
    }

    private boolean wasUpdateCalled(String sqlFragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .anyMatch(sql -> sql.contains(sqlFragment));
    }

    private boolean wasQueryCalled(String sqlFragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "query".equals(invocation.getMethod().getName()))
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .anyMatch(sql -> sql.contains(sqlFragment));
    }

    private String explicitGrantQuerySql() {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "queryForObject".equals(invocation.getMethod().getName()))
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .filter(sql -> sql.contains("FROM kiosk_grants"))
            .findFirst()
            .orElseThrow();
    }

    private void assertCompanyMembershipCompositionQuery(
            long multiKioskId,
            long companyId,
            long userCompanyId,
            long userId,
            long kioskDefinitionId) {
        var invocation = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(candidate -> "queryForObject".equals(candidate.getMethod().getName()))
            .filter(candidate -> String.valueOf((Object) candidate.getArgument(0))
                .contains("FROM multi_kiosk_items"))
            .findFirst()
            .orElseThrow();
        var sql = String.valueOf((Object) invocation.getArgument(0));
        assertThat(sql)
            .contains(
                "parent.id = ?",
                "parent.company_id = ?",
                "parent.status = 'ACTIVE'",
                "parent.expires_at IS NULL OR parent.expires_at > CURRENT_TIMESTAMP",
                "membership.id = ?",
                "membership.company_id = parent.company_id",
                "membership.user_id = ?",
                "membership.status, 'active'",
                "item.kiosk_definition_id = ?")
            .doesNotContain(
                "multi_kiosk_assignments",
                "user_work_profiles",
                "parent.unit_id",
                "parent.business_id");
        assertThat(List.of(invocation.getArguments()))
            .containsSubsequence(
                multiKioskId, companyId, userCompanyId, userId, kioskDefinitionId);
    }
}
