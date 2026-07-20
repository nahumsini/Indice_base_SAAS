package com.indice.erp.finance.payablekiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.function.Function;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PayableKioskCapabilitiesTest {

    @Test
    void publishesTheExpensesCapabilityContractWithExplicitAccessAndReviewPolicies() {
        var capabilities = PayableKioskCapabilities.descriptors().stream()
            .collect(Collectors.toMap(KioskCapabilityDescriptor::key, Function.identity()));

        assertThat(capabilities).hasSize(13);
        assertThat(capabilities.values())
            .allMatch(capability -> capability.ownerModule().equals(PayableKioskCapabilities.OWNER_MODULE))
            .allMatch(capability -> capability.version() == 1);

        var registration = capabilities.get(PayableKioskCapabilities.PROVIDER_REGISTER);
        assertThat(registration.accessLevel()).isEqualTo(KioskAccessLevel.PUBLIC);
        assertThat(registration.operationPolicy()).isEqualTo(KioskOperationPolicy.REVIEW_REQUIRED);
        assertThat(registration.mutation()).isTrue();

        var payable = capabilities.get(PayableKioskCapabilities.PAYABLE_CREATE);
        assertThat(payable.accessLevel()).isEqualTo(KioskAccessLevel.CONTROLLED);
        assertThat(payable.operationPolicy()).isEqualTo(KioskOperationPolicy.REVIEW_REQUIRED);
        assertThat(payable.sensitive()).isTrue();

        assertThat(capabilities.get(PayableKioskCapabilities.FACE_ENROLLMENT_BEGIN).accessLevel())
            .isEqualTo(KioskAccessLevel.CONTROLLED);
        assertThat(capabilities.get(PayableKioskCapabilities.FACE_CONSENT_WITHDRAW).mutation()).isTrue();
        assertThat(capabilities.get(PayableKioskCapabilities.FACE_VERIFICATION_COMPLETE).sensitive()).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void limitsPayableEvidenceToTheDeclaredModuleOwnedPolicy() {
        var upload = PayableKioskCapabilities.descriptors().stream()
            .filter(capability -> PayableKioskCapabilities.ATTACHMENT_PRESIGN.equals(capability.key()))
            .findFirst()
            .orElseThrow();

        assertThat(upload.filePolicy())
            .containsEntry("maxFiles", 5)
            .containsEntry("maxSizeBytes", 10L * 1024L * 1024L)
            .containsEntry("retentionOwner", PayableKioskCapabilities.OWNER_MODULE)
            .containsEntry("purpose", "payable-evidence");
        assertThat(upload.mutation()).isTrue();
        assertThat((List<String>) upload.filePolicy().get("extensions"))
            .contains(".pdf", ".jpg", ".heic", ".heif", ".docx", ".xlsx");
    }
}
