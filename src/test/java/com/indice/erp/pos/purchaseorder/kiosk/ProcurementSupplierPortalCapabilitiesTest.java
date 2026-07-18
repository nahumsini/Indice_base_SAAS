package com.indice.erp.pos.purchaseorder.kiosk;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class ProcurementSupplierPortalCapabilitiesTest {

    @Test
    void declaresVersionedControlledCapabilitiesAndReviewPolicies() {
        var descriptors = ProcurementSupplierPortalCapabilities.descriptors().stream()
            .collect(Collectors.toMap(descriptor -> descriptor.key(), Function.identity()));

        assertThat(descriptors).containsOnlyKeys(
            ProcurementSupplierPortalCapabilities.IDENTITY_VERIFY,
            ProcurementSupplierPortalCapabilities.CATALOG_READ,
            ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE,
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN,
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER,
            ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT
        );
        assertThat(descriptors.get(ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE).operationPolicy())
            .isEqualTo(KioskOperationPolicy.REVIEW_REQUIRED);
        assertThat(descriptors.get(ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT).operationPolicy())
            .isEqualTo(KioskOperationPolicy.REVIEW_REQUIRED);
        assertThat(descriptors.get(ProcurementSupplierPortalCapabilities.CATALOG_READ).mutation()).isFalse();
        assertThat(descriptors.get(
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN).filePolicy())
            .containsEntry("maxSizeBytes", 15L * 1024L * 1024L)
            .containsEntry("retentionOwner", "PROCUREMENT");
        assertThat(descriptors.get(
            ProcurementSupplierPortalCapabilities.IDENTITY_VERIFY).inputContract())
            .containsEntry("stablePinScope", "PERSON");
        assertThat(descriptors.values()).allSatisfy(descriptor -> {
            assertThat(descriptor.ownerModule()).isEqualTo("PROCUREMENT");
            assertThat(descriptor.version()).isEqualTo(1);
        });
    }
}
