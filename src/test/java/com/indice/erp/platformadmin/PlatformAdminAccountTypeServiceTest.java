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
            Map.of("account_type", "SUPER_ADMIN", "platform_status", "ACTIVE", "platform_root", false)
        ));

        var result = service.updateCompanyAccountType(
            9L,
            44L,
            new PlatformAdminService.AccountTypeUpdateRequest("DISTRIBUTOR", "Approved account migration")
        );

        assertThat(result)
            .containsEntry("company_id", 44L)
            .containsEntry("user_type", "DISTRIBUTOR")
            .containsEntry("changed", true);
        verify(access).require(9L, "PLATFORM_ACCOUNTS_WRITE");
        verify(jdbc).update(
            "UPDATE companies SET commercial_account_type = ? WHERE id = ? AND platform_status = 'ACTIVE'",
            "DISTRIBUTOR",
            44L
        );
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
            Map.of("account_type", "SUPER_ADMIN", "platform_status", "ACTIVE", "platform_root", true)
        ));

        assertThatThrownBy(() -> service.updateCompanyAccountType(
            9L,
            44L,
            new PlatformAdminService.AccountTypeUpdateRequest("DISTRIBUTOR", "Approved account migration")
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Root authority");

        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    void refusesAnAccountTypeChangeWithoutAnAuditableReason() {
        assertThatThrownBy(() -> service.updateCompanyAccountType(
            9L,
            44L,
            new PlatformAdminService.AccountTypeUpdateRequest("DISTRIBUTOR", " ")
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("operational reason");

        verify(access).require(9L, "PLATFORM_ACCOUNTS_WRITE");
        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void enablesAndAuditsPublicDemoAccessForACustomerAccount() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "SUPER_ADMIN", "enabled", false, "platform_status", "ACTIVE")
        ));

        var result = service.updatePublicDemoAccess(
            9L,
            44L,
            new PlatformAdminService.PublicDemoUpdateRequest(true, "Approved public demo access")
        );

        assertThat(result)
            .containsEntry("company_id", 44L)
            .containsEntry("public_demo_enabled", true)
            .containsEntry("changed", true);
        verify(jdbc).update(
            "UPDATE companies SET public_demo_enabled = ? WHERE id = ? AND platform_status = 'ACTIVE'",
            true,
            44L
        );
        verify(audit).record(eq(9L), eq("PUBLIC_DEMO_ENABLED"), eq("COMPANY"), eq("44"), eq(44L), eq("SUCCESS"), any());
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void refusesToExposeADistributorAsAPublicDemo() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "DISTRIBUTOR", "enabled", false, "platform_status", "ACTIVE")
        ));

        assertThatThrownBy(() -> service.updatePublicDemoAccess(
            9L,
            44L,
            new PlatformAdminService.PublicDemoUpdateRequest(true, "Approved public demo access")
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("customer accounts");

        verify(jdbc, never()).update(anyString(), any(), any());
    }

    @Test
    @SuppressWarnings({ "rawtypes", "unchecked" })
    void refusesOperationalChangesForADeletedAccount() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(44L))).thenReturn((List) List.of(
            Map.of("account_type", "SUPER_ADMIN", "platform_status", "DELETED", "platform_root", false)
        ));

        assertThatThrownBy(() -> service.updateCompanyAccountType(
            9L,
            44L,
            new PlatformAdminService.AccountTypeUpdateRequest("DISTRIBUTOR", "Approved account migration")
        ))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Deleted accounts");

        verify(jdbc, never()).update(anyString(), any(), any());
    }
}
