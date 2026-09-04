package com.indice.erp.billing.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StorageQuotaPropertiesTest {

    @Test
    void commercialDefaultsUseFiveGibForIncludedAndAdditionalBlocks() {
        var properties = new StorageQuotaProperties();

        assertThat(properties.getIncludedBytes()).isEqualTo(StorageQuotaProperties.FIVE_GIB);
        assertThat(properties.getBlockBytes()).isEqualTo(StorageQuotaProperties.FIVE_GIB);
    }
}
