package com.indice.erp.pos.customerdisplay;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CustomerDisplaySecretProtectionStartupTest {

    @Test
    void sealsEveryBatchBeforeStartupContinues() {
        var job = mock(CustomerDisplaySecretProtectionJob.class);
        when(job.protectLegacySecrets()).thenReturn(500, 500, 3);
        var startup = new CustomerDisplaySecretProtectionStartup(job);

        startup.afterSingletonsInstantiated();

        verify(job, times(3)).protectLegacySecrets();
    }
}
