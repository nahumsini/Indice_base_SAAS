package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class KioskEngineMaintenanceJobTest {

    @Test
    void deletesExpiredIdempotencyRecords() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.update("DELETE FROM kiosk_engine_idempotency WHERE expires_at < CURRENT_TIMESTAMP"))
                .thenReturn(3);

        var deleted = new KioskEngineMaintenanceJob(jdbcTemplate).deleteExpiredIdempotencyRecords();

        assertThat(deleted).isEqualTo(3);
        verify(jdbcTemplate).update("DELETE FROM kiosk_engine_idempotency WHERE expires_at < CURRENT_TIMESTAMP");
    }

    @Test
    void deletesStaleRateLimitBuckets() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        var sql = "DELETE FROM kiosk_engine_rate_limit_buckets WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL 1 DAY";
        when(jdbcTemplate.update(sql)).thenReturn(4);

        var deleted = new KioskEngineMaintenanceJob(jdbcTemplate).deleteStaleRateLimitBuckets();

        assertThat(deleted).isEqualTo(4);
        verify(jdbcTemplate).update(sql);
    }

    @Test
    void expiresSupplierPortalSessionsAtFifteenMinutesWhileKeepingDefaultAtThree() {
        var jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.update(anyString())).thenReturn(0, 2);

        var expired = new KioskEngineMaintenanceJob(jdbcTemplate).expireSessions();

        assertThat(expired).isEqualTo(2);
        var sql = org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .filter(invocation -> "update".equals(invocation.getMethod().getName()))
            .map(invocation -> String.valueOf((Object) invocation.getArgument(0)))
            .toList();
        assertThat(sql).hasSize(2).allSatisfy(statement -> {
            assertThat(statement).contains("definition.owner_module = 'PROCUREMENT'");
            assertThat(statement).contains("definition.kiosk_type = 'supplier_portal'");
            assertThat(statement).contains("INTERVAL 15 MINUTE");
            assertThat(statement).contains("INTERVAL 3 MINUTE");
        });
    }
}
