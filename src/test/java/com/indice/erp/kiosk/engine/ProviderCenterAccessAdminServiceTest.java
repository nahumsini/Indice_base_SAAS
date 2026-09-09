package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.sql.ResultSet;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class ProviderCenterAccessAdminServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private BCryptPasswordEncoder passwordEncoder;
    @Mock private KioskIdentityCredentialService credentials;

    private ProviderCenterAccessAdminService service;

    @BeforeEach
    void setUp() {
        service = new ProviderCenterAccessAdminService(
            jdbcTemplate, passwordEncoder, credentials);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void rootIssuanceCreatesOneTimeSixDigitCentralCredential() throws Exception {
        given(jdbcTemplate.queryForObject(
            contains("FROM multi_kiosk_definitions"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var sql = String.valueOf((Object) invocation.getArgument(0));
                var mapper = (RowMapper) invocation.getArgument(1);
                if (sql.contains("FROM finance_providers") && sql.contains("FOR UPDATE")) {
                    return List.of(mapper.mapRow(providerRow(), 0));
                }
                return List.of();
            });
        given(passwordEncoder.encode(anyString())).willReturn("central-hash");

        var result = service.issueOrRotate(7L, 44L, 80L, 9L);

        assertThat(result)
            .containsEntry("provider_id", 80L)
            .containsEntry("provider_name", "Proveedor Uno")
            .containsEntry("shown_once", true);
        assertThat(String.valueOf(result.get("pin"))).matches("^[0-9]{6}$");
        verify(credentials).rotateProviderCenterPin(7L, 80L, "central-hash");
        verify(jdbcTemplate).update(
            contains("INSERT INTO multi_kiosk_audit_events"), any(Object[].class));
    }

    @Test
    void centralRevocationUsesTheProviderCenterCredentialBoundary() {
        given(jdbcTemplate.queryForObject(
            contains("FROM multi_kiosk_definitions"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);
        given(jdbcTemplate.queryForObject(
            contains("FROM finance_providers"), eq(Integer.class), any(Object[].class)))
            .willReturn(1);

        var result = service.revoke(7L, 44L, 80L, 9L);

        assertThat(result).containsEntry("pin_ready", false).containsEntry("success", true);
        verify(credentials).revokeProviderCenterPin(7L, 80L);
        verify(jdbcTemplate).update(
            contains("INSERT INTO multi_kiosk_audit_events"), any(Object[].class));
    }

    private ResultSet providerRow() throws Exception {
        var rs = org.mockito.Mockito.mock(ResultSet.class);
        given(rs.getLong("id")).willReturn(80L);
        given(rs.getString("name")).willReturn("Proveedor Uno");
        given(rs.getObject("unit_id", Long.class)).willReturn(3L);
        given(rs.getObject("business_id", Long.class)).willReturn(4L);
        return rs;
    }
}
