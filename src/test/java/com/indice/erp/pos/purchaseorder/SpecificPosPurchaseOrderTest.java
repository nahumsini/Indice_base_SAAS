package com.indice.erp.pos.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;

@ExtendWith(MockitoExtension.class)
class SpecificPosPurchaseOrderTest {

    @Mock PurchaseOrderRepository repository;
    @Mock BCryptPasswordEncoder passwordEncoder;
    @Mock ObjectStorageService objectStorageService;
    @Mock ObjectStorageProperties storageProperties;
    @Mock ExpenseService expenseService;

    @Test
    void createOrderLinksProductsToProvider() {
        var service = service();
        when(repository.findProvider(context(), 300L)).thenReturn(Optional.of(provider(300L)));
        when(repository.findWarehouse(context(), 30L)).thenReturn(Optional.of(warehouse()));
        when(repository.findProduct(context(), 700L)).thenReturn(Optional.of(product()));
        when(repository.nextOrderFolio(context())).thenReturn("PO-2026-0001");
        when(repository.insertOrder(eq(context()), eq(warehouse()), eq(provider(300L)), eq(PurchaseOrderStatus.DRAFT),
            eq(PurchaseOrderOrigin.POS_REPLENISHMENT), eq(null),
            eq("PO-2026-0001"), eq("MXN"), eq(LocalDate.parse("2026-06-25")),
            eq("Comprar para sucursal"), any(), any(), any(), any())).thenReturn(99L);
        when(repository.findOrder(context(), 99L)).thenReturn(Optional.of(order(PurchaseOrderStatus.DRAFT, 300L)));

        service.createOrder(context(), createRequest());

        var supplierCaptor = ArgumentCaptor.forClass(ProductSupplierRequest.class);
        verify(repository).upsertProductSupplier(eq(context()), supplierCaptor.capture());
        assertThat(supplierCaptor.getValue().productId()).isEqualTo(700L);
        assertThat(supplierCaptor.getValue().providerId()).isEqualTo(300L);
        assertThat(supplierCaptor.getValue().costAmount()).isEqualByComparingTo("45.5000");
        assertThat(supplierCaptor.getValue().currencyCode()).isEqualTo("MXN");
    }

    @Test
    void receiveOrderUpdatesInventoryAndMovement() {
        var service = service();
        var sentOrder = order(PurchaseOrderStatus.SENT, 300L);
        var receivedOrder = order(PurchaseOrderStatus.RECEIVED, 300L);
        when(repository.findOrder(context(), 99L)).thenReturn(Optional.of(sentOrder), Optional.of(receivedOrder));
        when(repository.nextReceiptNumber(context())).thenReturn("RCV-2026-0001");
        when(repository.insertReceipt(context(), sentOrder, "RCV-2026-0001", "Entrega parcial")).thenReturn(55L);

        service.receiveOrder(context(), 99L, new PurchaseOrderReceiveRequest(
            "Entrega parcial",
            List.of(new PurchaseOrderReceiveItemRequest(900L, new BigDecimal("2.0000")))
        ));

        verify(repository).insertReceiptItem(context(), 55L, sentOrder.items().getFirst(), new BigDecimal("2.0000"));
        verify(repository).incrementReceivedQuantity(context(), 900L, new BigDecimal("2.0000"));
        verify(repository).upsertInventoryBalance(context(), sentOrder, sentOrder.items().getFirst(), new BigDecimal("2.0000"));
        verify(repository).insertInventoryReceiptMovement(context(), sentOrder, sentOrder.items().getFirst(),
            new BigDecimal("2.0000"), "RCV-2026-0001");
        verify(repository).refreshOrderReceiveStatus(context(), 99L);
    }

    @Test
    void supplierInvoiceCannotUseOrderFromAnotherProvider() {
        var service = service();
        when(repository.findProvider(context(), 300L)).thenReturn(Optional.of(provider(300L)));
        when(repository.findOrder(context(), 99L)).thenReturn(Optional.of(order(PurchaseOrderStatus.SENT, 301L)));

        assertThatThrownBy(() -> service.submitSupplierInvoice(context(), invoiceRequest()))
            .isInstanceOf(PosApiException.class)
            .hasMessage("purchaseOrderId does not belong to providerId.");
    }

    private PurchaseOrderService service() {
        return new PurchaseOrderService(
            repository,
            passwordEncoder,
            objectStorageService,
            storageProperties,
            expenseService,
            new ObjectMapper()
        );
    }

    private PosContext context() {
        return new PosContext(10L, 1L, "Cashier", "admin", true, PosScope.corporateOffice());
    }

    private PurchaseOrderCreateRequest createRequest() {
        return new PurchaseOrderCreateRequest(
            300L,
            30L,
            "MXN",
            PurchaseOrderOrigin.POS_REPLENISHMENT,
            LocalDate.parse("2026-06-25"),
            "Comprar para sucursal",
            List.of(new PurchaseOrderItemRequest(
                700L,
                "SKU-700",
                "Coffee",
                new BigDecimal("3.0000"),
                new BigDecimal("45.5000"),
                new BigDecimal("16")
            ))
        );
    }

    private SupplierInvoiceRequest invoiceRequest() {
        return new SupplierInvoiceRequest(
            300L,
            99L,
            "INV-01",
            LocalDate.parse("2026-06-21"),
            LocalDate.parse("2026-07-05"),
            new BigDecimal("100.0000"),
            new BigDecimal("16.0000"),
            new BigDecimal("116.0000"),
            "MXN",
            null,
            null,
            "Proveedor"
        );
    }

    private PurchaseOrderRepository.ProviderRef provider(long id) {
        return new PurchaseOrderRepository.ProviderRef(id, "Proveedor Retail", "proveedor@example.com", 15);
    }

    private PurchaseOrderRepository.WarehouseRef warehouse() {
        return new PurchaseOrderRepository.WarehouseRef(30L, "Almacen Centro", 5L, 6L);
    }

    private PurchaseOrderRepository.ProductRef product() {
        return new PurchaseOrderRepository.ProductRef(700L, "SKU-700", "Coffee", new BigDecimal("40.0000"), "MXN");
    }

    private PurchaseOrderResponse order(PurchaseOrderStatus status, long providerId) {
        return new PurchaseOrderResponse(
            99L,
            1L,
            5L,
            6L,
            30L,
            "Almacen Centro",
            providerId,
            "Proveedor Retail",
            "proveedor@example.com",
            "PO-2026-0001",
            status,
            PurchaseOrderOrigin.POS_REPLENISHMENT,
            null,
            "MXN",
            new BigDecimal("136.5000"),
            new BigDecimal("21.8400"),
            new BigDecimal("158.3400"),
            LocalDate.parse("2026-06-25"),
            null,
            null,
            null,
            status == PurchaseOrderStatus.RECEIVED ? Instant.now() : null,
            null,
            "Comprar para sucursal",
            Instant.now(),
            List.of(new PurchaseOrderItemResponse(
                900L,
                700L,
                "SKU-700",
                "Coffee",
                new BigDecimal("3.0000"),
                BigDecimal.ZERO,
                new BigDecimal("3.0000"),
                new BigDecimal("45.5000"),
                new BigDecimal("0.1600"),
                new BigDecimal("136.5000"),
                new BigDecimal("21.8400"),
                new BigDecimal("158.3400")
            ))
        );
    }
}
