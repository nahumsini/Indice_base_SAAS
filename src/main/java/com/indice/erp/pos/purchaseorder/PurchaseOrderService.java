package com.indice.erp.pos.purchaseorder;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderActionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceReviewRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository.PurchaseOrderLineCommand;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseOrderService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final PurchaseOrderRepository repository;

    public PurchaseOrderService(PurchaseOrderRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listProductSuppliers(PosContext context) {
        var items = repository.listProductSuppliers(context);
        return Map.of("items", items, "count", items.size());
    }

    @Transactional
    public ProductSupplierResponse upsertProductSupplier(PosContext context, ProductSupplierRequest request) {
        requireProduct(context, request.productId());
        requireProvider(context, request.providerId());
        var id = repository.upsertProductSupplier(context, request);
        return repository.findProductSupplier(context, id).orElseThrow();
    }

    @Transactional
    public ProductSupplierResponse updateProductSupplier(
            PosContext context,
            long supplierLinkId,
            ProductSupplierRequest request) {
        requireProduct(context, request.productId());
        requireProvider(context, request.providerId());
        if (!repository.updateProductSupplier(context, supplierLinkId, request)) {
            throw PosApiException.notFound("Product supplier relationship not found.");
        }
        return repository.findProductSupplier(context, supplierLinkId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderListResponse listOrders(
            PosContext context,
            PurchaseOrderStatus status,
            Long providerId,
            Long warehouseId,
            LocalDate dateFrom,
            LocalDate dateTo) {
        var items = repository.listOrders(context, status, providerId, warehouseId, dateFrom, dateTo);
        return new PurchaseOrderListResponse(items, items.size());
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse getOrder(PosContext context, long orderId) {
        return requireOrder(context, orderId);
    }

    @Transactional
    public PurchaseOrderResponse createOrder(PosContext context, PurchaseOrderCreateRequest request) {
        var provider = requireProvider(context, request.providerId());
        var warehouse = repository.findWarehouse(context, request.warehouseId())
            .orElseThrow(() -> PosApiException.badRequest("warehouseId is invalid for POS scope."));
        var currency = normalizedCurrency(request.currencyCode());

        var lines = request.items().stream()
            .map(item -> toLineCommand(context, provider.id(), item, currency))
            .toList();
        var subtotal = sum(lines.stream().map(PurchaseOrderLineCommand::lineSubtotal).toList());
        var taxes = sum(lines.stream().map(PurchaseOrderLineCommand::lineTax).toList());
        var total = sum(lines.stream().map(PurchaseOrderLineCommand::lineTotal).toList());

        for (var line : lines) {
            repository.upsertProductSupplier(context, new ProductSupplierRequest(
                line.productId(),
                provider.id(),
                line.sku(),
                line.unitCost(),
                currency,
                null,
                BigDecimal.ONE,
                false,
                true,
                "Linked from POS purchase order"
            ));
        }

        var orderId = repository.insertOrder(
            context,
            warehouse,
            provider,
            PurchaseOrderStatus.DRAFT,
            repository.nextOrderFolio(context),
            currency,
            request.expectedDate(),
            request.notes(),
            subtotal,
            taxes,
            total,
            lines
        );
        return requireOrder(context, orderId);
    }

    @Transactional
    public PurchaseOrderResponse requestOrder(PosContext context, long orderId, PurchaseOrderActionRequest request) {
        var order = requireOrder(context, orderId);
        requireStatus(order, PurchaseOrderStatus.DRAFT);
        updateStatus(context, orderId, PurchaseOrderStatus.REQUESTED, request);
        return requireOrder(context, orderId);
    }

    @Transactional
    public PurchaseOrderResponse approveOrder(PosContext context, long orderId, PurchaseOrderActionRequest request) {
        var order = requireOrder(context, orderId);
        requireOneOf(order, PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.REQUESTED);
        updateStatus(context, orderId, PurchaseOrderStatus.APPROVED, request);
        return requireOrder(context, orderId);
    }

    @Transactional
    public PurchaseOrderResponse sendOrder(PosContext context, long orderId, PurchaseOrderActionRequest request) {
        var order = requireOrder(context, orderId);
        requireOneOf(order, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.REQUESTED);
        updateStatus(context, orderId, PurchaseOrderStatus.SENT, request);
        return requireOrder(context, orderId);
    }

    @Transactional
    public PurchaseOrderResponse cancelOrder(PosContext context, long orderId, PurchaseOrderActionRequest request) {
        var order = requireOrder(context, orderId);
        if (order.status() == PurchaseOrderStatus.RECEIVED) {
            throw PosApiException.conflict("Received purchase orders cannot be cancelled.");
        }
        updateStatus(context, orderId, PurchaseOrderStatus.CANCELLED, request);
        return requireOrder(context, orderId);
    }

    @Transactional
    public PurchaseOrderResponse receiveOrder(PosContext context, long orderId, PurchaseOrderReceiveRequest request) {
        var order = requireOrder(context, orderId);
        requireOneOf(order, PurchaseOrderStatus.SENT, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED);
        var receiptNumber = repository.nextReceiptNumber(context);
        var receiptId = repository.insertReceipt(context, order, receiptNumber, request.notes());
        for (var receiveItem : request.items()) {
            var orderItem = order.items().stream()
                .filter(item -> item.id().equals(receiveItem.orderItemId()))
                .findFirst()
                .orElseThrow(() -> PosApiException.badRequest("orderItemId is invalid for this purchase order."));
            if (receiveItem.receivedQuantity().compareTo(orderItem.pendingQuantity()) > 0) {
                throw PosApiException.badRequest("Received quantity exceeds pending quantity for " + orderItem.productName() + ".");
            }
            repository.insertReceiptItem(context, receiptId, orderItem, receiveItem.receivedQuantity());
            repository.incrementReceivedQuantity(context, orderItem.id(), receiveItem.receivedQuantity());
            repository.upsertInventoryBalance(context, order, orderItem, receiveItem.receivedQuantity());
            repository.insertInventoryReceiptMovement(context, order, orderItem, receiveItem.receivedQuantity(), receiptNumber);
        }
        repository.refreshOrderReceiveStatus(context, orderId);
        return requireOrder(context, orderId);
    }

    @Transactional(readOnly = true)
    public SupplierInvoiceListResponse listSupplierInvoices(
            PosContext context,
            SupplierInvoiceStatus status,
            Long providerId) {
        var items = repository.listSupplierInvoices(context, status, providerId);
        return new SupplierInvoiceListResponse(items, items.size());
    }

    @Transactional
    public SupplierInvoiceResponse submitSupplierInvoice(PosContext context, SupplierInvoiceRequest request) {
        var provider = requireProvider(context, request.providerId());
        if (request.purchaseOrderId() != null) {
            var order = requireOrder(context, request.purchaseOrderId());
            if (!order.providerId().equals(provider.id())) {
                throw PosApiException.badRequest("purchaseOrderId does not belong to providerId.");
            }
        }
        var invoiceId = repository.insertSupplierInvoice(context, request);
        return repository.findSupplierInvoice(context, invoiceId).orElseThrow();
    }

    @Transactional
    public SupplierInvoiceResponse reviewSupplierInvoice(
            PosContext context,
            long invoiceId,
            SupplierInvoiceReviewRequest request) {
        if (request.status() != SupplierInvoiceStatus.MATCHED
                && request.status() != SupplierInvoiceStatus.APPROVED_FOR_PAYMENT
                && request.status() != SupplierInvoiceStatus.REJECTED) {
            throw PosApiException.badRequest("Invoice review status is invalid.");
        }
        if (!repository.reviewSupplierInvoice(context, invoiceId, request.status(), request.reviewNote())) {
            throw PosApiException.notFound("Supplier invoice not found.");
        }
        return repository.findSupplierInvoice(context, invoiceId).orElseThrow();
    }

    private PurchaseOrderLineCommand toLineCommand(
            PosContext context,
            long providerId,
            PurchaseOrderItemRequest item,
            String currency) {
        var product = requireProduct(context, item.productId());
        var quantity = item.quantity();
        var unitCost = item.unitCost();
        var taxRate = normalizedTaxRate(item.taxRate());
        var lineSubtotal = money(quantity.multiply(unitCost));
        var lineTax = money(lineSubtotal.multiply(taxRate));
        var lineTotal = money(lineSubtotal.add(lineTax));
        return new PurchaseOrderLineCommand(
            product.id(),
            item.sku() == null || item.sku().isBlank() ? product.sku() : item.sku().trim(),
            item.productName() == null || item.productName().isBlank() ? product.name() : item.productName().trim(),
            quantity,
            unitCost,
            taxRate,
            lineSubtotal,
            lineTax,
            lineTotal
        );
    }

    private PurchaseOrderRepository.ProductRef requireProduct(PosContext context, long productId) {
        return repository.findProduct(context, productId)
            .orElseThrow(() -> PosApiException.badRequest("productId is invalid for POS scope."));
    }

    private PurchaseOrderRepository.ProviderRef requireProvider(PosContext context, long providerId) {
        return repository.findProvider(context, providerId)
            .orElseThrow(() -> PosApiException.badRequest("providerId is invalid for POS scope."));
    }

    private PurchaseOrderResponse requireOrder(PosContext context, long orderId) {
        return repository.findOrder(context, orderId)
            .orElseThrow(() -> PosApiException.notFound("Purchase order not found."));
    }

    private void updateStatus(
            PosContext context,
            long orderId,
            PurchaseOrderStatus status,
            PurchaseOrderActionRequest request) {
        if (!repository.updateStatus(context, orderId, status, request == null ? null : request.note())) {
            throw PosApiException.notFound("Purchase order not found.");
        }
    }

    private void requireStatus(PurchaseOrderResponse order, PurchaseOrderStatus expected) {
        if (order.status() != expected) {
            throw PosApiException.conflict("Purchase order must be " + expected + ".");
        }
    }

    private void requireOneOf(PurchaseOrderResponse order, PurchaseOrderStatus... statuses) {
        for (var status : statuses) {
            if (order.status() == status) {
                return;
            }
        }
        throw PosApiException.conflict("Purchase order status does not allow this action.");
    }

    private BigDecimal normalizedTaxRate(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return value.compareTo(BigDecimal.ONE) > 0 ? value.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP) : value;
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).setScale(4, RoundingMode.HALF_UP);
    }

    private String normalizedCurrency(String value) {
        return value == null || value.isBlank() ? "MXN" : value.trim().toUpperCase();
    }
}
