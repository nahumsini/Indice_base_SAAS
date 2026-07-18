package com.indice.erp.pos.purchaseorder.kiosk;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProcurementSupplierPortalSecretProtectionStartupTest {

    @Test
    void sealsEveryFullBatchBeforeSingletonInitializationContinues() {
        var job = mock(ProcurementSupplierPortalSecretProtectionJob.class);
        when(job.protectLegacySecrets()).thenReturn(500, 500, 7);
        var startup = new ProcurementSupplierPortalSecretProtectionStartup(job);

        startup.afterSingletonsInstantiated();

        verify(job, times(3)).protectLegacySecrets();
    }

    @Test
    void stopsAfterTheFirstPartialBatch() {
        var job = mock(ProcurementSupplierPortalSecretProtectionJob.class);
        when(job.protectLegacySecrets()).thenReturn(12);
        var startup = new ProcurementSupplierPortalSecretProtectionStartup(job);

        startup.afterSingletonsInstantiated();

        verify(job).protectLegacySecrets();
    }
}
