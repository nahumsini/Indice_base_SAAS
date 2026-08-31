package com.indice.erp.billing.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class StorageQuotaPropertiesTest {

    @Test
    void commercialDefaultsUseOneHundredGibForIncludedAndAdditionalBlocks() {
        var properties = new StorageQuotaProperties();

        assertThat(properties.getIncludedBytes()).isEqualTo(StorageQuotaProperties.ONE_HUNDRED_GIB);
        assertThat(properties.getBlockBytes()).isEqualTo(StorageQuotaProperties.ONE_HUNDRED_GIB);
    }
}
