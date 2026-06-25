package com.indice.erp.pos.checkout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.status.ShiftStatus;
import com.indice.erp.pos.status.TicketStatus;
import com.indice.erp.pos.ticket.TicketItemRecord;
import com.indice.erp.pos.ticket.TicketRecord;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryDeductionServiceTest {

    @Mock InventoryDeductionRepository repository;

    @Test
    void stockTrackedProductDeductsInventoryAndCreatesMovement() {
        var service = new InventoryDeductionService(repository);
        when(repository.warehouseName(context(), 30L)).thenReturn("Main Warehouse");
        when(repository.deductAvailable(context(), 30L, 700L, BigDecimal.ONE)).thenReturn(true);

        var deducted = service.deduct(context(), shift(), ticket(), List.of(stockLine()), List.of(ticketItem()));

        var movementCaptor = ArgumentCaptor.forClass(InventoryMovementCommand.class);
        verify(repository).deductAvailable(context(), 30L, 700L, BigDecimal.ONE);
        verify(repository).insertMovement(eq(context()), movementCaptor.capture());
        assertThat(deducted).isTrue();
        assertThat(movementCaptor.getValue().movementNumber()).isEqualTo("POSO-100-1");
        assertThat(movementCaptor.getValue().reference()).isEqualTo("POS-1");
        assertThat(movementCaptor.getValue().metadataJson()).contains("POS_CHECKOUT", "posTicketId", "posTicketItemId");
    }

    @Test
    void serviceOrDigitalProductDoesNotDeductInventory() {
        var service = new InventoryDeductionService(repository);

        var deducted = service.deduct(context(), shift(), ticket(), List.of(serviceLine()), List.of(ticketItem()));

        assertThat(new ProductSnapshot(700L, "SKU-700", "Support", "Service", true).stockTracked()).isFalse();
        assertThat(new ProductSnapshot(701L, "SKU-701", "License", "Digital", true).stockTracked()).isFalse();
        assertThat(deducted).isFalse();
        verify(repository, never()).deductAvailable(any(), anyLong(), anyLong(), any());
        verify(repository, never()).insertMovement(any(), any());
    }

    @Test
    void insufficientStockRejectsCheckout() {
        var service = new InventoryDeductionService(repository);
        when(repository.warehouseName(context(), 30L)).thenReturn("Main Warehouse");
        when(repository.deductAvailable(context(), 30L, 700L, BigDecimal.ONE)).thenReturn(false);

        assertThatThrownBy(() -> service.deduct(context(), shift(), ticket(), List.of(stockLine()), List.of(ticketItem())))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Insufficient stock for Coffee in selected warehouse.");

        verify(repository, never()).insertMovement(any(), any());
    }

    private PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private ShiftRecord shift() {
        return new ShiftRecord(40L, 1L, 5L, 6L, 30L, 20L, "Register 1", 10L, null, ShiftStatus.OPEN,
            BigDecimal.ZERO, BigDecimal.ZERO, null, null, "MXN", Instant.now(), null, null, null,
            10L, null, Instant.now(), Instant.now(), 0L, null, null);
    }

    private TicketRecord ticket() {
        return new TicketRecord(100L, 1L, 5L, 6L, 30L, 20L, 40L, null, 500L, "POS-1",
            TicketStatus.COMPLETED, "POS", "MXN", new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO,
            new BigDecimal("10.0000"), new BigDecimal("10.0000"), BigDecimal.ZERO, "POS Customer",
            null, null, Instant.now(), 10L, null, Instant.now(), Instant.now(), 0L, null, null);
    }

    private TicketItemRecord ticketItem() {
        return new TicketItemRecord(200L, 1L, 100L, 700L, "SKU-700", "Coffee", "Product", BigDecimal.ONE,
            new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("10.0000"),
            "MXN", null, Instant.now());
    }

    private CheckoutLine stockLine() {
        return new CheckoutLine(700L, "SKU-700", "Coffee", "Product", BigDecimal.ONE,
            new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("10.0000"), "MXN", true);
    }

    private CheckoutLine serviceLine() {
        return new CheckoutLine(700L, "SKU-700", "Support", "Service", BigDecimal.ONE,
            new BigDecimal("10.0000"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("10.0000"), "MXN", false);
    }
}
