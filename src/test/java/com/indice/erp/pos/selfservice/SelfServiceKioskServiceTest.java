package com.indice.erp.pos.selfservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CatalogItem;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketCreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketItemRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.StatusRequest;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class SelfServiceKioskServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-18T12:00:00Z");

    @Mock
    private SelfServiceKioskRepository repository;
    @Mock
    private CashRegisterRepository cashRegisters;
    @Mock
    private ShiftRepository shifts;
    @Mock
    private KioskRegistryService registry;

    private SelfServiceKioskService service;

    @BeforeEach
    void setUp() {
        service = new SelfServiceKioskService(
            repository, cashRegisters, shifts, registry, new ObjectMapper(),
            Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(shifts.hasOpenShift(anyLong(), anyLong())).thenReturn(true);
    }

    @Test
    void createsServerPricedPreticketWithoutReservingOrDeductingStock() {
        var kiosk = kiosk();
        var response = new PreticketResponse(
            41L, kiosk.id(), kiosk.cashRegisterId(), kiosk.cashRegisterName(),
            "SS-20260718-A1B2C3D4", "123", "PENDING", "MXN", "Ana", 1,
            new BigDecimal("250.0000"), new BigDecimal("250.0000"),
            NOW.plusSeconds(7200), NOW, List.of());
        given(repository.findById(kiosk.id())).willReturn(Optional.of(kiosk));
        given(repository.hasOperationalRegisterAssignment(
            kiosk.companyId(), kiosk.cashRegisterId(), kiosk.unitId(),
            kiosk.businessId(), kiosk.warehouseId())).willReturn(true);
        given(repository.catalog(kiosk)).willReturn(List.of(new CatalogItem(
            91L, "SKU-91", "Producto seguro", null, "General",
            new BigDecimal("125.00"), "MXN", new BigDecimal("10.00"), true, true)));
        given(repository.insertPreticket(
            eq(kiosk), anyString(), anyString(), eq("MXN"), eq("Ana"),
            eq(null), eq(null), eq(1), eq(new BigDecimal("250.0000")), any()))
            .willReturn(41L);
        given(repository.findPreticket(kiosk.companyId(), 41L)).willReturn(Optional.of(response));

        var created = service.createPreticket(definition(kiosk), new PreticketCreateRequest(
            "Ana", null, null, List.of(new PreticketItemRequest(91L, new BigDecimal("2")))));

        assertThat(created.preticketNumber()).isEqualTo(response.preticketNumber());
        assertThat(created.claimCode()).isEqualTo(response.claimCode());
        assertThat(created.totalAmount()).isEqualByComparingTo("250.0000");
        assertThat(java.util.Arrays.stream(created.getClass().getRecordComponents())
            .map(java.lang.reflect.RecordComponent::getName).toList())
            .containsExactlyInAnyOrder(
                "preticketNumber", "claimCode", "status", "currencyCode",
                "itemCount", "discountAmount", "totalAmount", "expiresAt");
        var claimCode = ArgumentCaptor.forClass(String.class);
        then(repository).should().insertPreticket(
            eq(kiosk), anyString(), claimCode.capture(), eq("MXN"), eq("Ana"),
            eq(null), eq(null), eq(1), eq(new BigDecimal("250.0000")), any());
        assertThat(claimCode.getValue()).matches("\\d{3}");
        then(repository).should().lockClaimCodeAllocation(kiosk.companyId(), kiosk.cashRegisterId());
        var line = ArgumentCaptor.forClass(SelfServiceKioskDtos.PreticketItemResponse.class);
        then(repository).should().insertPreticketItem(eq(kiosk.companyId()), eq(41L), line.capture(), anyInt());
        assertThat(line.getValue().unitPrice()).isEqualByComparingTo("125.0000");
        assertThat(line.getValue().lineTotal()).isEqualByComparingTo("250.0000");
        then(repository).should().audit(
            eq(kiosk.companyId()), eq(kiosk.id()), eq(41L),
            eq("SELF_SERVICE_PRETICKET_CREATED"), eq("SUCCEEDED"),
            any(), any(), eq(null), anyString());
    }

    @Test
    void rejectsRequestedQuantityAboveCurrentWarehouseAvailability() {
        var kiosk = kiosk();
        given(repository.findById(kiosk.id())).willReturn(Optional.of(kiosk));
        given(repository.hasOperationalRegisterAssignment(
            kiosk.companyId(), kiosk.cashRegisterId(), kiosk.unitId(),
            kiosk.businessId(), kiosk.warehouseId())).willReturn(true);
        given(repository.catalog(kiosk)).willReturn(List.of(new CatalogItem(
            91L, "SKU-91", "Producto limitado", null, "General",
            new BigDecimal("125.00"), "MXN", new BigDecimal("1.00"), true, true)));

        assertThatThrownBy(() -> service.createPreticket(definition(kiosk), new PreticketCreateRequest(
            "Ana", null, null, List.of(new PreticketItemRequest(91L, new BigDecimal("2"))))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("not currently available");

    }

    @Test
    void hidesExactAvailabilityWhenStockVisibilityIsDisabled() {
        var kiosk = new SelfServiceKioskRepository.KioskRecord(
            17L, 7L, "Índice", 2L, "Unidad Norte", 3L, "Negocio Centro",
            11L, "Almacén principal", 13L, "POS-01", "Caja principal",
            "SELF-SERVICE-01", "Autoservicio principal", "ACTIVE", null, "tokenhint",
            false, true, 30, 120, 1L, NOW.minusSeconds(60), NOW.minusSeconds(60));
        given(repository.findById(kiosk.id())).willReturn(Optional.of(kiosk));
        given(repository.hasOperationalRegisterAssignment(
            kiosk.companyId(), kiosk.cashRegisterId(), kiosk.unitId(),
            kiosk.businessId(), kiosk.warehouseId())).willReturn(true);
        given(repository.catalog(kiosk)).willReturn(List.of(new CatalogItem(
            91L, "SKU-91", "Producto seguro", null, "General",
            new BigDecimal("125.00"), "MXN", new BigDecimal("10.00"), true, true)));

        var bootstrap = service.bootstrap(definition(kiosk));

        assertThat(bootstrap.items()).singleElement()
            .extracting(CatalogItem::availableQuantity)
            .isNull();
        assertThat(bootstrap.showStock()).isFalse();
        assertThat(bootstrap.companyName()).isEqualTo("Índice");
        assertThat(bootstrap.unitName()).isEqualTo("Unidad Norte");
        assertThat(bootstrap.businessName()).isEqualTo("Negocio Centro");
        assertThat(java.util.Arrays.stream(bootstrap.getClass().getRecordComponents())
            .map(java.lang.reflect.RecordComponent::getName).toList())
            .containsExactlyInAnyOrder(
                "code", "name", "companyName", "unitName", "businessName",
                "warehouseName", "cashRegisterName", "currencyCode", "showStock",
                "customerNameRequired", "maxItemsPerTicket", "preticketTtlMinutes",
                "fulfillmentPolicy", "items", "kioskType", "availabilityState",
                "sourceRegisterOpen", "discountRules");
        assertThat(bootstrap.items()).singleElement()
            .extracting(CatalogItem::productId).isEqualTo(91L);
    }

    @Test
    void bootstrapsAnActiveSelfCheckoutFromTheSharedCatalogDomain() {
        var kiosk = kiosk();
        allowPublic(kiosk);
        given(repository.catalog(kiosk)).willReturn(List.of(new CatalogItem(
            91L, "SKU-91", "Producto seguro", null, "General",
            new BigDecimal("125.00"), "MXN", new BigDecimal("10.00"), true, true)));
        var selfCheckout = definition(
            kiosk, SelfServiceKioskService.OWNER_MODULE, "self_checkout",
            kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId());

        var bootstrap = service.bootstrap(selfCheckout);

        assertThat(bootstrap.name()).isEqualTo(kiosk.name());
        assertThat(bootstrap.kioskType()).isEqualTo("self_checkout");
        assertThat(bootstrap.fulfillmentPolicy()).isEqualTo("SELF_CHECKOUT_PAYMENT_REQUIRED");
        assertThat(bootstrap.items()).singleElement()
            .extracting(CatalogItem::productId).isEqualTo(91L);
    }

    @Test
    void keepsThePublicLinkAvailableButHidesCatalogWhenTheSourceRegisterIsClosed() {
        var kiosk = kiosk();
        allowPublic(kiosk);
        given(shifts.hasOpenShift(kiosk.companyId(), kiosk.cashRegisterId())).willReturn(false);

        var bootstrap = service.bootstrap(definition(kiosk));

        assertThat(bootstrap.sourceRegisterOpen()).isFalse();
        assertThat(bootstrap.availabilityState()).isEqualTo("SOURCE_REGISTER_CLOSED");
        assertThat(bootstrap.items()).isEmpty();
        then(repository).should(never()).catalog(any());
    }

    @Test
    void blocksAnOperationIfTheSourceRegisterClosesAfterBootstrap() {
        var kiosk = kiosk();
        allowPublic(kiosk);
        given(shifts.hasOpenShift(kiosk.companyId(), kiosk.cashRegisterId())).willReturn(false);

        assertThatThrownBy(() -> service.createPreticket(
            definition(kiosk), new PreticketCreateRequest(
                "Ana", null, null,
                List.of(new PreticketItemRequest(91L, BigDecimal.ONE)))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("source cash register is closed");

        then(repository).should(never()).catalog(any());
        then(repository).should(never()).insertPreticket(
            any(), anyString(), anyString(), anyString(), any(), any(), any(),
            anyInt(), any(), any());
    }

    @Test
    void rejectsStateChangesAfterTheKioskHasEffectivelyExpired() {
        var expired = new SelfServiceKioskRepository.KioskRecord(
            17L, 7L, "Índice", 2L, "Unidad Norte", 3L, "Negocio Centro",
            11L, "Almacén principal", 13L, "POS-01", "Caja principal",
            "SELF-SERVICE-01", "Autoservicio principal", "ACTIVE", NOW.minusSeconds(1), "tokenhint",
            true, true, 30, 120, 1L, NOW.minusSeconds(60), NOW.minusSeconds(60));
        var context = new com.indice.erp.pos.PosContext(
            5L, 7L, "Admin", "root", true, com.indice.erp.pos.PosScope.corporateOffice());
        given(repository.find(context, expired.id())).willReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.transition(
            context, expired.id(), new StatusRequest("DISABLED", "expired")))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("expired self-service kiosk is immutable");

        then(registry).shouldHaveNoInteractions();
    }

    @Test
    void refusesToListOrClaimPreticketsThroughAnOutOfScopeCashRegister() {
        var context = new PosContext(
            5L, 7L, "Cashier", "cashier", true, PosScope.businessOffice(2L, 3L));
        given(cashRegisters.findById(context, 99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.pending(context, 99L))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("Cash register not found");
        assertThatThrownBy(() -> service.claim(context, 41L, 99L))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("Cash register not found");

        then(repository).shouldHaveNoInteractions();
    }

    @Test
    void rejectsEveryAdversarialOwnerTypeCompanyAndScopeMismatch() {
        var kiosk = kiosk();
        var mismatches = List.of(
            definition(kiosk, "SALES", SelfServiceKioskService.KIOSK_TYPE,
                kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId()),
            definition(kiosk, SelfServiceKioskService.OWNER_MODULE, "customer_display",
                kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId()),
            definition(kiosk, SelfServiceKioskService.OWNER_MODULE, SelfServiceKioskService.KIOSK_TYPE,
                kiosk.companyId() + 1, kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId()),
            definition(kiosk, SelfServiceKioskService.OWNER_MODULE, SelfServiceKioskService.KIOSK_TYPE,
                kiosk.companyId(), kiosk.unitId() + 1, kiosk.businessId(), kiosk.warehouseId()),
            definition(kiosk, SelfServiceKioskService.OWNER_MODULE, SelfServiceKioskService.KIOSK_TYPE,
                kiosk.companyId(), kiosk.unitId(), kiosk.businessId() + 1, kiosk.warehouseId()),
            definition(kiosk, SelfServiceKioskService.OWNER_MODULE, SelfServiceKioskService.KIOSK_TYPE,
                kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId() + 1));
        given(repository.findById(kiosk.id())).willReturn(Optional.of(kiosk));

        mismatches.forEach(mismatched ->
            assertThatThrownBy(() -> service.bootstrap(mismatched))
                .isInstanceOf(PosApiException.class)
                .hasMessageContaining("Self-service kiosk not found"));

        then(repository).should(never()).catalog(any());
        then(repository).should(never()).hasOperationalRegisterAssignment(
            anyLong(), anyLong(), any(), any(), anyLong());
    }

    @Test
    void rejectsAggregatedDuplicateQuantityBeyondThePersistedContract() {
        var kiosk = kiosk();
        allowPublic(kiosk);
        given(repository.catalog(kiosk)).willReturn(List.of(new CatalogItem(
            91L, "SKU-91", "Producto", null, "General",
            new BigDecimal("1.00"), "MXN", new BigDecimal("20000"), true, true)));

        assertThatThrownBy(() -> service.createPreticket(
            definition(kiosk), new PreticketCreateRequest("Ana", null, null, List.of(
                new PreticketItemRequest(91L, new BigDecimal("6000")),
                new PreticketItemRequest(91L, new BigDecimal("5000"))))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("Aggregated product quantity");

        then(repository).should(never()).insertPreticket(
            any(), anyString(), anyString(), anyString(), any(), any(), any(),
            anyInt(), any(), any());
    }

    @Test
    void rejectsLineAndTicketAmountsThatDoNotFitDecimalFifteenFour() {
        var kiosk = kiosk();
        allowPublic(kiosk);
        given(repository.catalog(kiosk)).willReturn(List.of(new CatalogItem(
            91L, "SKU-91", "Producto", null, "General",
            new BigDecimal("99999999999.9999"), "MXN", BigDecimal.ZERO, false, true)));

        assertThatThrownBy(() -> service.createPreticket(
            definition(kiosk), new PreticketCreateRequest("Ana", null, null,
                List.of(new PreticketItemRequest(91L, new BigDecimal("2"))))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("line total");
    }

    @Test
    void rejectsMixedCurrenciesAfterNormalizingTheirCodes() {
        var kiosk = kiosk();
        allowPublic(kiosk);
        given(repository.catalog(kiosk)).willReturn(List.of(
            new CatalogItem(91L, "SKU-91", "Producto MXN", null, "General",
                BigDecimal.ONE, " mxn ", BigDecimal.ZERO, false, true),
            new CatalogItem(92L, "SKU-92", "Producto USD", null, "General",
                BigDecimal.ONE, "usd", BigDecimal.ZERO, false, true)));

        assertThatThrownBy(() -> service.createPreticket(
            definition(kiosk), new PreticketCreateRequest("Ana", null, null, List.of(
                new PreticketItemRequest(91L, BigDecimal.ONE),
                new PreticketItemRequest(92L, BigDecimal.ONE)))))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("cannot mix currencies");
    }

    @Test
    void rejectsPendingQueueWhenTheVisibleRegisterIsInactive() {
        var context = cashierContext();
        given(cashRegisters.findById(context, 13L))
            .willReturn(Optional.of(register(false, CashRegisterStatus.INACTIVE)));

        assertThatThrownBy(() -> service.pending(context, 13L))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("active cash register");

        then(repository).should(never()).listPending(any(), any());
    }

    @Test
    void rejectsPublicUseWhenTheRegisterWarehouseAssignmentIsNoLongerCoherent() {
        var kiosk = kiosk();
        given(repository.findById(kiosk.id())).willReturn(Optional.of(kiosk));
        given(repository.hasOperationalRegisterAssignment(
            kiosk.companyId(), kiosk.cashRegisterId(), kiosk.unitId(),
            kiosk.businessId(), kiosk.warehouseId())).willReturn(false);

        assertThatThrownBy(() -> service.bootstrap(definition(kiosk)))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("assignment is not operational");

        then(repository).should(never()).catalog(any());
    }

    @Test
    void refusesToReleaseAClaimWhenOwnershipOrCashRegisterDoesNotMatch() {
        var context = cashierContext();
        var register = register(true, CashRegisterStatus.ACTIVE);
        given(cashRegisters.findById(context, register.id())).willReturn(Optional.of(register));
        given(repository.hasOperationalRegisterAssignment(
            context.companyId(), register.id(), register.unitId(),
            register.businessId(), register.warehouseId())).willReturn(true);
        given(repository.releaseClaim(context, 41L, register)).willReturn(false);

        assertThatThrownBy(() -> service.releaseClaim(context, 41L, register.id()))
            .isInstanceOf(PosApiException.class)
            .hasMessageContaining("cannot be released");

        then(repository).should(never()).findPreticket(anyLong(), anyLong());
        then(repository).should(never()).audit(
            anyLong(), anyLong(), any(), anyString(), anyString(),
            any(), any(), any(), anyString());
    }

    @Test
    void releasesAnOwnedClaimBackToPendingAndAuditsTheRecovery() {
        var context = cashierContext();
        var register = register(true, CashRegisterStatus.ACTIVE);
        var response = new PreticketResponse(
            41L, 17L, register.id(), register.name(), "SS-20260718-A1B2C3D4",
            "A1B2C3D4", "PENDING", "MXN", "Ana", 1,
            new BigDecimal("25.0000"), new BigDecimal("25.0000"),
            NOW.plusSeconds(3600), NOW, List.of());
        given(cashRegisters.findById(context, register.id())).willReturn(Optional.of(register));
        given(repository.hasOperationalRegisterAssignment(
            context.companyId(), register.id(), register.unitId(),
            register.businessId(), register.warehouseId())).willReturn(true);
        given(repository.releaseClaim(context, 41L, register)).willReturn(true);
        given(repository.findPreticket(context.companyId(), 41L)).willReturn(Optional.of(response));

        assertThat(service.releaseClaim(context, 41L, register.id())).isSameAs(response);

        then(repository).should().audit(
            eq(context.companyId()), eq(response.kioskId()), eq(response.id()),
            eq("SELF_SERVICE_PRETICKET_CLAIM_RELEASED"), eq("SUCCEEDED"),
            any(), any(), eq(context.userId()), anyString());
    }

    @Test
    void authenticatedAdministrationRecoversTheCurrentProtectedSelfServiceLink() {
        var context = cashierContext();
        var kiosk = kiosk();
        var definition = definition(kiosk);
        given(repository.find(context, kiosk.id())).willReturn(Optional.of(kiosk));
        given(registry.requireByLegacyReference(
            context.companyId(), SelfServiceKioskService.OWNER_MODULE,
            PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE, kiosk.id()))
            .willReturn(definition);
        given(registry.recoverPublicToken(
            context.companyId(), SelfServiceKioskService.OWNER_MODULE,
            PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE, kiosk.id()))
            .willReturn("pss_current_token");

        var access = service.publicAccess(context, kiosk.id());

        assertThat(access.get("displayUrl")).isEqualTo("/pos-self-service/pss_current_token");
        assertThat(access.get("publicTokenHint")).isEqualTo(kiosk.tokenHint());
    }

    @Test
    void authenticatedAdministrationUsesTheDedicatedSelfCheckoutRoute() {
        var context = cashierContext();
        var kiosk = kiosk();
        var definition = definition(
            kiosk, SelfServiceKioskService.OWNER_MODULE, "self_checkout",
            kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId());
        given(repository.find(context, kiosk.id())).willReturn(Optional.of(kiosk));
        given(registry.requireByLegacyReference(
            context.companyId(), SelfServiceKioskService.OWNER_MODULE,
            PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE, kiosk.id()))
            .willReturn(definition);
        given(registry.recoverPublicToken(
            context.companyId(), SelfServiceKioskService.OWNER_MODULE,
            PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE, kiosk.id()))
            .willReturn("psc_current_token");

        var access = service.publicAccess(context, kiosk.id());

        assertThat(access.get("displayUrl")).isEqualTo("/pos-self-checkout/psc_current_token");
    }

    @Test
    void deletingAnOperationalSelfServiceKioskRevokesEngineAccessAndPreservesHistory() {
        var context = cashierContext();
        var kiosk = kiosk();
        given(repository.find(context, kiosk.id())).willReturn(Optional.of(kiosk));
        given(registry.requireByLegacyReference(
            context.companyId(), SelfServiceKioskService.OWNER_MODULE,
            PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE, kiosk.id()))
            .willReturn(definition(kiosk));
        given(repository.delete(context, kiosk.id())).willReturn(true);

        service.delete(context, kiosk.id(), "cleanup");

        then(registry).should().deleteDefinition(
            context.companyId(), SelfServiceKioskService.OWNER_MODULE,
            PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE,
            kiosk.id(), context.userId(), "cleanup");
        then(repository).should().delete(context, kiosk.id());
    }

    private void allowPublic(SelfServiceKioskRepository.KioskRecord kiosk) {
        given(repository.findById(kiosk.id())).willReturn(Optional.of(kiosk));
        given(repository.hasOperationalRegisterAssignment(
            kiosk.companyId(), kiosk.cashRegisterId(), kiosk.unitId(),
            kiosk.businessId(), kiosk.warehouseId())).willReturn(true);
    }

    private KioskResolvedDefinition definition(SelfServiceKioskRepository.KioskRecord kiosk) {
        return definition(
            kiosk, SelfServiceKioskService.OWNER_MODULE, SelfServiceKioskService.KIOSK_TYPE,
            kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId());
    }

    private KioskResolvedDefinition definition(
            SelfServiceKioskRepository.KioskRecord kiosk,
            String owner,
            String type,
            long companyId,
            Long unitId,
            Long businessId,
            Long locationId) {
        return new KioskResolvedDefinition(
            700L, companyId, owner, type, kiosk.id(), kiosk.code(), kiosk.name(),
            KioskDefinitionStatus.ACTIVE, unitId, businessId,
            locationId, KioskAccessLevel.PUBLIC, kiosk.expiresAt(),
            kiosk.tokenHint(), false, 1, 1);
    }

    private PosContext cashierContext() {
        return new PosContext(
            5L, 7L, "Cashier", "cashier", true, PosScope.businessOffice(2L, 3L));
    }

    private CashRegisterRecord register(boolean active, CashRegisterStatus status) {
        return new CashRegisterRecord(
            13L, 7L, 2L, 3L, 11L, "Almacén principal", "POS-01",
            "Caja principal", status, active, null, 5L, 5L,
            NOW.minusSeconds(60), NOW.minusSeconds(60), null, 1L, null, null);
    }

    private SelfServiceKioskRepository.KioskRecord kiosk() {
        return new SelfServiceKioskRepository.KioskRecord(
            17L, 7L, "Índice", 2L, "Unidad Norte", 3L, "Negocio Centro",
            11L, "Almacén principal", 13L, "POS-01", "Caja principal",
            "SELF-SERVICE-01", "Autoservicio principal", "ACTIVE", null, "tokenhint",
            true, true, 30, 120, 1L, NOW.minusSeconds(60), NOW.minusSeconds(60));
    }
}
