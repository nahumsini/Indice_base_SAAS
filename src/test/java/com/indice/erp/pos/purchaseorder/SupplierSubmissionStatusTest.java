package com.indice.erp.pos.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SupplierSubmissionStatusTest {

    @Test
    void mapsConvertedItemStorageStatusToCanonicalSubmissionStatus() {
        assertThat(SupplierSubmissionStatus.fromItemStorageValue("CONVERTED"))
            .isEqualTo(SupplierSubmissionStatus.CONVERTED_TO_PURCHASE_ORDER);
    }

    @Test
    void preservesCanonicalItemStatuses() {
        assertThat(SupplierSubmissionStatus.fromItemStorageValue("APPROVED"))
            .isEqualTo(SupplierSubmissionStatus.APPROVED);
    }

    @Test
    void rejectsUnknownItemStatuses() {
        assertThatThrownBy(() -> SupplierSubmissionStatus.fromItemStorageValue("UNKNOWN"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
