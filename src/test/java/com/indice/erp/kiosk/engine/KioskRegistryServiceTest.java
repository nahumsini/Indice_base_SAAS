package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class KioskRegistryServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private KioskRegistryService service;

    @BeforeEach
    void setUp() {
        service = new KioskRegistryService(jdbcTemplate, new ObjectMapper());
    }

    @Test
    void resolvesByHashWithoutSendingRawTokenToPersistence() throws Exception {
        var persistedHash = new AtomicReference<String>();
        stubDefinition(KioskDefinitionStatus.ACTIVE, null, persistedHash);

        var definition = service.resolvePublic("PROCESS_TASKS", "raw-public-token");

        assertThat(definition.id()).isEqualTo(17L);
        assertThat(persistedHash.get()).hasSize(64).doesNotContain("raw-public-token");
    }

    @Test
    void expiredDefinitionIsMaterializedRevokesSessionsAndLooksMissingPublicly() throws Exception {
        stubDefinition(KioskDefinitionStatus.ACTIVE, Instant.now().minusSeconds(5), new AtomicReference<>());

        assertThatThrownBy(() -> service.resolvePublic("PROCESS_TASKS", "raw-public-token"))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");

        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("SET status = 'EXPIRED'"), any(Object[].class));
        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("UPDATE kiosk_sessions"), any(Object[].class));
        verify(jdbcTemplate, atLeastOnce()).update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_audit_events"), any(Object[].class));
    }

    @Test
    void disabledAndUnknownDefinitionsShareTheSamePublicFailure() throws Exception {
        stubDefinition(KioskDefinitionStatus.DISABLED, null, new AtomicReference<>());
        assertThatThrownBy(() -> service.resolvePublic("PROCESS_TASKS", "disabled-token"))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");

        org.mockito.Mockito.reset(jdbcTemplate);
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class))).willReturn(List.of());
        assertThatThrownBy(() -> service.resolvePublic("PROCESS_TASKS", "unknown-token"))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubDefinition(
            KioskDefinitionStatus status,
            Instant expiresAt,
            AtomicReference<String> persistedHash) throws Exception {
        var rs = mock(ResultSet.class);
        org.mockito.BDDMockito.given(rs.getLong("id")).willReturn(17L);
        org.mockito.BDDMockito.given(rs.getLong("company_id")).willReturn(7L);
        org.mockito.BDDMockito.given(rs.getString("owner_module")).willReturn("PROCESS_TASKS");
        org.mockito.BDDMockito.given(rs.getString("kiosk_type")).willReturn("task_access");
        org.mockito.BDDMockito.given(rs.getObject("legacy_reference_id", Long.class)).willReturn(31L);
        org.mockito.BDDMockito.given(rs.getString("code")).willReturn("TASKS");
        org.mockito.BDDMockito.given(rs.getString("name")).willReturn("Tasks");
        org.mockito.BDDMockito.given(rs.getString("status")).willReturn(status.name());
        org.mockito.BDDMockito.given(rs.getObject("unit_id", Long.class)).willReturn(2L);
        org.mockito.BDDMockito.given(rs.getObject("business_id", Long.class)).willReturn(3L);
        org.mockito.BDDMockito.given(rs.getObject("location_id", Long.class)).willReturn(null);
        org.mockito.BDDMockito.given(rs.getString("access_level")).willReturn("CONTROLLED");
        org.mockito.BDDMockito.given(rs.getTimestamp("expires_at"))
            .willReturn(expiresAt == null ? null : Timestamp.from(expiresAt));
        org.mockito.BDDMockito.given(rs.getString("public_token_hint")).willReturn("kenhint");
        org.mockito.BDDMockito.given(rs.getBoolean("legacy_token_recoverable")).willReturn(false);
        org.mockito.BDDMockito.given(rs.getInt("configuration_version")).willReturn(1);
        org.mockito.BDDMockito.given(rs.getInt("adapter_version")).willReturn(1);

        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class))).willAnswer(invocation -> {
                var arguments = invocation.getArguments();
                var last = arguments[arguments.length - 1];
                if (last instanceof Object[] values && values.length > 0) {
                    last = values[values.length - 1];
                }
                persistedHash.set(String.valueOf(last));
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
    }
}
