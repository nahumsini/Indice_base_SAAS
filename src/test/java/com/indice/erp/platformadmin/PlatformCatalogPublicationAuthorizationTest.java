package com.indice.erp.platformadmin;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.stripe.StripeCatalogGateway;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

class PlatformCatalogPublicationAuthorizationTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PlatformAdminAccessService access = mock(PlatformAdminAccessService.class);
    private final StripeCatalogGateway stripe = mock(StripeCatalogGateway.class);
    private final PlatformCatalogPublicationLock lock = mock(PlatformCatalogPublicationLock.class);
    private StripePhaseTwoProperties properties;
    private PlatformCatalogPublicationService publication;

    @BeforeEach
    void setUp() {
        properties = new StripePhaseTwoProperties();
        properties.setEnabled(true);
        properties.setMode("live");
        var synchronization = new PlatformCatalogStripeSynchronizationService(jdbc, access,
            mock(PlatformAuditService.class), stripe, new StripeSecretProvider(properties), properties,
            mock(TransactionTemplate.class));
        publication = new PlatformCatalogPublicationService(jdbc, synchronization,
            mock(PlatformCatalogManagementService.class), mock(PlatformCatalogPublicationSnapshot.class), lock,
            mock(PlatformCatalogStripeVerificationService.class));
        when(access.require(7L, "PLATFORM_MODULES_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(7L, "PLATFORM_ROOT", List.of()));
    }

    @Test
    void disabledStripeRejectsPublicationBeforeDatabaseOrRemoteWork() {
        properties.setEnabled(false);
        assertRejected("LIVE", "PUBLICAR EN STRIPE LIVE", "disabled");
    }

    @Test
    void livePublicationRequiresTheMaintenanceFlag() {
        assertRejected("LIVE", "PUBLICAR EN STRIPE LIVE", "bloqueada por despliegue");
    }

    @Test
    void livePublicationRequiresTheExactConfirmation() {
        properties.setCatalogLiveSyncEnabled(true);
        assertRejected("LIVE", "yes", "PUBLICAR EN STRIPE LIVE");
    }

    @Test
    void clientCannotChooseADifferentStripeMode() {
        properties.setCatalogLiveSyncEnabled(true);
        assertRejected("TEST", null, "modo solicitado");
    }

    @Test
    void delegatedCatalogWriterCannotPublishInAnyMode() {
        properties.setMode("test");
        when(access.require(7L, "PLATFORM_MODULES_WRITE"))
            .thenReturn(new PlatformAdminAccessService.Access(7L, "PLATFORM_BILLING", List.of("PLATFORM_MODULES_WRITE")));
        assertRejected("TEST", null, "Sólo Root");
    }

    private void assertRejected(String mode, String confirmation, String message) {
        assertThatThrownBy(() -> publication.synchronizeAndPublish(7L, 41L,
            new PlatformCatalogPublicationService.PublicationRequest(mode, confirmation)))
            .isInstanceOf(RuntimeException.class).hasMessageContaining(message);
        verifyNoInteractions(jdbc, stripe, lock);
    }
}
