package com.indice.erp.finance.pettycash;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.function.Function;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PettyCashKioskCapabilitiesTest {

    @Test
    void publishesAControlledContractForIdentityQueriesAndReceiptMutations() {
        var capabilities = PettyCashKioskCapabilities.descriptors().stream()
            .collect(Collectors.toMap(KioskCapabilityDescriptor::key, Function.identity()));

        assertThat(capabilities).hasSize(7);
        assertThat(capabilities.values())
            .allMatch(capability -> capability.ownerModule().equals(PettyCashKioskCapabilities.OWNER_MODULE))
            .allMatch(capability -> capability.accessLevel() == KioskAccessLevel.CONTROLLED);
        assertThat(capabilities.get(PettyCashKioskCapabilities.MOVEMENTS_READ).operationPolicy())
            .isEqualTo(KioskOperationPolicy.INFORMATION_ONLY);
        assertThat(capabilities.get(PettyCashKioskCapabilities.RECEIPT_CREATE).mutation()).isTrue();
        assertThat(capabilities.get(PettyCashKioskCapabilities.RECEIPT_DELETE).mutation()).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void limitsReceiptEvidenceAndKeepsRetentionInPettyCash() {
        var upload = PettyCashKioskCapabilities.descriptors().stream()
            .filter(capability -> PettyCashKioskCapabilities.ATTACHMENT_PRESIGN.equals(capability.key()))
            .findFirst()
            .orElseThrow();

        assertThat(upload.filePolicy())
            .containsEntry("maxFiles", 5)
            .containsEntry("maxSizeBytes", 10L * 1024L * 1024L)
            .containsEntry("retentionOwner", PettyCashKioskCapabilities.OWNER_MODULE)
            .containsEntry("purpose", "petty-cash-receipt");
        assertThat(upload.mutation()).isTrue();
        assertThat((List<String>) upload.filePolicy().get("mimeTypes"))
            .contains("application/pdf", "image/jpeg", "image/png");
    }
}
