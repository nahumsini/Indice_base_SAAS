package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.storage.StorageQuotaService;
import com.indice.erp.billing.catalog.CommercialOfferSelectionService;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class PlatformAdminDistributorAssignmentServiceTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private PlatformAdminAccessService access;
    @Mock
    private PlatformAuditService audit;
    @Mock
    private CompanyEntitlementProjectionService entitlementProjection;
    @Mock
    private StorageQuotaService storageQuota;
    @Mock
    private CommercialOfferSelectionService commercialOffers;

    private PlatformAdminService service;

    @BeforeEach
    void setUp() {
        service = new PlatformAdminService(
            jdbc,
            access,
            audit,
            entitlementProjection,
            storageQuota,
            commercialOffers,
            Clock.systemUTC()
        );
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void assignsARealDistributorAndAuditsTheRelationship() {
        var company = new LinkedHashMap<String, Object>();
        company.put("company_name", "Cliente Norte");
        company.put("account_type", "SUPER_ADMIN");
        company.put("distributor_company_id", null);
        company.put("distributor_company_name", null);
        company.put("platform_status", "ACTIVE");
        company.put("platform_root", false);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L)))
            .thenReturn((List) List.of(company));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(12L)))
            .thenReturn((List) List.of("Aliado Norte"));

        var result = service.updateCompanyDistributor(
            9L,
            44L,
            new PlatformAdminService.DistributorAssignmentRequest(12L, "Approved distributor assignment")
        );

        assertThat(result)
            .containsEntry("company_id", 44L)
            .containsEntry("distributor_company_id", 12L)
            .containsEntry("distributor_company_name", "Aliado Norte")
            .containsEntry("commercial_origin", "DISTRIBUTOR")
            .containsEntry("changed", true);
        verify(access).require(9L, "PLATFORM_ACCOUNTS_WRITE");
        verify(jdbc).update(
            "UPDATE companies SET distributor_company_id = ? WHERE id = ? AND platform_status = 'ACTIVE'",
            12L,
            44L
        );
        verify(audit).record(
            eq(9L),
            eq("COMPANY_DISTRIBUTOR_ASSIGNED"),
            eq("COMPANY"),
            eq("44"),
            eq(44L),
            eq("SUCCESS"),
            any()
        );
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void refusesToAssignARootAccount() {
        var company = new LinkedHashMap<String, Object>();
        company.put("company_name", "Platform Root");
        company.put("account_type", "SUPER_ADMIN");
        company.put("distributor_company_id", null);
        company.put("distributor_company_name", null);
        company.put("platform_status", "ACTIVE");
        company.put("platform_root", true);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L)))
            .thenReturn((List) List.of(company));

        assertThatThrownBy(() -> service.updateCompanyDistributor(
            9L,
            44L,
            new PlatformAdminService.DistributorAssignmentRequest(12L, "Approved distributor assignment")
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Root accounts");

        verify(jdbc, never()).update(anyString(), any(), any());
    }
}
