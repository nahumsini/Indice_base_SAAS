package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.billing.storage.StorageQuotaService;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class PlatformCompanyDetailContractTest {
    @Test @SuppressWarnings({ "rawtypes", "unchecked" })
    void detailUsesTheScopedSummaryMapperForLifecycleBenefitsAndLocalTrialDates() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        var access = mock(PlatformAdminAccessService.class);
        var storage = mock(StorageQuotaService.class);
        var service = new PlatformAdminService(jdbc, access, mock(PlatformAuditService.class),
            mock(CompanyEntitlementProjectionService.class), storage, mock(CommercialOfferSelectionService.class),
            Clock.fixed(Instant.parse("2026-09-13T00:00:00Z"), ZoneOffset.UTC));
        var rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(41L);
        when(rs.getString("name")).thenReturn("Customer");
        when(rs.getString("platform_status")).thenReturn("DELETED");
        when(rs.getString("commercial_account_type")).thenReturn("SUPER_ADMIN");
        when(rs.getString("user_type")).thenReturn("SUPER_ADMIN");
        when(rs.getInt("active_benefits")).thenReturn(2);
        when(rs.getTimestamp("local_demo_ends_at")).thenReturn(Timestamp.from(Instant.parse("2026-09-27T00:00:00Z")));
        when(storage.snapshot(41)).thenReturn(new StorageQuotaService.StorageSnapshot(41, false, false, 0, 0, 0, 0, 0, 0));
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenAnswer(call -> {
            String sql = call.getArgument(0);
            if (sql.contains("SELECT company.id, company.name, company.public_demo_enabled")) {
                assertThat(sql).contains("WHERE company.id = ?");
                assertThat(call.getArgument(2, Object.class)).isEqualTo(41L);
                return List.of(((RowMapper) call.getArgument(1)).mapRow(rs, 0));
            }
            return List.of();
        });

        var detail = service.company(9L, 41L);
        assertThat(detail).containsEntry("platform_status", "DELETED")
            .containsEntry("commercial_account_type", "SUPER_ADMIN")
            .containsEntry("active_benefits", 2)
            .containsEntry("trial_source", "LOCAL_DEMO")
            .containsEntry("trial_ends_at", Instant.parse("2026-09-27T00:00:00Z"))
            .containsEntry("billing_amount_kind", "UNAVAILABLE")
            .containsKey("billing_amount_cents")
            .containsKey("seat_usage").containsKey("invoices");
        verify(access).require(9L, "PLATFORM_VIEW");
    }
}
