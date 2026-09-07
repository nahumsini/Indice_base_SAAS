package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.settlement.SettlementRuleRequest;
import com.indice.erp.pos.settlement.SettlementPolicyService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class CashRegisterServiceTest {

    private static final PosContext CONTEXT = new PosContext(
        5L, 7L, "Admin", "admin", true, PosScope.corporateOffice());
    private static final WarehouseSummary WAREHOUSE = new WarehouseSummary(
        11L, "WH-01", "Almacén principal", 2L, "Unidad Norte",
        3L, "Negocio Centro", "active");

    @Mock
    private CashRegisterRepository repository;
    @Mock
    private ShiftRepository shiftRepository;
    @Mock
    private SettlementPolicyService settlementPolicyService;

    private CashRegisterService service;

    @BeforeEach
    void setUp() {
        service = new CashRegisterService(
            repository, shiftRepository, new CashRegisterMapper(), new CashRegisterValidator(), settlementPolicyService);
    }

    @Test
    void ensuringAnExistingRegisterSynchronizesItsScopeFromTheWarehouse() {
        var stale = register(null, null, 1L);
        var synchronizedRegister = register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 2L);
        given(repository.findWarehouseForMutation(CONTEXT, WAREHOUSE.id())).willReturn(Optional.of(WAREHOUSE));
        given(repository.findFirstActiveByWarehouse(CONTEXT, WAREHOUSE.id()))
            .willReturn(Optional.of(stale), Optional.of(synchronizedRegister));
        given(repository.synchronizeScopeFromWarehouse(CONTEXT, stale.id(), WAREHOUSE))
            .willReturn(true);

        var response = service.ensureForWarehouse(CONTEXT, WAREHOUSE.id());

        assertThat(response.unitId()).isEqualTo(WAREHOUSE.unitId());
        assertThat(response.businessId()).isEqualTo(WAREHOUSE.businessId());
        assertThat(response.version()).isEqualTo(2L);
        then(repository).should().synchronizeScopeFromWarehouse(CONTEXT, stale.id(), WAREHOUSE);
    }

    @Test
    void ensuringAnAlignedRegisterDoesNotRewriteItsScope() {
        var aligned = register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 1L);
        given(repository.findWarehouseForMutation(CONTEXT, WAREHOUSE.id())).willReturn(Optional.of(WAREHOUSE));
        given(repository.findFirstActiveByWarehouse(CONTEXT, WAREHOUSE.id()))
            .willReturn(Optional.of(aligned));

        var response = service.ensureForWarehouse(CONTEXT, WAREHOUSE.id());

        assertThat(response.unitId()).isEqualTo(WAREHOUSE.unitId());
        assertThat(response.businessId()).isEqualTo(WAREHOUSE.businessId());
        then(repository).should(never()).synchronizeScopeFromWarehouse(
            CONTEXT, aligned.id(), WAREHOUSE);
    }

    @Test
    void creatingWithoutACodeAllocatesTheNextCompanySequenceUnderLock() {
        given(repository.findWarehouseForMutation(CONTEXT, WAREHOUSE.id())).willReturn(Optional.of(WAREHOUSE));
        given(repository.existsByCode(CONTEXT, "WH01-01", null)).willReturn(true);
        given(repository.existsByCode(CONTEXT, "WH01-02", null)).willReturn(false);
        given(repository.insert(any(), any())).willReturn(register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 1L));
        var request = new CashRegisterCreateRequest(
            WAREHOUSE.id(), null, "Caja secundaria", CashRegisterStatus.ACTIVE, true,
            null, null, null);

        service.create(CONTEXT, request);

        var command = ArgumentCaptor.forClass(CashRegisterCommand.class);
        then(repository).should().lockCodeAllocation(CONTEXT.companyId());
        then(repository).should().insert(org.mockito.ArgumentMatchers.eq(CONTEXT), command.capture());
        assertThat(command.getValue().code()).isEqualTo("WH01-02");
    }

    @Test
    void legacyUpdateWithoutSettlementFieldsPreservesRetainedCash() {
        var existing = register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 1L, new BigDecimal("250.00"));
        var saved = register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 2L, new BigDecimal("250.00"));
        given(repository.findById(CONTEXT, existing.id()))
            .willReturn(Optional.of(existing), Optional.of(saved), Optional.of(saved));
        given(repository.findWarehouseForMutation(CONTEXT, WAREHOUSE.id())).willReturn(Optional.of(WAREHOUSE));
        given(repository.update(any(), org.mockito.ArgumentMatchers.eq(existing.id()), any())).willReturn(true);
        var request = new CashRegisterUpdateRequest(
            WAREHOUSE.id(), existing.code(), "Caja actualizada", CashRegisterStatus.ACTIVE, true,
            null, null, null, null, null, null);

        service.update(CONTEXT, existing.id(), request);

        var command = ArgumentCaptor.forClass(CashRegisterCommand.class);
        then(repository).should().update(org.mockito.ArgumentMatchers.eq(CONTEXT),
            org.mockito.ArgumentMatchers.eq(existing.id()), command.capture());
        assertThat(command.getValue().retainedCashAmount()).isEqualByComparingTo("250.0000");
    }

    @Test
    void settlementPolicyCannotChangeWhileRegisterHasOpenShift() {
        var existing = register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 1L, BigDecimal.ZERO);
        given(repository.findById(CONTEXT, existing.id())).willReturn(Optional.of(existing));
        given(shiftRepository.hasBlockingShiftForRegister(CONTEXT, existing.id())).willReturn(true);
        var request = new CashRegisterUpdateRequest(
            WAREHOUSE.id(), existing.code(), existing.name(), CashRegisterStatus.ACTIVE, true,
            null, BigDecimal.ZERO, "MXN",
            List.of(new SettlementRuleRequest("CASH", 80L, "IMMEDIATE", true)), null, null);

        assertThatThrownBy(() -> service.update(CONTEXT, existing.id(), request))
            .isInstanceOf(com.indice.erp.pos.PosApiException.class)
            .hasMessageContaining("while a shift is open");

        then(repository).should(never()).update(any(), any(Long.class), any());
    }

    private CashRegisterRecord register(Long unitId, Long businessId, long version) {
        return register(unitId, businessId, version, BigDecimal.ZERO);
    }

    private CashRegisterRecord register(
            Long unitId,
            Long businessId,
            long version,
            BigDecimal retainedCashAmount) {
        var now = Instant.parse("2026-08-17T00:00:00Z");
        return new CashRegisterRecord(
            13L, CONTEXT.companyId(), unitId, businessId, WAREHOUSE.id(), WAREHOUSE.name(),
            "POS-01", "Caja principal", CashRegisterStatus.ACTIVE, true, null,
            retainedCashAmount, CONTEXT.userId(), CONTEXT.userId(), now, now, null, version, null, null);
    }
}
