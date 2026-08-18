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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

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
        given(repository.hasOperationalRegisterAssignment(7L, 31L, 2L, 3L, 5L)).willReturn(true);
        given(shifts.hasOpenShift(7L, 31L)).willReturn(true);
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
    void publicReadReturnsAClosedStateInsteadOfAStaleSaleWhenTheSourceRegisterIsClosed() {
        var device = device();
        given(secrets.hash("raw-device-token")).willReturn("token-hash");
        given(repository.findActiveDeviceByTokenHash("token-hash")).willReturn(Optional.of(device));
        given(repository.hasOperationalRegisterAssignment(7L, 31L, 2L, 3L, 5L)).willReturn(true);
        given(shifts.hasOpenShift(7L, 31L)).willReturn(false);

        var response = service.publicState("raw-device-token");

        assertThat(response.status()).isEqualTo("CLOSED");
        assertThat(response.customerMessage()).isEqualTo("La caja origen está cerrada");
        assertThat(response.connected()).isFalse();
        then(repository).should().touchDeviceIfStale(device.id());
        then(repository).shouldHaveNoMoreInteractions();
    }

    @Test
    void publicReadRejectsADeviceWhoseRegisterWarehouseAssignmentIsNoLongerOperational() {
        var device = device();
        given(secrets.hash("raw-device-token")).willReturn("token-hash");
        given(repository.findActiveDeviceByTokenHash("token-hash")).willReturn(Optional.of(device));

        assertThatThrownBy(() -> service.publicState("raw-device-token"))
            .isInstanceOf(com.indice.erp.pos.PosApiException.class)
            .hasMessage("Customer display not found.");

        then(repository).should().findActiveDeviceByTokenHash("token-hash");
        then(repository).should().hasOperationalRegisterAssignment(7L, 31L, 2L, 3L, 5L);
        then(repository).shouldHaveNoMoreInteractions();
    }

    @Test
    void deletingAnOperationalDisplayRevokesEngineAccessAndRemovesOnlyItsConfiguration() {
        var definition = definition(KioskDefinitionStatus.ACTIVE);
        given(registry.requireById(7L, definition.id())).willReturn(definition);
        var context = new PosContext(8L, 7L, "Admin", "root", true, PosScope.corporateOffice());

        service.delete(context, definition.id(), "cleanup");

        then(registry).should().deleteDefinition(
            7L, PointOfSaleKioskCapabilities.OWNER_MODULE, 11L, 8L, "cleanup");
        then(repository).should().delete(7L, 11L);
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

    @Test
    void authenticatedAdministrationCanRecoverTheProtectedDisplayUrl() {
        var definition = definition(KioskDefinitionStatus.ACTIVE);
        var device = device();
        var context = new PosContext(8L, 7L, "Admin", "root", true, PosScope.corporateOffice());
        given(registry.requireById(7L, definition.id())).willReturn(definition);
        given(repository.findDeviceById(7L, 11L)).willReturn(Optional.of(device));
        given(secrets.reveal("protected-token")).willReturn("raw-device-token");

        var access = service.publicAccess(context, definition.id());

        assertThat(access.get("displayUrl")).isEqualTo("/pos-display/raw-device-token");
        assertThat(access.get("publicTokenHint")).isEqualTo("tokenhint");
    }

    @Test
    void regeneratingDisplayAccessReplacesBothLegacyAndEngineLookupTokens() {
        var definition = definition(KioskDefinitionStatus.ACTIVE);
        var device = device();
        var context = new PosContext(8L, 7L, "Admin", "root", true, PosScope.corporateOffice());
        given(registry.requireById(7L, definition.id())).willReturn(definition);
        given(repository.findDeviceById(7L, 11L)).willReturn(Optional.of(device));
        given(secrets.hash(anyString())).willReturn("new-token-hash");
        given(secrets.protect(anyString())).willReturn("enc.v1.new-token");
        given(secrets.hint(anyString())).willReturn("new-hint");

        var access = service.rotatePublicAccess(context, definition.id());

        assertThat(access.get("displayUrl")).asString().startsWith("/pos-display/posd_");
        assertThat(access.get("publicTokenHint")).isEqualTo("new-hint");
        then(repository).should().replaceDeviceToken(
            eq(7L), eq(11L), eq("enc.v1.new-token"), eq("new-token-hash"),
            eq("new-hint"), eq(8L));
        then(registry).should().replacePublicToken(
            eq(7L), eq(PointOfSaleKioskCapabilities.OWNER_MODULE), eq(11L),
            anyString(), eq(8L));
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
