package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.stripe.StripeBillingGateway;
import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

@ExtendWith(MockitoExtension.class)
class PlatformTrialExtensionServiceTest {

    @Mock private JdbcTemplate jdbc;
    @Mock private TransactionTemplate transactions;
    @Mock private PlatformAdminAccessService access;
    @Mock private PlatformAuditService audit;
    @Mock private StripeBillingGateway stripe;
    @Mock private CommercialLifecycleService lifecycle;
    @Mock private CompanyEntitlementProjectionService entitlements;

    private PlatformTrialExtensionService service;

    @BeforeEach
    void setUp() {
        service = new PlatformTrialExtensionService(
            jdbc,
            transactions,
            access,
            audit,
            stripe,
            lifecycle,
            entitlements,
            Clock.fixed(Instant.parse("2026-08-13T12:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void rejectsAnyDurationOutsideTheSingleControlledExtension() {
        when(access.require(9L, "PLATFORM_ACCOUNTS_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", List.of()));

        assertThatThrownBy(() -> service.extend(
            9L,
            22L,
            "trial-extension-60",
            new PlatformTrialExtensionService.ExtensionRequest(60, true)
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("15 días");

        verifyNoInteractions(jdbc, transactions, stripe, lifecycle, entitlements);
    }

    @Test
    void refusesTrialExtensionToNonRootPlatformAdministrators() {
        when(access.require(9L, "PLATFORM_ACCOUNTS_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(
                2L,
                "PLATFORM_OPERATOR",
                List.of("PLATFORM_ACCOUNTS_WRITE")
            ));

        assertThatThrownBy(() -> service.extend(
            9L,
            22L,
            "trial-extension-7",
            new PlatformTrialExtensionService.ExtensionRequest(15, true)
        ))
            .isInstanceOf(PlatformAdminForbiddenException.class)
            .hasMessageContaining("Sólo Root");

        verifyNoInteractions(jdbc, transactions, stripe, lifecycle, entitlements);
    }
}
