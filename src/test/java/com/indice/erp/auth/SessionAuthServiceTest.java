package com.indice.erp.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.subscription.CompanySubscriptionStatus;
import java.time.Duration;
import java.time.Instant;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class SessionAuthServiceTest {

    @Test
    void localDemoPasswordHashMatchesDocumentedPassword() {
        var encoder = new BCryptPasswordEncoder();

        assertTrue(encoder.matches(
            "demo123",
            "$2a$12$r4v9ajhCqzMS9en6YqQCuOYnQy.y3GEMpSoaFVfW0i9YvN1ub/8xy"
        ));
    }

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Test
    void loginJsonSelectsCompanyByEnteredCompanyName() throws Exception {
        var service = new SessionAuthService(jdbcTemplate, passwordEncoder);
        var session = new MockHttpSession();

        when(jdbcTemplate.query(
            contains("FROM users"),
            ArgumentMatchers.any(RowMapper.class),
            eq("demo@example.com")
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(5L);
            when(rs.getString("email")).thenReturn("demo@example.com");
            when(rs.getString("password_hash")).thenReturn("hash");
            when(rs.getString("full_name")).thenReturn("Demo User");
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(passwordEncoder.matches("demo123", "hash")).thenReturn(true);
        when(jdbcTemplate.query(
            contains("JOIN companies"),
            ArgumentMatchers.any(RowMapper.class),
            eq(5L),
            eq("empresa demo spring")
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(11L);
            when(rs.getLong("company_id")).thenReturn(7L);
            when(rs.getString("role")).thenReturn("admin");
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var result = service.loginJson(" Empresa Demo Spring ", "DEMO@example.com", "demo123", session);

        assertTrue(result.success());
        assertEquals(5L, session.getAttribute(SessionAuthService.SESSION_USER_ID));
        assertEquals(7L, session.getAttribute(SessionAuthService.SESSION_COMPANY_ID));
        assertEquals(11L, session.getAttribute(SessionAuthService.SESSION_USER_COMPANY_ID));
        assertEquals("Demo User", session.getAttribute(SessionAuthService.SESSION_USER_NAME));
        assertEquals("admin", session.getAttribute(SessionAuthService.SESSION_ROLE));
        assertEquals(7_200, session.getMaxInactiveInterval());
    }

    @Test
    void currentSessionIncludesModuleAndTabAccess() {
        var service = new SessionAuthService(jdbcTemplate, passwordEncoder);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 5L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Access User");
        session.setAttribute(SessionAuthService.SESSION_ROLE, "admin");

        when(jdbcTemplate.query(
            contains("SELECT id, COALESCE(role"),
            ArgumentMatchers.any(RowMapper.class),
            eq(5L),
            eq(7L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(11L);
            when(rs.getString("role")).thenReturn("admin");
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(jdbcTemplate.query(
            ArgumentMatchers.argThat((String sql) ->
                sql != null && sql.contains("SELECT id") && sql.contains("FROM user_companies")
                    && !sql.contains("COALESCE(role")
            ),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(5L),
            eq(7L)
        )).thenReturn(List.of(11L));
        when(jdbcTemplate.query(
            contains("FROM company_module_entitlements"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(7L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<String>) invocation.getArgument(1);
            var rows = new ArrayList<String>();
            rows.add(mapStringRow(rowMapper, "home-panel"));
            rows.add(mapStringRow(rowMapper, "human-resources"));
            return rows;
        });
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(11L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<String>) invocation.getArgument(1);
            var rows = new ArrayList<String>();
            rows.add(mapStringRow(rowMapper, "home-panel"));
            rows.add(mapStringRow(rowMapper, "human-resources"));
            return rows;
        });
        when(jdbcTemplate.query(
            contains("FROM user_company_tab_permissions"),
            ArgumentMatchers.<RowMapper<String>>any(),
            eq(11L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<String>) invocation.getArgument(1);
            var rows = new ArrayList<String>();
            rows.add(mapTabPermissionRow(rowMapper, "home-panel", "profile"));
            rows.add(mapTabPermissionRow(rowMapper, "human-resources", "attendance"));
            return rows;
        });
        when(jdbcTemplate.queryForObject(
            contains("COUNT(*) FROM user_company_tab_permissions"),
            eq(Long.class),
            eq(11L)
        )).thenReturn(12L);
        stubCompanyMemberships(5L, List.of(new MembershipRow(
            11L,
            7L,
            "Corazón del Caribe",
            "admin",
            null,
            null
        )));

        var current = service.currentSession(session);

        assertTrue(current.isPresent());
        assertEquals(List.of("config_center", "human_resources"), current.get().user().module_slugs());
        assertEquals(List.of("config_center.profile", "human_resources.attendance"), current.get().user().tab_permission_keys());
        assertTrue(current.get().user().tab_permissions_configured());
        assertEquals("Corazón del Caribe", current.get().company().name());
        assertEquals("SUPER_ADMIN", current.get().company().commercial_account_type());
        assertEquals("corporate_office", current.get().company().scope().type());
        assertTrue(current.get().company().subscription().access_allowed());
        assertEquals(1, current.get().companies().size());
        assertEquals(11L, session.getAttribute(SessionAuthService.SESSION_USER_COMPANY_ID));
    }

    @Test
    void switchActiveCompanyOnlyAcceptsAnActiveMembership() {
        var service = new SessionAuthService(jdbcTemplate, passwordEncoder);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 5L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        session.setAttribute(SessionAuthService.SESSION_ROLE, "root");
        session.setMaxInactiveInterval(1_800);
        stubCompanyMemberships(5L, List.of(
            new MembershipRow(11L, 7L, "Empresa Uno", "admin", null, null),
            new MembershipRow(12L, 9L, "Empresa Dos", "user", 20L, 30L)
        ));

        assertTrue(service.switchActiveCompany(session, 9L));
        assertEquals(9L, session.getAttribute(SessionAuthService.SESSION_COMPANY_ID));
        assertEquals(12L, session.getAttribute(SessionAuthService.SESSION_USER_COMPANY_ID));
        assertEquals("user", session.getAttribute(SessionAuthService.SESSION_ROLE));
        assertEquals(7_200, session.getMaxInactiveInterval());
    }

    @ParameterizedTest
    @CsvSource({
        "root,1800",
        "superadmin,3600",
        "owner,3600",
        "dueno,3600",
        "admin,7200",
        "manager,7200",
        "approver,7200",
        "contributor,7200",
        "viewer,7200",
        "user,7200",
        "unexpected,1800"
    })
    void storeAuthenticatedSessionUsesRoleIdleTimeout(String role, int expectedSeconds) {
        var service = serviceWith(LoginAuditService.noop(), new AuthSecurityProperties(), new MutableClock(Instant.now()));
        var session = new MockHttpSession();

        service.storeAuthenticatedSession(session, loginWithRole(role));

        assertEquals(expectedSeconds, session.getMaxInactiveInterval());
    }

    @ParameterizedTest
    @CsvSource({
        "root,1800",
        "superadmin,3600",
        "admin,7200",
        "user,7200",
        "unexpected,1800"
    })
    void enforceSessionTimeoutAllowsRoleAtIdleBoundary(String role, int idleSeconds) {
        var clock = new MutableClock(Instant.parse("2026-08-18T12:00:00Z"));
        var service = serviceWith(LoginAuditService.noop(), new AuthSecurityProperties(), clock);
        var session = activeSession(role, clock.instant());

        clock.advance(Duration.ofSeconds(idleSeconds));

        assertTrue(service.enforceSessionTimeout(session, LoginAuditContext.empty()));
        assertFalse(session.isInvalid());
        assertEquals(idleSeconds, session.getMaxInactiveInterval());
    }

    @Test
    void switchActiveCompanyRejectsACompanyOutsideTheUserMemberships() {
        var service = new SessionAuthService(jdbcTemplate, passwordEncoder);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 5L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        stubCompanyMemberships(5L, List.of(
            new MembershipRow(11L, 7L, "Empresa Uno", "admin", null, null)
        ));

        assertFalse(service.switchActiveCompany(session, 99L));
        assertEquals(7L, session.getAttribute(SessionAuthService.SESSION_COMPANY_ID));
    }

    @Test
    void currentUserReturnsEmptyWhenStoredSessionIsNoLongerActive() {
        var service = new SessionAuthService(jdbcTemplate, passwordEncoder);
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 5L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        session.setAttribute(SessionAuthService.SESSION_USER_NAME, "Inactive User");
        session.setAttribute(SessionAuthService.SESSION_ROLE, "admin");

        when(jdbcTemplate.query(
            contains("SELECT id, COALESCE(role"),
            ArgumentMatchers.any(RowMapper.class),
            eq(5L),
            eq(7L)
        )).thenReturn(List.of());

        assertTrue(service.currentUser(session).isEmpty());
        assertTrue(session.isInvalid());
    }

    @ParameterizedTest
    @CsvSource({
        "root,1800",
        "superadmin,3600",
        "admin,7200",
        "user,7200",
        "unexpected,1800"
    })
    void enforceSessionTimeoutInvalidatesRoleIdleSessionAndAuditsIt(String role, int idleSeconds) {
        var auditService = mock(LoginAuditService.class);
        var clock = new MutableClock(Instant.parse("2026-08-18T12:00:00Z"));
        var service = serviceWith(auditService, new AuthSecurityProperties(), clock);
        var session = activeSession(role, clock.instant());

        clock.advance(Duration.ofSeconds(idleSeconds + 1L));

        assertFalse(service.enforceSessionTimeout(session, new LoginAuditContext("127.0.0.1", "JUnit", "session-1")));
        assertTrue(session.isInvalid());
        verify(auditService).record(ArgumentMatchers.argThat(event ->
            "SESSION_TIMEOUT".equals(event.eventType())
                && "BLOCKED".equals(event.outcome())
                && AuthFailureReason.SESSION_IDLE_TIMEOUT.equals(event.failureReasonCode())
                && event.userId().equals(5L)
                && event.companyId().equals(7L)
                && event.userCompanyId().equals(11L)
        ));
    }

    @Test
    void enforceSessionTimeoutStillHonorsAbsoluteTimeout() {
        var auditService = mock(LoginAuditService.class);
        var properties = new AuthSecurityProperties();
        properties.setSessionAbsoluteTimeoutSeconds(7_200);
        var base = Instant.parse("2026-08-18T12:00:00Z");
        var clock = new MutableClock(base);
        var service = serviceWith(auditService, properties, clock);
        var session = activeSession("root", base);
        session.setAttribute(SessionAuthService.SESSION_LAST_SEEN_AT, base.plusSeconds(7_200));

        clock.advance(Duration.ofSeconds(7_201));

        assertFalse(service.enforceSessionTimeout(session, LoginAuditContext.empty()));
        verify(auditService).record(ArgumentMatchers.argThat(event ->
            AuthFailureReason.SESSION_ABSOLUTE_TIMEOUT.equals(event.failureReasonCode())
        ));
    }

    private SessionAuthService serviceWith(
        LoginAuditService auditService,
        AuthSecurityProperties properties,
        MutableClock clock
    ) {
        return new SessionAuthService(
            jdbcTemplate,
            passwordEncoder,
            auditService,
            companyId -> CompanySubscriptionStatus.activeLegacy(),
            properties,
            clock
        );
    }

    private AuthenticatedLogin loginWithRole(String role) {
        return new AuthenticatedLogin(5L, 7L, 11L, "Session User", "session@example.com", "Indice", role);
    }

    private MockHttpSession activeSession(String role, Instant timestamp) {
        var session = new MockHttpSession();
        session.setAttribute(SessionAuthService.SESSION_USER_ID, 5L);
        session.setAttribute(SessionAuthService.SESSION_COMPANY_ID, 7L);
        session.setAttribute(SessionAuthService.SESSION_USER_COMPANY_ID, 11L);
        session.setAttribute(SessionAuthService.SESSION_ROLE, role);
        session.setAttribute(SessionAuthService.SESSION_CREATED_AT, timestamp);
        session.setAttribute(SessionAuthService.SESSION_LAST_SEEN_AT, timestamp);
        return session;
    }

    private String mapStringRow(RowMapper<String> rowMapper, String moduleSlug) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("module_slug")).thenReturn(moduleSlug);
        return rowMapper.mapRow(rs, 0);
    }

    private String mapTabPermissionRow(RowMapper<String> rowMapper, String moduleSlug, String tabKey) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("module_slug")).thenReturn(moduleSlug);
        when(rs.getString("tab_key")).thenReturn(tabKey);
        return rowMapper.mapRow(rs, 0);
    }

    private void stubCompanyMemberships(long userId, List<MembershipRow> memberships) {
        when(jdbcTemplate.query(
            contains("FROM user_companies uc"),
            ArgumentMatchers.any(RowMapper.class),
            eq(userId)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rows = new ArrayList<Object>();
            for (var membership : memberships) {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getLong("user_company_id")).thenReturn(membership.userCompanyId());
                when(rs.getLong("company_id")).thenReturn(membership.companyId());
                when(rs.getString("company_name")).thenReturn(membership.companyName());
                when(rs.getString("commercial_account_type")).thenReturn("SUPER_ADMIN");
                when(rs.getString("role")).thenReturn(membership.role());
                when(rs.getObject("unit_id", Long.class)).thenReturn(membership.unitId());
                when(rs.getObject("business_id", Long.class)).thenReturn(membership.businessId());
                rows.add(rowMapper.mapRow(rs, rows.size()));
            }
            return rows;
        });
    }

    private record MembershipRow(
        long userCompanyId,
        long companyId,
        String companyName,
        String role,
        Long unitId,
        Long businessId
    ) {
    }
}
