package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
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

@ExtendWith(MockitoExtension.class)
class MultiKioskServiceLogoutTest {

    private static final String PUBLIC_TOKEN = "public-token-secret";
    private static final String SESSION_TOKEN = "parent-session-secret";
    private static final String BROWSER_REFERENCE = "browser-session-secret";

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private KioskPayloadProtectionService protection;
    @Mock
    private KioskEmployeeAccessService employeeAccess;
    @Mock
    private KioskEmployeeToolCatalogService employeeTools;
    @Mock
    private KioskMultiDashboardService dashboard;
    @Mock
    private KioskRateLimitService rateLimits;
    private MultiKioskService service;

    @BeforeEach
    void setUp() {
        service = new MultiKioskService(
            jdbcTemplate, new ObjectMapper(), new BCryptPasswordEncoder(), protection,
            employeeAccess, employeeTools, dashboard, rateLimits, 28_800, 43_200);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void revokesOnlyTheCurrentParentAndSafelyCorrelatedChildrenWithoutPersistingRawSecrets()
            throws Exception {
        stubDefinitionAndSessionRows();
        given(jdbcTemplate.update(anyString(), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                if (sql.contains("UPDATE multi_kiosk_sessions")) return 1;
                if (sql.contains("UPDATE kiosk_sessions child")) return 2;
                return 1;
            });

        var result = service.logout(PUBLIC_TOKEN, SESSION_TOKEN, BROWSER_REFERENCE);

        assertThat(result).containsExactly(Map.entry("signed_out", true));
        assertThat(wasSqlCalled("UPDATE multi_kiosk_sessions")).isTrue();
        assertThat(wasSqlCalled("session_id = ? AND multi_kiosk_id = ? AND company_id = ?"))
            .isTrue();
        assertThat(wasSqlCalled("access_token_hash = ? AND browser_session_hash = ?"))
            .isTrue();
        assertThat(wasSqlCalled("UPDATE kiosk_sessions child")).isTrue();
        assertThat(wasSqlCalled("child.company_id = ?")).isTrue();
        assertThat(wasSqlCalled("child.identity_type = 'USER' AND child.identity_id = ?"))
            .isTrue();
        assertThat(wasSqlCalled("'$.multi_kiosk_id'")).isTrue();
        assertThat(wasSqlCalled("'$.user_company_id'")).isTrue();
        assertThat(wasSqlCalled("INSERT INTO multi_kiosk_audit_events")).isTrue();
        assertThat(allArguments()).doesNotContain(PUBLIC_TOKEN, SESSION_TOKEN, BROWSER_REFERENCE);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void repeatedLogoutIsSuccessfulWithoutDuplicatingTheCloseAudit() throws Exception {
        stubDefinitionAndSessionRows();
        given(jdbcTemplate.update(anyString(), any(Object[].class))).willReturn(0);

        var result = service.logout(PUBLIC_TOKEN, SESSION_TOKEN, BROWSER_REFERENCE);

        assertThat(result).containsExactly(Map.entry("signed_out", true));
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO multi_kiosk_audit_events"),
            any(Object[].class));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void failsClosedWhenTheSessionTokenAndBrowserDoNotResolveInsideTheParentTenant()
            throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                if (sql.contains("FROM multi_kiosk_definitions")) {
                    var mapper = (RowMapper) invocation.getArgument(1);
                    return List.of(mapper.mapRow(definitionResultSet(), 0));
                }
                return List.of();
            });

        assertThatThrownBy(() -> service.logout(
            PUBLIC_TOKEN, "other-session-token", "other-browser"))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Session required.");

        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void stubDefinitionAndSessionRows() throws Exception {
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("FROM multi_kiosk_definitions")) {
                    return List.of(mapper.mapRow(definitionResultSet(), 0));
                }
                if (sql.contains("FROM multi_kiosk_sessions")) {
                    var rs = mock(ResultSet.class);
                    given(rs.getString("session_id")).willReturn("parent-session-id");
                    given(rs.getString("identity_type")).willReturn("EMPLOYEE");
                    given(rs.getLong("identity_id")).willReturn(91L);
                    given(rs.getLong("user_id")).willReturn(81L);
                    given(rs.getLong("user_company_id")).willReturn(91L);
                    return List.of(mapper.mapRow(rs, 0));
                }
                return List.of();
            });
    }

    private ResultSet definitionResultSet() throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("id")).willReturn(44L);
        given(rs.getLong("company_id")).willReturn(7L);
        given(rs.getString("name")).willReturn("Operations");
        given(rs.getString("description")).willReturn("Employee launcher");
        given(rs.getString("audience_type")).willReturn("EMPLOYEE");
        given(rs.getBoolean("allow_provider_registration")).willReturn(false);
        given(rs.getString("status")).willReturn("ACTIVE");
        given(rs.getObject("unit_id", Long.class)).willReturn(2L);
        given(rs.getObject("business_id", Long.class)).willReturn(3L);
        given(rs.getString("theme_key")).willReturn("indice-blue");
        given(rs.getString("default_locale")).willReturn("es-MX");
        given(rs.getTimestamp("expires_at"))
            .willReturn(Timestamp.from(Instant.now().plusSeconds(3_600)));
        return rs;
    }

    private boolean wasSqlCalled(String fragment) {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> invocation.getArguments().length > 0)
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .anyMatch(sql -> sql.contains(fragment));
    }

    private List<Object> allArguments() {
        return org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .flatMap(invocation -> Arrays.stream(invocation.getArguments()))
            .flatMap(argument -> argument instanceof Object[] values
                ? Arrays.stream(values)
                : java.util.stream.Stream.of(argument))
            .toList();
    }
}
