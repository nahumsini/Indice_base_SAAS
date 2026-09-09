package com.indice.erp.pos.purchaseorder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderActionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionConvertRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemResolutionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionResponse;
import com.indice.erp.sales.ProcurementProductCatalogService;
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
    @Mock ProcurementProductCatalogService productCatalog;

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
    void receiveOrderAcceptsProviderConfirmedStatus() {
        var service = service();
        var confirmedOrder = order(PurchaseOrderStatus.CONFIRMED, 300L);
        var receivedOrder = order(PurchaseOrderStatus.RECEIVED, 300L);
        when(repository.findOrder(context(), 99L))
            .thenReturn(Optional.of(confirmedOrder), Optional.of(receivedOrder));
        when(repository.nextReceiptNumber(context())).thenReturn("RCV-2026-0002");
        when(repository.insertReceipt(context(), confirmedOrder, "RCV-2026-0002", "Entrega confirmada"))
            .thenReturn(56L);

        service.receiveOrder(context(), 99L, new PurchaseOrderReceiveRequest(
            "Entrega confirmada",
            List.of(new PurchaseOrderReceiveItemRequest(900L, new BigDecimal("2.0000")))
        ));

        verify(repository).insertReceiptItem(
            context(), 56L, confirmedOrder.items().getFirst(), new BigDecimal("2.0000"));
        verify(repository).refreshOrderReceiveStatus(context(), 99L);
    }

    @Test
    void confirmedOrderInvoiceWaitsForCompleteReceiptBeforeCreatingPayable() {
        var service = service();
        var invoice = supplierInvoice(71L);
        when(repository.findProvider(context(), 300L)).thenReturn(Optional.of(provider(300L)));
        when(repository.findOrder(context(), 99L))
            .thenReturn(Optional.of(order(PurchaseOrderStatus.CONFIRMED, 300L)));
        when(repository.insertSupplierInvoice(context(), invoiceRequest())).thenReturn(71L);
        when(repository.findSupplierInvoice(context(), 71L)).thenReturn(Optional.of(invoice));

        var result = service.submitSupplierInvoice(context(), invoiceRequest());

        assertThat(result.status()).isEqualTo(SupplierInvoiceStatus.SUBMITTED);
        verify(expenseService, never()).createDraft(any(), any());
        verify(repository, never()).linkSupplierInvoiceExpense(any(), eq(71L), anyLong());
    }

    @Test
    void finalReceiptCreatesAndLinksPayableForWaitingInvoice() {
        var service = service();
        var sentOrder = order(PurchaseOrderStatus.SENT, 300L);
        var receivedOrder = order(PurchaseOrderStatus.RECEIVED, 300L);
        var invoice = supplierInvoice(71L);
        var expense = expenseResponse();
        when(repository.findOrder(context(), 99L))
            .thenReturn(Optional.of(sentOrder), Optional.of(receivedOrder));
        when(repository.nextReceiptNumber(context())).thenReturn("RCV-2026-0003");
        when(repository.insertReceipt(context(), sentOrder, "RCV-2026-0003", "Recepción final"))
            .thenReturn(57L);
        when(repository.lockUnlinkedSupplierInvoicesForOrder(context(), 99L)).thenReturn(List.of(invoice));
        when(repository.findProvider(context(), 300L)).thenReturn(Optional.of(provider(300L)));
        when(expenseService.createDraft(any(), any())).thenReturn(expense);

        service.receiveOrder(context(), 99L, new PurchaseOrderReceiveRequest(
            "Recepción final",
            List.of(new PurchaseOrderReceiveItemRequest(900L, new BigDecimal("2.0000")))
        ));

        verify(expenseService).createDraft(any(), any());
        verify(repository).linkSupplierInvoiceExpense(context(), 71L, 501L);
    }

    @Test
    void conversionCreatesUnlistedProductThroughCatalogOwnerAndAuditsDecision() {
        var service = service();
        var submission = approvedUnlistedSubmission();
        var resolution = new ProcurementProductCatalogService.CatalogResolution(
            702L, "PROV-NEW", "Producto nuevo", null, null,
            new BigDecimal("75.0000"), "MXN", true);
        when(repository.lockSupplierSubmission(context(), 777L)).thenReturn(Optional.of(submission));
        when(repository.findWarehouse(context(), 30L)).thenReturn(Optional.of(warehouse()));
        when(repository.findProvider(context(), 300L)).thenReturn(Optional.of(provider(300L)));
        when(productCatalog.createNew(
            context(), null, "PROV-NEW", "Producto nuevo", "Descripción", "Bebidas", null,
            new BigDecimal("50.0000"), new BigDecimal("75.0000"), "MXN"))
            .thenReturn(resolution);
        when(repository.nextOrderFolio(context())).thenReturn("PO-2026-0002");
        when(repository.insertOrder(
            eq(context()), eq(warehouse()), eq(provider(300L)), eq(PurchaseOrderStatus.DRAFT),
            eq(PurchaseOrderOrigin.SUPPLIER_KIOSK), eq(777L), eq("PO-2026-0002"),
            eq("MXN"), eq(null), eq("Aprobado por inventarios"), any(), any(), any(), any()))
            .thenReturn(99L);
        when(repository.findOrder(context(), 99L))
            .thenReturn(Optional.of(order(PurchaseOrderStatus.DRAFT, 300L)));

        service.convertSupplierSubmission(context(), 777L, new SupplierSubmissionConvertRequest(
            30L, null, "Aprobado por inventarios", List.of(
                new SupplierSubmissionItemResolutionRequest(
                    778L, SupplierCatalogDecision.CREATE_NEW, null, null, "PROV-NEW",
                    "Producto nuevo", "Descripción", "Bebidas", null,
                    new BigDecimal("75.0000"), "Alta validada")
            )));

        verify(repository).resolveSupplierSubmissionItem(
            context(), 777L, 778L, 702L, SupplierSubmissionStatus.APPROVED,
            "Alta validada", SupplierCatalogDecision.CREATE_NEW);
        verify(repository).insertSupplierCatalogDecision(
            context(), submission, submission.items().getFirst(), SupplierCatalogDecision.CREATE_NEW,
            702L, null, null, new BigDecimal("75.0000"), "Alta validada");
        verify(repository).markSupplierSubmissionConverted(context(), 777L, 99L);
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

    @Test
    void providerCenterRejectsInvoiceBeforeOrderIsConfirmedOrReceived() {
        var service = service();
        when(repository.findOrder(any(PosContext.class), eq(99L)))
            .thenReturn(Optional.of(order(PurchaseOrderStatus.SENT, 300L)));

        assertThatThrownBy(() -> service.createProviderCenterSupplierInvoice(
            providerCenterAccess(), 99L, providerCenterInvoice("116.0000")))
            .isInstanceOf(PosApiException.class)
            .hasMessage("La orden debe estar confirmada o recibida antes de facturarla.");
    }

    @Test
    void providerCenterRejectsInvoiceWithInconsistentTotal() {
        var service = service();
        when(repository.findOrder(any(PosContext.class), eq(99L)))
            .thenReturn(Optional.of(order(PurchaseOrderStatus.CONFIRMED, 300L)));

        assertThatThrownBy(() -> service.createProviderCenterSupplierInvoice(
            providerCenterAccess(), 99L, providerCenterInvoice("115.0000")))
            .isInstanceOf(PosApiException.class)
            .hasMessage("El total de la factura debe ser igual al subtotal más impuestos.");
    }

    @Test
    void buyerCanReissueAnOrderAfterReviewingSupplierAdjustment() {
        var service = service();
        var clarification = order(PurchaseOrderStatus.NEEDS_CLARIFICATION, 300L);
        var reissued = order(PurchaseOrderStatus.SENT, 300L);
        when(repository.findOrder(context(), 99L))
            .thenReturn(Optional.of(clarification), Optional.of(reissued));
        when(repository.updateStatus(
            context(), 99L, PurchaseOrderStatus.SENT,
            "Solicitud revisada; se reenvía la orden.")).thenReturn(true);

        var result = service.sendOrder(
            context(), 99L,
            new PurchaseOrderActionRequest("Solicitud revisada; se reenvía la orden."));

        assertThat(result.status()).isEqualTo(PurchaseOrderStatus.SENT);
        verify(repository).updateStatus(
            context(), 99L, PurchaseOrderStatus.SENT,
            "Solicitud revisada; se reenvía la orden.");
    }

    private PurchaseOrderService service() {
        return new PurchaseOrderService(
            repository,
            passwordEncoder,
            objectStorageService,
            storageProperties,
            expenseService,
            new ObjectMapper(),
            org.mockito.Mockito.mock(com.indice.erp.billing.storage.CompanyStorageMeter.class),
            org.mockito.Mockito.mock(com.indice.erp.kiosk.engine.KioskIdentityCredentialService.class),
            productCatalog
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

    private SupplierInvoiceResponse supplierInvoice(long id) {
        return new SupplierInvoiceResponse(
            id, 300L, "Proveedor Retail", 99L, "PO-2026-0001", "INV-01",
            LocalDate.parse("2026-06-21"), LocalDate.parse("2026-07-05"),
            new BigDecimal("100.0000"), new BigDecimal("16.0000"),
            new BigDecimal("116.0000"), "MXN", SupplierInvoiceStatus.SUBMITTED,
            null, null, "Proveedor", null, null, null, Instant.now());
    }

    private ExpenseResponse expenseResponse() {
        return new ExpenseResponse(
            501L, 1L, 5L, 6L, 300L,
            null, null, null, 99L,
            "POS-INV-71", "Factura", null, null,
            new BigDecimal("100.0000"), new BigDecimal("16.0000"),
            new BigDecimal("116.0000"), BigDecimal.ZERO, new BigDecimal("116.0000"),
            "MXN",
            LocalDate.parse("2026-06-21"), LocalDate.parse("2026-07-05"), null, null,
            10L, null, null,
            null, null, null, 0,
            10L, 10L, Instant.now(), Instant.now(), null, 0L,
            null, null, null, false);
    }

    private SupplierSubmissionResponse approvedUnlistedSubmission() {
        var item = new SupplierSubmissionItemResponse(
            778L, null, "PROV-NEW", "Producto nuevo", "Descripción", null,
            BigDecimal.ONE, new BigDecimal("50.0000"), new BigDecimal("0.1600"),
            new BigDecimal("50.0000"), new BigDecimal("8.0000"),
            new BigDecimal("58.0000"), 5, BigDecimal.ONE,
            SupplierSubmissionStatus.APPROVED, null);
        return new SupplierSubmissionResponse(
            777L, 1L, 300L, "Proveedor Retail", "proveedor@example.com", null,
            "SUP-2026-0001", SupplierSubmissionStatus.APPROVED, "MXN",
            new BigDecimal("50.0000"), new BigDecimal("8.0000"),
            new BigDecimal("58.0000"), "Proveedor", "proveedor@example.com",
            Instant.now(), 10L, Instant.now(), null, null, null, Instant.now(), List.of(item));
    }

    private SupplierPortalInvoiceRequest providerCenterInvoice(String total) {
        return new SupplierPortalInvoiceRequest(
            null,
            "INV-PC-01",
            LocalDate.parse("2026-06-21"),
            LocalDate.parse("2026-07-05"),
            new BigDecimal("100.0000"),
            new BigDecimal("16.0000"),
            new BigDecimal(total),
            "MXN",
            null,
            null,
            "Proveedor"
        );
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord providerCenterAccess() {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            18L, 1L, "Indice", 300L, "Proveedor Retail", "proveedor@example.com", "PORTAL-ABC",
            "hash", "ACTIVE", Instant.now().plusSeconds(3600), "[]",
            5L, "Unidad Centro", 6L, "Negocio Centro");
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
