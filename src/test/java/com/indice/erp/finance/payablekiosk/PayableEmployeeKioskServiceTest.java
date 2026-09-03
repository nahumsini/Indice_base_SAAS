package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PayableEmployeeKioskServiceTest {

    @Mock
    private PayableKioskService payableKiosks;
    @Mock
    private PayableKioskRepository repository;
    @Mock
    private KioskRegistryService registry;

    private PayableEmployeeKioskService employeeKiosk;
    private KioskResolvedDefinition definition;

    @BeforeEach
    void setUp() {
        employeeKiosk = new PayableEmployeeKioskService(
            payableKiosks, repository, registry, new ObjectMapper(),
            Validation.buildDefaultValidatorFactory().getValidator());
        definition = new KioskResolvedDefinition(
            3L, 7L, PayableKioskCapabilities.OWNER_MODULE,
            PayableKioskCapabilities.KIOSK_TYPE, 2L,
            "PAYABLE-02", "Captura de proveedores", KioskDefinitionStatus.ACTIVE,
            null, null, null, KioskAccessLevel.PUBLIC,
            null, "tokenhint", true, 1, 1);
    }

    @Test
    void sealsMatchingLegacyTokenOnceBeforePublishingEmployeeSupport() {
        var legacy = legacy("MIXED", "legacy-payable-token");
        given(registry.publicTokenRecoverable(7L, 3L)).willReturn(false);
        given(repository.getById(7L, 2L)).willReturn(legacy);
        given(payableKiosks.supportsEmployeeAccess("legacy-payable-token", 7L)).willReturn(true);
        given(registry.repairLegacyPublicTokenRecoveryMaterial(
            7L, 3L, PayableKioskCapabilities.OWNER_MODULE,
            PayableKioskCapabilities.KIOSK_TYPE, 2L, "legacy-payable-token"))
            .willReturn(true);

        assertThat(employeeKiosk.supports(definition)).isTrue();

        then(registry).should().repairLegacyPublicTokenRecoveryMaterial(
            7L, 3L, PayableKioskCapabilities.OWNER_MODULE,
            PayableKioskCapabilities.KIOSK_TYPE, 2L, "legacy-payable-token");
    }

    @Test
    void neverSealsAProviderOnlyLegacyToken() {
        given(registry.publicTokenRecoverable(7L, 3L)).willReturn(false);
        given(repository.getById(7L, 2L)).willReturn(legacy("PROVIDER", "provider-token"));
        given(payableKiosks.supportsEmployeeAccess("provider-token", 7L)).willReturn(false);

        assertThat(employeeKiosk.supports(definition)).isFalse();

        then(registry).shouldHaveNoMoreInteractions();
    }

    @Test
    void validatesExistingProtectedMaterialThroughTheOwnerService() {
        given(registry.publicTokenRecoverable(7L, 3L)).willReturn(true);
        given(registry.recoverPublicToken(
            7L, PayableKioskCapabilities.OWNER_MODULE,
            PayableKioskCapabilities.KIOSK_TYPE, 2L))
            .willReturn("protected-payable-token");
        given(payableKiosks.supportsEmployeeAccess("protected-payable-token", 7L))
            .willReturn(true);

        assertThat(employeeKiosk.supports(definition)).isTrue();

        then(repository).shouldHaveNoInteractions();
    }

    private PayableKioskRow legacy(String accessType, String token) {
        return new PayableKioskRow(
            2L, 7L, null, null, null, "PAYABLE-02", "Captura de proveedores",
            "ACTIVE", accessType, token, "pin-hash", "MXN", false);
    }
}
