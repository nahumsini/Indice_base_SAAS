package com.indice.erp.pos.receipt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.providers.ProviderService;
import com.indice.erp.finance.providers.ProviderStatus;
import com.indice.erp.finance.providers.dto.ProviderResponse;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashmovement.CashMovementService;
import com.indice.erp.pos.cashmovement.CashMovementType;
import com.indice.erp.pos.cashmovement.dto.CashMovementResponse;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.status.ShiftStatus;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PaidInventoryReceiptServiceTest {
    @Mock PaidInventoryReceiptRepository repository;
    @Mock CashRegisterService cashRegisters;
    @Mock ShiftRepository shifts;
    @Mock CashMovementService cashMovements;
    @Mock TreasuryService treasury;
    @Mock ProviderService providers;
    @Mock CompanyStorageMeter storageMeter;
    @Mock ObjectStorageService objectStorage;
    @Mock ObjectStorageProperties storageProperties;

    @Test
    void cashReceiptUsesRegisterWarehouseAndCreatesCashOut() {
        when(cashRegisters.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shifts.findByIdForUpdate(context(), 40L)).thenReturn(Optional.of(shift()));
        when(repository.requireProduct(context(), 700L)).thenReturn(product("Piece"));
        when(providers.get(any(), eq(900L))).thenReturn(provider());
        when(repository.insertReceipt(eq(context()), eq("test-key"), any(), any(), eq(5L), eq(6L),
            eq(30L), eq(20L), eq(40L), eq(900L), eq("Proveedor"), eq("CASH"), eq(null),
            eq(new BigDecimal("20.00")), eq(new BigDecimal("0.00")), eq(new BigDecimal("20.00")),
            eq("MXN"), eq(null), any()))
            .thenReturn(100L);
        when(repository.addItemAndInventory(eq(context()), eq(100L), any(), eq(5L), eq(6L), eq(30L),
            eq("Principal"), eq(product("Piece")), eq(new BigDecimal("2.000")),
            eq(new BigDecimal("10.0000")), eq(new BigDecimal("10.0000")), eq(new BigDecimal("0.000000")),
            eq(false), eq(null), eq(null), eq(new BigDecimal("20.00")), eq(new BigDecimal("0.00")),
            eq(new BigDecimal("20.00")))).thenReturn(200L);
        when(cashMovements.create(eq(context()), any())).thenReturn(cashMovement());

        var result = service().create(context(), request("CASH", null, "Piece", new BigDecimal("2")));

        assertThat(result.warehouseId()).isEqualTo(30L);
        assertThat(result.totalAmount()).isEqualByComparingTo("20");
        verify(cashMovements).create(eq(context()), any());
        verify(repository).linkPayout(context(), 100L, 300L, null);
        verify(treasury, never()).post(any());
    }

    @Test
    void excludedTaxIsAddedToPayoutButNotInventoryUnitCost() {
        when(cashRegisters.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shifts.findByIdForUpdate(context(), 40L)).thenReturn(Optional.of(shift()));
        when(repository.requireProduct(context(), 700L)).thenReturn(product("Piece"));
        when(providers.get(any(), eq(900L))).thenReturn(provider());
        when(repository.insertReceipt(eq(context()), eq("tax-key"), any(), any(), eq(5L), eq(6L),
            eq(30L), eq(20L), eq(40L), eq(900L), eq("Proveedor"), eq("CASH"), eq(null),
            eq(new BigDecimal("20.00")), eq(new BigDecimal("3.20")), eq(new BigDecimal("23.20")),
            eq("MXN"), eq(null), any())).thenReturn(101L);
        when(repository.addItemAndInventory(eq(context()), eq(101L), any(), eq(5L), eq(6L), eq(30L),
            eq("Principal"), eq(product("Piece")), eq(new BigDecimal("2.000")),
            eq(new BigDecimal("10.0000")), eq(new BigDecimal("10.0000")), eq(new BigDecimal("0.160000")),
            eq(false), eq("mx_iva_16"), eq("IVA 16%"), eq(new BigDecimal("20.00")),
            eq(new BigDecimal("3.20")), eq(new BigDecimal("23.20")))).thenReturn(201L);
        when(cashMovements.create(eq(context()), any())).thenReturn(cashMovement());

        var request = new PaidInventoryReceiptDtos.CreateRequest(
            "tax-key", 20L, 40L, 900L, "MXN", "CASH", null, null, null,
            List.of(new PaidInventoryReceiptDtos.ItemRequest(
                new PaidInventoryReceiptDtos.ProductInput(700L, null, null, null, "Piece", null),
                new BigDecimal("2"), new BigDecimal("10"), new BigDecimal("0.16"), false,
                "mx_iva_16", "IVA 16%")));

        var result = service().create(context(), request);

        assertThat(result.subtotalAmount()).isEqualByComparingTo("20");
        assertThat(result.taxAmount()).isEqualByComparingTo("3.20");
        assertThat(result.totalAmount()).isEqualByComparingTo("23.20");
    }

    @Test
    void pieceProductRejectsAWeightUnitBeforeWriting() {
        when(cashRegisters.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shifts.findByIdForUpdate(context(), 40L)).thenReturn(Optional.of(shift()));
        when(repository.requireProduct(context(), 700L)).thenReturn(product("Piece"));
        when(providers.get(any(), eq(900L))).thenReturn(provider());

        assertThatThrownBy(() -> service().create(context(), request("CASH", null, "Kilogram", BigDecimal.ONE)))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Receipt quantity unit must match the product inventory unit.");

        verify(cashMovements, never()).create(any(), any());
    }

    @Test
    void transferRequiresAnAccount() {
        when(cashRegisters.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shifts.findByIdForUpdate(context(), 40L)).thenReturn(Optional.of(shift()));

        assertThatThrownBy(() -> service().create(context(), request("TRANSFER", null, "Piece", BigDecimal.ONE)))
            .isInstanceOf(PosApiException.class)
            .hasMessage("A payment account is required for transfer payouts.");
    }

    @Test
    void pieceProductRejectsFractionalQuantityBeforeWriting() {
        when(cashRegisters.requireOperationalRegister(context(), 20L)).thenReturn(register());
        when(shifts.findByIdForUpdate(context(), 40L)).thenReturn(Optional.of(shift()));
        when(repository.requireProduct(context(), 700L)).thenReturn(product("Piece"));
        when(providers.get(any(), eq(900L))).thenReturn(provider());

        assertThatThrownBy(() -> service().create(context(), request("CASH", null, "Piece", new BigDecimal("1.5"))))
            .isInstanceOf(PosApiException.class)
            .hasMessage("Products measured by piece require a whole quantity.");
    }

    @Test
    void optionalActivationPreservesLegacyIdempotencyFingerprintShape() {
        var legacy = new PaidInventoryReceiptDtos.ProductInput(700L, null, null, null, "Piece", null);
        assertThat(com.indice.erp.pos.PosJsonSupport.toJson(legacy)).isEqualTo(
            "{\"productId\":700,\"name\":null,\"sku\":null,\"category\":null,\"inventoryUnit\":\"Piece\",\"salePrice\":null}");
    }

    private PaidInventoryReceiptService service() {
        return new PaidInventoryReceiptService(repository, cashRegisters, shifts, cashMovements, treasury,
            providers, storageMeter, objectStorage, storageProperties);
    }

    private PaidInventoryReceiptDtos.CreateRequest request(String method, Long account, String unit, BigDecimal quantity) {
        return new PaidInventoryReceiptDtos.CreateRequest("test-key", 20L, 40L, 900L, "MXN", method, account, null, null,
            List.of(new PaidInventoryReceiptDtos.ItemRequest(
                new PaidInventoryReceiptDtos.ProductInput(700L, null, null, null, unit, null),
                quantity, new BigDecimal("10"), BigDecimal.ZERO, false, null, null)));
    }

    private PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private PaidInventoryReceiptRepository.ProductRow product(String unit) {
        return new PaidInventoryReceiptRepository.ProductRow(
            700L, "Artículo", "SKU", "Otros", "MXN", unit, new BigDecimal("10"));
    }

    private ProviderResponse provider() {
        return new ProviderResponse(900L, 1L, null, null, "Proveedor", null, null, null, null, null,
            0, ProviderStatus.ACTIVE, null, 10L, 10L, Instant.now(), Instant.now(), null, 0L, null, null);
    }

    private CashMovementResponse cashMovement() {
        return new CashMovementResponse(300L, 1L, 5L, 6L, 30L, 20L, 40L, CashMovementType.CASH_OUT,
            new BigDecimal("20"), "MXN", "Receipt", null, 10L, Instant.now(), null);
    }

    private CashRegisterRecord register() {
        return new CashRegisterRecord(20L, 1L, 5L, 6L, 30L, "Principal", "CAJA-1", "Caja 1",
            CashRegisterStatus.ACTIVE, true, null, BigDecimal.ZERO, 10L, 10L, Instant.now(), Instant.now(), null,
            0L, null, null);
    }

    private ShiftRecord shift() {
        return new ShiftRecord(40L, 1L, 5L, 6L, 30L, 20L, "Caja 1", 10L, null, ShiftStatus.OPEN,
            new BigDecimal("100"), new BigDecimal("100"), null, null, "MXN", Instant.now(), null, null, null,
            10L, null, Instant.now(), Instant.now(), 0L, null, null);
    }
}
