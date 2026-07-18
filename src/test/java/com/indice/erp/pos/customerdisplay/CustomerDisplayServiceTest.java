package com.indice.erp.pos.customerdisplay;

import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.shift.ShiftRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class CustomerDisplayServiceTest {

    @Mock private CustomerDisplayRepository repository;
    @Mock private CashRegisterRepository cashRegisters;
    @Mock private ShiftRepository shifts;
    @Mock private KioskRegistryService registry;
    @Mock private CustomerDisplaySecretCodec secrets;

    private CustomerDisplayService service;

    @BeforeEach
    void setUp() {
        service = new CustomerDisplayService(
            repository, cashRegisters, shifts, registry, secrets,
            Clock.fixed(Instant.parse("2026-07-18T12:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void publicReadUsesHashLookupAndDebouncedHeartbeatWriter() {
        var device = device();
        given(secrets.hash("raw-device-token")).willReturn("token-hash");
        given(repository.findActiveDeviceByTokenHash("token-hash")).willReturn(Optional.of(device));
        given(repository.findLatestSnapshot(7L, 31L)).willReturn(Optional.empty());

        var response = service.publicState("raw-device-token");

        assertThat(response.deviceToken()).isNull();
        assertThat(response.status()).isEqualTo("IDLE");
        assertThat(response.kioskName()).isEqualTo("Pantalla cliente");
        assertThat(response.companyName()).isEqualTo("Índice");
        assertThat(response.unitName()).isEqualTo("Unidad Norte");
        assertThat(response.businessName()).isEqualTo("Negocio Centro");
        then(repository).should().touchDeviceIfStale(device.id());
    }

    @Test
    void refusesPhysicalDeletionWhileCustomerDisplayIsOperational() {
        var definition = definition(KioskDefinitionStatus.ACTIVE);
        given(registry.requireById(7L, definition.id())).willReturn(definition);

        assertThatThrownBy(() -> service.delete(
            new PosContext(8L, 7L, "Admin", "root", true, PosScope.corporateOffice()),
            definition.id(), "cleanup"))
            .hasMessageContaining("Revoke or let the customer display expire");

        then(registry).should().requireById(7L, definition.id());
        then(registry).shouldHaveNoMoreInteractions();
        then(repository).shouldHaveNoInteractions();
    }

    @Test
    void physicallyDeletesRevokedCustomerDisplayAfterRegistryAudit() {
        var definition = definition(KioskDefinitionStatus.REVOKED);
        given(registry.requireById(7L, definition.id())).willReturn(definition);
        var context = new PosContext(8L, 7L, "Admin", "root", true, PosScope.corporateOffice());

        service.delete(context, definition.id(), "cleanup");

        then(registry).should().deleteDefinition(
            7L, PointOfSaleKioskCapabilities.OWNER_MODULE, 11L, 8L, "cleanup");
        then(repository).should().delete(7L, 11L);
    }

    private KioskResolvedDefinition definition(KioskDefinitionStatus status) {
        return new KioskResolvedDefinition(
            101L, 7L, PointOfSaleKioskCapabilities.OWNER_MODULE,
            PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE, 11L,
            "POS-DISPLAY-11", "Pantalla cliente", status, 2L, 3L, 5L,
            KioskAccessLevel.PUBLIC, null, "tokenhint", true, 1, 1);
    }

    private CustomerDisplayDeviceRecord device() {
        return new CustomerDisplayDeviceRecord(
            11L, 7L, "Índice", 2L, "Unidad Norte", 3L, "Negocio Centro",
            5L, "Almacén principal", 31L, "CAJA-01", "Caja principal",
            "protected-token", "token-hash", "ce-token", null, null, null, null, null,
            "Pantalla cliente", "ACTIVE", null, null, null,
            8L, null, Instant.parse("2026-07-18T10:00:00Z"),
            Instant.parse("2026-07-18T10:00:00Z"), 0L, null);
    }
}
