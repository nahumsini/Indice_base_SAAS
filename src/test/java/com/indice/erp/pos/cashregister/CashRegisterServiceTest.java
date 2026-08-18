package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
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

    private CashRegisterService service;

    @BeforeEach
    void setUp() {
        service = new CashRegisterService(
            repository, shiftRepository, new CashRegisterMapper(), new CashRegisterValidator());
    }

    @Test
    void ensuringAnExistingRegisterSynchronizesItsScopeFromTheWarehouse() {
        var stale = register(null, null, 1L);
        var synchronizedRegister = register(WAREHOUSE.unitId(), WAREHOUSE.businessId(), 2L);
        given(repository.findWarehouse(CONTEXT, WAREHOUSE.id())).willReturn(Optional.of(WAREHOUSE));
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
        given(repository.findWarehouse(CONTEXT, WAREHOUSE.id())).willReturn(Optional.of(WAREHOUSE));
        given(repository.findFirstActiveByWarehouse(CONTEXT, WAREHOUSE.id()))
            .willReturn(Optional.of(aligned));

        var response = service.ensureForWarehouse(CONTEXT, WAREHOUSE.id());

        assertThat(response.unitId()).isEqualTo(WAREHOUSE.unitId());
        assertThat(response.businessId()).isEqualTo(WAREHOUSE.businessId());
        then(repository).should(never()).synchronizeScopeFromWarehouse(
            CONTEXT, aligned.id(), WAREHOUSE);
    }

    private CashRegisterRecord register(Long unitId, Long businessId, long version) {
        var now = Instant.parse("2026-08-17T00:00:00Z");
        return new CashRegisterRecord(
            13L, CONTEXT.companyId(), unitId, businessId, WAREHOUSE.id(), WAREHOUSE.name(),
            "POS-01", "Caja principal", CashRegisterStatus.ACTIVE, true, null,
            CONTEXT.userId(), CONTEXT.userId(), now, now, null, version, null, null);
    }
}
