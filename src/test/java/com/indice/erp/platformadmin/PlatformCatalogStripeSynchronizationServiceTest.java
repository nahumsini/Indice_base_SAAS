package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

@ExtendWith(MockitoExtension.class)
class PlatformCatalogStripeSynchronizationServiceTest {

    @Mock
    private JdbcTemplate jdbc;
    @Mock
    private PlatformAdminAccessService access;
    @Mock
    private PlatformAuditService audit;
    @Mock
    private StripeCatalogGateway stripe;
    @Mock
    private StripeSecretProvider secrets;
    @Mock
    private TransactionTemplate transactions;

    private StripePhaseTwoProperties properties;
    private PlatformCatalogStripeSynchronizationService service;

    @BeforeEach
    void setUp() {
        properties = new StripePhaseTwoProperties();
        properties.setEnabled(true);
        properties.setMode("live");
        service = new PlatformCatalogStripeSynchronizationService(
            jdbc, access, audit, stripe, secrets, properties, transactions
        );
        when(secrets.isLiveMode()).thenReturn(true);
    }

    @Test
    void liveCatalogWritesRemainBlockedByDeploymentByDefault() {
        when(access.require(7L, "PLATFORM_MODULES_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", List.of()));

        assertThatThrownBy(() -> service.synchronize(
            7L,
            41L,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(
                6_900L, 66_240L, "LIVE", "PUBLICAR EN STRIPE LIVE"
            )
        )).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("bloqueada por despliegue");

        verifyNoInteractions(stripe, jdbc, transactions);
    }

    @Test
    void liveCatalogWritesRequireRoot() {
        properties.setCatalogLiveSyncEnabled(true);
        when(access.require(7L, "PLATFORM_MODULES_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(1L, "PLATFORM_BILLING", List.of("PLATFORM_MODULES_WRITE")));

        assertThatThrownBy(() -> service.synchronize(
            7L,
            41L,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(
                6_900L, 66_240L, "LIVE", "PUBLICAR EN STRIPE LIVE"
            )
        )).isInstanceOf(PlatformAdminForbiddenException.class)
            .hasMessageContaining("Sólo Root");

        verifyNoInteractions(stripe, jdbc, transactions);
    }

    @Test
    void liveCatalogWritesRequireExactConfirmation() {
        properties.setCatalogLiveSyncEnabled(true);
        when(access.require(7L, "PLATFORM_MODULES_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(1L, "PLATFORM_ROOT", List.of()));

        assertThatThrownBy(() -> service.synchronize(
            7L,
            41L,
            new PlatformCatalogStripeSynchronizationService.SynchronizeRequest(
                6_900L, 66_240L, "LIVE", "confirm"
            )
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("PUBLICAR EN STRIPE LIVE");

        verifyNoInteractions(stripe, jdbc, transactions);
    }
}
