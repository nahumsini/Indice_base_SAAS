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
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class PlatformAdminAccountTypeServiceTest {

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
    void updatesAndAuditsAnEditableCommercialAccountType() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "SUPER_ADMIN", "platform_root", false)
        ));

        var result = service.updateCompanyAccountType(
            9L,
            44L,
            new PlatformAdminService.AccountTypeUpdateRequest("DISTRIBUTOR")
        );

        assertThat(result)
            .containsEntry("company_id", 44L)
            .containsEntry("user_type", "DISTRIBUTOR")
            .containsEntry("changed", true);
        verify(access).require(9L, "PLATFORM_ACCOUNTS_WRITE");
        verify(jdbc).update("UPDATE companies SET commercial_account_type = ? WHERE id = ?", "DISTRIBUTOR", 44L);
        verify(audit).record(
            eq(9L),
            eq("COMPANY_ACCOUNT_TYPE_UPDATED"),
            eq("COMPANY"),
            eq("44"),
            eq(44L),
            eq("SUCCESS"),
            any()
        );
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void refusesToEditAnAccountWithActiveRootAuthority() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "SUPER_ADMIN", "platform_root", true)
        ));

        assertThatThrownBy(() -> service.updateCompanyAccountType(
            9L,
            44L,
            new PlatformAdminService.AccountTypeUpdateRequest("DISTRIBUTOR")
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Root authority");

        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void enablesAndAuditsPublicDemoAccessForACustomerAccount() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "SUPER_ADMIN", "enabled", false)
        ));

        var result = service.updatePublicDemoAccess(
            9L,
            44L,
            new PlatformAdminService.PublicDemoUpdateRequest(true)
        );

        assertThat(result)
            .containsEntry("company_id", 44L)
            .containsEntry("public_demo_enabled", true)
            .containsEntry("changed", true);
        verify(jdbc).update("UPDATE companies SET public_demo_enabled = ? WHERE id = ?", true, 44L);
        verify(audit).record(eq(9L), eq("PUBLIC_DEMO_ENABLED"), eq("COMPANY"), eq("44"), eq(44L), eq("SUCCESS"), any());
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void refusesToExposeADistributorAsAPublicDemo() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "DISTRIBUTOR", "enabled", false)
        ));

        assertThatThrownBy(() -> service.updatePublicDemoAccess(
            9L,
            44L,
            new PlatformAdminService.PublicDemoUpdateRequest(true)
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("customer accounts");

        verify(jdbc, never()).update(anyString(), any(), any());
    }
}
