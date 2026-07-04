package com.indice.erp.storage;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;

class ObjectStorageStartupVerifierTest {

    @Test
    void requiredStorageFailsStartupWhenServiceIsDisabled() {
        var properties = new ObjectStorageProperties();
        properties.setRequired(true);
        properties.setProvider("none");

        var verifier = new ObjectStorageStartupVerifier(new DisabledObjectStorageService(), properties);

        assertThatThrownBy(verifier::verifyStorage)
            .isInstanceOf(IllegalStateException.class)
            .hasMessage("Object storage is required but is not enabled.");
    }

    @Test
    void optionalDisabledStorageDoesNotValidateBuckets() {
        var properties = new ObjectStorageProperties();
        properties.setRequired(false);
        properties.setProvider("none");
        var storage = org.mockito.Mockito.mock(ObjectStorageService.class);

        var verifier = new ObjectStorageStartupVerifier(storage, properties);
        verifier.verifyStorage();

        verify(storage, never()).validateConfiguration();
        verify(storage, never()).ensureBucketExists(org.mockito.Mockito.anyString());
    }
}
