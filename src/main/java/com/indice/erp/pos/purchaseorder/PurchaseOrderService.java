package com.indice.erp.pos.purchaseorder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderActionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderReceiveRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceReviewRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessPinRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessStatusRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalContextResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentRegisterRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalLoginRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionConvertRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionListResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionReviewRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository.PurchaseOrderLineCommand;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository.SupplierSubmissionLineCommand;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PurchaseOrderService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int PUBLIC_LINK_ENTROPY_BYTES = 24;
    private static final long MAX_SUPPLIER_DOCUMENT_SIZE_BYTES = 15L * 1024L * 1024L;
    private static final Set<String> SUPPLIER_DOCUMENT_CONTENT_TYPES = Set.of(
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "text/xml",
        "application/xml",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final PurchaseOrderRepository repository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties storageProperties;
    private final ExpenseService expenseService;
    private final ObjectMapper objectMapper;
    private final CompanyStorageMeter storageMeter;

    public PurchaseOrderService(
            PurchaseOrderRepository repository,
            BCryptPasswordEncoder passwordEncoder,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties storageProperties,
            ExpenseService expenseService,
            ObjectMapper objectMapper,
            CompanyStorageMeter storageMeter) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.expenseService = expenseService;
        this.objectMapper = objectMapper;
        this.storageMeter = storageMeter;
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
            PurchaseOrderOrigin origin,
            Long providerId,
            Long warehouseId,
            LocalDate dateFrom,
            LocalDate dateTo) {
        var items = repository.listOrders(context, status, origin, providerId, warehouseId, dateFrom, dateTo);
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
            request.origin() == null ? PurchaseOrderOrigin.POS_REPLENISHMENT : request.origin(),
            null,
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

    @Transactional(readOnly = true)
    public SupplierSubmissionListResponse listSupplierSubmissions(
            PosContext context,
            SupplierSubmissionStatus status,
            Long providerId,
            LocalDate dateFrom,
            LocalDate dateTo) {
        var items = repository.listSupplierSubmissions(context, status, providerId, dateFrom, dateTo);
        return new SupplierSubmissionListResponse(items, items.size());
    }

    @Transactional(readOnly = true)
    public SupplierSubmissionResponse getSupplierSubmission(PosContext context, long submissionId) {
        return requireSupplierSubmission(context, submissionId);
    }

    @Transactional(readOnly = true)
    public SupplierPortalAccessListResponse listSupplierPortalAccess(PosContext context) {
        var items = repository.listSupplierPortalAccess(context).stream()
            .map(this::effectiveSupplierPortalAccess)
            .toList();
        return new SupplierPortalAccessListResponse(items, items.size());
    }

    @Transactional
    public SupplierPortalAccessResponse createSupplierPortalAccess(
            PosContext context,
            SupplierPortalAccessRequest request) {
        requireProvider(context, request.providerId());
        if (request.expiresAt() != null && !request.expiresAt().isAfter(Instant.now())) {
            throw PosApiException.badRequest("Supplier portal expiration must be in the future.");
        }
        var portalCode = portalCodeOrGenerate(context, request.portalCode());
        var status = request.status() == null || request.status().isBlank()
            ? "ACTIVE"
            : request.status().trim().toUpperCase(Locale.ROOT);
        if (!"ACTIVE".equals(status)) {
            throw PosApiException.badRequest("Supplier portal status is invalid.");
        }
        var normalized = new SupplierPortalAccessRequest(
            request.providerId(),
            request.unitId(),
            request.businessId(),
            portalCode,
            request.pin(),
            status,
            request.expiresAt()
        );
        var id = repository.insertSupplierPortalAccess(
            context,
            normalized,
            portalCode,
            passwordEncoder.encode(request.pin().trim())
        );
        return effectiveSupplierPortalAccess(repository.findSupplierPortalAccess(context, id).orElseThrow());
    }

    /**
     * Rollback-mode creation keeps the legacy response/lifecycle semantics, but new
     * public links must retain the same high-entropy, identifier-free security
     * boundary as Engine mode.
     */
    @Transactional
    public SupplierPortalAccessResponse createSupplierPortalAccessLegacy(
            PosContext context,
            SupplierPortalAccessRequest request) {
        requireProvider(context, request.providerId());
        var portalCode = portalCodeOrGenerate(context, null);
        var status = request.status() == null || request.status().isBlank()
            ? "ACTIVE" : request.status().trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACTIVE", "PAUSED", "EXPIRED", "REVOKED").contains(status)) {
            throw PosApiException.badRequest("Supplier portal status is invalid.");
        }
        var normalized = new SupplierPortalAccessRequest(
            request.providerId(), request.unitId(), request.businessId(), portalCode, request.pin(), status, null);
        var id = repository.insertSupplierPortalAccess(
            context, normalized, portalCode, passwordEncoder.encode(request.pin().trim()));
        return repository.findSupplierPortalAccess(context, id).orElseThrow();
    }

    @Transactional
    public SupplierPortalAccessResponse updateSupplierPortalAccessStatus(
            PosContext context,
            long accessId,
            SupplierPortalAccessStatusRequest request) {
        var status = normalizeSupplierPortalManualStatus(request.status());
        if (!repository.updateSupplierPortalAccessStatus(context, accessId, status)) {
            throw PosApiException.notFound("Supplier portal access not found.");
        }
        return effectiveSupplierPortalAccess(repository.findSupplierPortalAccess(context, accessId).orElseThrow());
    }

    @Transactional
    public SupplierPortalAccessResponse changeSupplierPortalAccessPin(
            PosContext context,
            long accessId,
            SupplierPortalAccessPinRequest request) {
        if (!repository.updateSupplierPortalAccessPin(
                context,
                accessId,
                passwordEncoder.encode(request.pin().trim()))) {
            throw PosApiException.notFound("Supplier portal access not found.");
        }
        return effectiveSupplierPortalAccess(repository.findSupplierPortalAccess(context, accessId).orElseThrow());
    }

    @Transactional
    public SupplierPortalAccessResponse resetSupplierPortalAccessLink(PosContext context, long accessId) {
        var current = repository.findSupplierPortalAccess(context, accessId)
            .orElseThrow(() -> PosApiException.notFound("Supplier portal access not found."));
        if ("REVOKED".equalsIgnoreCase(current.status())) {
            throw PosApiException.conflict("A revoked supplier portal cannot reset its link.");
        }
        var portalCode = portalCodeOrGenerate(context, null);
        if (!repository.updateSupplierPortalAccessCode(context, accessId, portalCode)) {
            throw PosApiException.notFound("Supplier portal access not found.");
        }
        return effectiveSupplierPortalAccess(repository.findSupplierPortalAccess(context, accessId).orElseThrow());
    }

    @Transactional(readOnly = true)
    public SupplierPortalContextResponse authenticateSupplierPortal(
            String portalCode,
            SupplierPortalLoginRequest request) {
        var access = requireActivePortalAccess(portalCode, request.pin());
        return supplierPortalView(access);
    }

    @Transactional(readOnly = true)
    public SupplierPortalContextResponse supplierPortalContext(
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        requireOperationalPortalAccess(access);
        return supplierPortalView(access);
    }

    @Transactional
    public SupplierPortalDocumentUploadResponse createPublicSupplierInvoiceUpload(
            String portalCode,
            SupplierPortalDocumentUploadRequest request) {
        var access = requireActivePortalAccess(portalCode, request.pin());
        return createPublicSupplierInvoiceUpload(access, request);
    }

    @Transactional
    public SupplierPortalDocumentUploadResponse createPublicSupplierInvoiceUpload(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalDocumentUploadRequest request) {
        requireOperationalPortalAccess(access);
        requireSupplierDocumentStorage();
        var fileName = requireSupplierDocumentFileName(request.fileName());
        var contentType = requireSupplierDocumentContentType(request.contentType(), fileName);
        var sizeBytes = requireSupplierDocumentSize(request.sizeBytes());
        var objectKey = buildSupplierInvoiceDocumentObjectKey(access.companyId(), access.id(), fileName);
        var upload = storageMeter.presign(
            access.companyId(),
            "POS",
            supplierDocumentsBucket(),
            objectKey,
            contentType,
            sizeBytes,
            storageProperties.getMinio().getPresignExpirySeconds()
        );
        return new SupplierPortalDocumentUploadResponse(
            upload.objectKey(),
            upload.objectKey(),
            upload.uploadUrl(),
            upload.uploadUrl(),
            upload.expiresAt(),
            upload.expiresAt().toString(),
            upload.uploadHeaders(),
            upload.uploadHeaders(),
            fileName,
            contentType,
            sizeBytes
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> registerPublicSupplierInvoiceUpload(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalDocumentRegisterRequest request) {
        requireOperationalPortalAccess(access);
        var fileName = requireSupplierDocumentFileName(request.fileName());
        var contentType = requireSupplierDocumentContentType(request.contentType(), fileName);
        var sizeBytes = requireSupplierDocumentSize(request.sizeBytes());
        var objectKey = requirePublicSupplierDocumentReference(access, request.objectKey());
        storageMeter.commit(access.companyId(), supplierDocumentsBucket(), objectKey, sizeBytes);
        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("object_key", objectKey);
        result.put("objectKey", objectKey);
        result.put("file_name", fileName);
        result.put("content_type", contentType);
        result.put("size_bytes", sizeBytes);
        result.put("registered", true);
        return result;
    }

    @Transactional
    public SupplierSubmissionResponse createPublicSupplierSubmission(
            String portalCode,
            SupplierPortalSubmissionRequest request) {
        var access = requireActivePortalAccess(portalCode, request.pin());
        return createPublicSupplierSubmission(access, request);
    }

    @Transactional
    public SupplierSubmissionResponse createPublicSupplierSubmission(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalSubmissionRequest request) {
        requireOperationalPortalAccess(access);
        for (var item : request.items()) {
            if (trimToNull(item.imageUrl()) != null) {
                throw PosApiException.badRequest(
                    "External image URLs are not accepted by the supplier portal.");
            }
            if (item.productId() != null && !repository.supplierPortalProductAllowed(
                    access.companyId(), access.providerId(), item.productId())) {
                throw PosApiException.badRequest("productId is not available for this supplier portal.");
            }
        }
        var context = supplierPortalPosContext(access);
        var submission = new SupplierSubmissionCreateRequest(
            access.providerId(),
            access.id(),
            request.currencyCode(),
            request.submittedByName(),
            request.submittedByEmail(),
            request.notes(),
            request.items()
        );
        return createSupplierSubmission(context, submission);
    }

    @Transactional
    public SupplierInvoiceResponse createPublicSupplierInvoice(
            String portalCode,
            SupplierPortalInvoiceRequest request) {
        var access = requireActivePortalAccess(portalCode, request.pin());
        return createPublicSupplierInvoice(access, request);
    }

    @Transactional
    public SupplierInvoiceResponse createPublicSupplierInvoice(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalInvoiceRequest request) {
        requireOperationalPortalAccess(access);
        var context = supplierPortalPosContext(access);
        var documentReference = request.documentUrl() == null
            ? null : requirePublicSupplierDocumentReference(access, request.documentUrl());
        var invoice = new SupplierInvoiceRequest(
            access.providerId(),
            null,
            request.invoiceNumber(),
            request.invoiceDate(),
            request.dueDate(),
            request.subtotalAmount(),
            request.taxAmount(),
            request.totalAmount(),
            request.currencyCode(),
            request.notes(),
            documentReference,
            request.submittedByName()
        );
        return submitSupplierInvoice(context, invoice);
    }

    @Transactional
    public void deleteSupplierPortalAccess(PosContext context, long accessId) {
        if (!repository.deleteSupplierPortalAccess(context, accessId)) {
            throw PosApiException.notFound("Supplier portal access not found.");
        }
    }

    @Transactional
    public SupplierSubmissionResponse createSupplierSubmission(
            PosContext context,
            SupplierSubmissionCreateRequest request) {
        var provider = requireProvider(context, request.providerId());
        if (request.portalAccessId() != null
                && !repository.portalAccessBelongsToProvider(context, request.portalAccessId(), provider.id())) {
            throw PosApiException.badRequest("portalAccessId is invalid for this provider.");
        }
        var currency = normalizedCurrency(request.currencyCode());
        var lines = request.items().stream()
            .map(item -> toSupplierSubmissionLineCommand(context, item, currency))
            .toList();
        var subtotal = sum(lines.stream().map(SupplierSubmissionLineCommand::lineSubtotal).toList());
        var taxes = sum(lines.stream().map(SupplierSubmissionLineCommand::lineTax).toList());
        var total = sum(lines.stream().map(SupplierSubmissionLineCommand::lineTotal).toList());

        var submissionId = repository.insertSupplierSubmission(
            context,
            provider,
            request,
            repository.nextSubmissionNumber(context),
            subtotal,
            taxes,
            total,
            lines
        );
        return requireSupplierSubmission(context, submissionId);
    }

    @Transactional
    public SupplierSubmissionResponse reviewSupplierSubmission(
            PosContext context,
            long submissionId,
            SupplierSubmissionReviewRequest request) {
        requireSupplierSubmission(context, submissionId);
        if (request.status() == SupplierSubmissionStatus.SUPPLIER_DRAFT
                || request.status() == SupplierSubmissionStatus.SUBMITTED
                || request.status() == SupplierSubmissionStatus.CONVERTED_TO_PURCHASE_ORDER) {
            throw PosApiException.badRequest("Supplier submission review status is invalid.");
        }
        if (!repository.updateSupplierSubmissionStatus(context, submissionId, request.status(), request.reviewNote())) {
            throw PosApiException.notFound("Supplier submission not found.");
        }
        return requireSupplierSubmission(context, submissionId);
    }

    @Transactional
    public PurchaseOrderResponse convertSupplierSubmission(
            PosContext context,
            long submissionId,
            SupplierSubmissionConvertRequest request) {
        var submission = requireSupplierSubmission(context, submissionId);
        if (submission.convertedPurchaseOrderId() != null) {
            throw PosApiException.conflict("Supplier submission has already been converted.");
        }
        if (submission.status() != SupplierSubmissionStatus.APPROVED
                && submission.status() != SupplierSubmissionStatus.PARTIALLY_APPROVED) {
            throw PosApiException.conflict("Supplier submission must be approved before conversion.");
        }
        var warehouse = repository.findWarehouse(context, request.warehouseId())
            .orElseThrow(() -> PosApiException.badRequest("warehouseId is invalid for POS scope."));
        var provider = requireProvider(context, submission.providerId());

        var eligibleItems = submission.items().stream()
            .filter(item -> item.status() != SupplierSubmissionStatus.REJECTED
                && item.status() != SupplierSubmissionStatus.NEEDS_CLARIFICATION)
            .toList();
        if (eligibleItems.isEmpty()) {
            throw PosApiException.conflict("Supplier submission has no approved items to convert.");
        }
        var unresolved = eligibleItems.stream().filter(item -> item.productId() == null).findFirst();
        if (unresolved.isPresent()) {
            throw PosApiException.conflict("Supplier submission contains items not linked to product catalog.");
        }
        var lines = eligibleItems.stream()
            .map(item -> {
                var product = requireProduct(context, item.productId());
                return new PurchaseOrderLineCommand(
                    product.id(),
                    item.providerSku() == null || item.providerSku().isBlank() ? product.sku() : item.providerSku(),
                    item.productName() == null || item.productName().isBlank() ? product.name() : item.productName(),
                    item.quantity(),
                    item.unitCost(),
                    normalizedTaxRate(item.taxRate()),
                    item.lineSubtotal(),
                    item.lineTax(),
                    item.lineTotal()
                );
            })
            .toList();
        var subtotal = sum(lines.stream().map(PurchaseOrderLineCommand::lineSubtotal).toList());
        var taxes = sum(lines.stream().map(PurchaseOrderLineCommand::lineTax).toList());
        var total = sum(lines.stream().map(PurchaseOrderLineCommand::lineTotal).toList());
        var notes = request.notes() == null || request.notes().isBlank()
            ? "Converted from supplier submission " + submission.submissionNumber()
            : request.notes();

        var orderId = repository.insertOrder(
            context,
            warehouse,
            provider,
            PurchaseOrderStatus.DRAFT,
            PurchaseOrderOrigin.SUPPLIER_KIOSK,
            submission.id(),
            repository.nextOrderFolio(context),
            submission.currencyCode(),
            request.expectedDate(),
            notes,
            subtotal,
            taxes,
            total,
            lines
        );
        repository.markSupplierSubmissionConverted(context, submission.id(), orderId);
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
        var enriched = items.stream().map(this::enrichSupplierInvoiceDocument).toList();
        return new SupplierInvoiceListResponse(enriched, enriched.size());
    }

    @Transactional
    public SupplierInvoiceResponse submitSupplierInvoice(PosContext context, SupplierInvoiceRequest request) {
        var provider = requireProvider(context, request.providerId());
        PurchaseOrderResponse order = null;
        if (request.purchaseOrderId() != null) {
            order = requireOrder(context, request.purchaseOrderId());
            if (!order.providerId().equals(provider.id())) {
                throw PosApiException.badRequest("purchaseOrderId does not belong to providerId.");
            }
        }
        commitSupplierDocumentIfManaged(context.companyId(), request.documentUrl());
        var invoiceId = repository.insertSupplierInvoice(context, request);
        createExpenseDraftFromSupplierInvoice(context, request, provider, order, invoiceId);
        return enrichSupplierInvoiceDocument(repository.findSupplierInvoice(context, invoiceId).orElseThrow());
    }

    private void createExpenseDraftFromSupplierInvoice(
            PosContext context,
            SupplierInvoiceRequest request,
            PurchaseOrderRepository.ProviderRef provider,
            PurchaseOrderResponse order,
            long invoiceId) {
        var purchaseOrderId = order == null ? request.purchaseOrderId() : order.id();
        var metadata = objectMapper.createObjectNode();
        metadata.put("source", "POS_PURCHASE_ORDER");
        metadata.put("supplierInvoiceId", invoiceId);
        if (purchaseOrderId != null) {
            metadata.put("purchaseOrderId", purchaseOrderId);
        }
        metadata.put("invoiceNumber", request.invoiceNumber().trim());
        var documentUrl = trimToNull(request.documentUrl());
        if (documentUrl != null) {
            metadata.put("documentUrl", documentUrl);
        }

        var customFields = objectMapper.createObjectNode();
        customFields.put("entryType", "budget");
        customFields.put("projected", false);
        customFields.put("legacyStatus", "pending");
        customFields.put("originModule", "point_of_sale");
        customFields.put("originTab", "ordenes_compra");
        customFields.put("supplierInvoiceId", invoiceId);
        if (purchaseOrderId != null) {
            customFields.put("purchaseOrderId", purchaseOrderId);
        }

        var expenseRequest = new CreateExpenseRequest(
            order == null ? context.scope().unitId() : order.unitId(),
            order == null ? context.scope().businessId() : order.businessId(),
            request.providerId(),
            null,
            null,
            null,
            purchaseOrderId,
            "POS-INV-" + invoiceId,
            compact("Factura proveedor " + provider.name() + " - " + request.invoiceNumber().trim(), 220),
            expenseDescription(order, request),
            ExpenseType.VARIABLE,
            money(request.subtotalAmount()),
            money(request.taxAmount()),
            money(request.totalAmount()),
            normalizedCurrency(request.currencyCode()),
            request.invoiceDate() == null ? LocalDate.now() : request.invoiceDate(),
            request.dueDate(),
            context.userId(),
            null,
            null,
            null,
            customFields,
            metadata
        );

        expenseService.createDraft(toFinanceContext(context), expenseRequest);
    }

    private FinanceContext toFinanceContext(PosContext context) {
        return new FinanceContext(
            context.userId(),
            context.companyId(),
            context.userName(),
            context.role(),
            true,
            toFinanceScope(context.scope())
        );
    }

    private FinanceScope toFinanceScope(PosScope scope) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> FinanceScope.corporateOffice();
            case UNIT_HEADQUARTERS -> FinanceScope.unitHeadquarters(scope.unitId());
            case BUSINESS_OFFICE -> FinanceScope.businessOffice(scope.unitId(), scope.businessId());
        };
    }

    private String expenseDescription(PurchaseOrderResponse order, SupplierInvoiceRequest request) {
        var description = new StringBuilder("Compromiso de pago creado desde POS / Ordenes de compra.");
        if (order != null) {
            description.append(" Orden: ").append(order.folio()).append('.');
        }
        var notes = trimToNull(request.notes());
        if (notes != null) {
            description.append(" Notas: ").append(notes);
        }
        return compact(description.toString(), 4000);
    }

    @Transactional
    public SupplierPortalDocumentUploadResponse createSupplierInvoiceUpload(
            PosContext context,
            SupplierInvoiceDocumentUploadRequest request) {
        requireSupplierDocumentStorage();
        var fileName = requireSupplierDocumentFileName(request.fileName());
        var contentType = requireSupplierDocumentContentType(request.contentType(), fileName);
        var sizeBytes = requireSupplierDocumentSize(request.sizeBytes());
        var objectKey = buildInternalSupplierInvoiceDocumentObjectKey(context.companyId(), context.userId(), fileName);
        var upload = storageMeter.presign(
            context.companyId(),
            "POS",
            supplierDocumentsBucket(),
            objectKey,
            contentType,
            sizeBytes,
            storageProperties.getMinio().getPresignExpirySeconds()
        );
        return new SupplierPortalDocumentUploadResponse(
            upload.objectKey(),
            upload.objectKey(),
            upload.uploadUrl(),
            upload.uploadUrl(),
            upload.expiresAt(),
            upload.expiresAt().toString(),
            upload.uploadHeaders(),
            upload.uploadHeaders(),
            fileName,
            contentType,
            sizeBytes
        );
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
        return enrichSupplierInvoiceDocument(repository.findSupplierInvoice(context, invoiceId).orElseThrow());
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

    private SupplierSubmissionLineCommand toSupplierSubmissionLineCommand(
            PosContext context,
            SupplierSubmissionItemRequest item,
            String currency) {
        var product = item.productId() == null ? null : requireProduct(context, item.productId());
        var quantity = item.quantity();
        var unitCost = item.unitCost();
        var taxRate = normalizedTaxRate(item.taxRate());
        var lineSubtotal = money(quantity.multiply(unitCost));
        var lineTax = money(lineSubtotal.multiply(taxRate));
        var lineTotal = money(lineSubtotal.add(lineTax));
        var productName = trimToNull(item.productName());
        return new SupplierSubmissionLineCommand(
            product == null ? null : product.id(),
            trimToNull(item.providerSku()),
            productName == null && product != null ? product.name() : productName,
            trimToNull(item.productDescription()),
            trimToNull(item.imageUrl()),
            quantity,
            unitCost,
            taxRate,
            lineSubtotal,
            lineTax,
            lineTotal,
            item.leadTimeDays(),
            item.minimumOrderQuantity()
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

    private PurchaseOrderRepository.SupplierPortalAccessRecord requireActivePortalAccess(
            String portalCode,
            String pin) {
        var access = repository.findSupplierPortalAccessByCode(portalCode)
            .orElseThrow(() -> PosApiException.notFound("Supplier portal not found."));
        requireOperationalPortalAccess(access);
        if (access.pinHash() == null || access.pinHash().isBlank()
                || pin == null || !passwordEncoder.matches(pin.trim(), access.pinHash())) {
            throw PosApiException.forbidden("Supplier portal PIN is invalid.");
        }
        return access;
    }

    private SupplierPortalContextResponse supplierPortalView(
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        var catalog = repository.listSupplierPortalCatalogProducts(access.companyId(), access.providerId());
        return new SupplierPortalContextResponse(
            access.id(),
            access.portalCode(),
            access.providerId(),
            access.providerName(),
            access.providerEmail(),
            access.status(),
            catalog
        );
    }

    private PosContext supplierPortalPosContext(PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        var scope = access.businessId() != null
            ? PosScope.businessOffice(access.unitId(), access.businessId())
            : access.unitId() != null
                ? PosScope.unitHeadquarters(access.unitId())
                : PosScope.corporateOffice();
        return new PosContext(
            0L,
            access.companyId(),
            access.providerName() == null ? "Supplier Portal" : access.providerName(),
            "supplier_portal",
            true,
            scope
        );
    }

    private void requireOperationalPortalAccess(
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        if (access.expiresAt() != null && !access.expiresAt().isAfter(Instant.now())) {
            repository.markSupplierPortalExpired(access.id());
            throw PosApiException.forbidden("Supplier portal is not active.");
        }
        if (!"ACTIVE".equalsIgnoreCase(access.status())) {
            throw PosApiException.forbidden("Supplier portal is not active.");
        }
    }

    private PurchaseOrderResponse requireOrder(PosContext context, long orderId) {
        return repository.findOrder(context, orderId)
            .orElseThrow(() -> PosApiException.notFound("Purchase order not found."));
    }

    private SupplierSubmissionResponse requireSupplierSubmission(PosContext context, long submissionId) {
        return repository.findSupplierSubmission(context, submissionId)
            .orElseThrow(() -> PosApiException.notFound("Supplier submission not found."));
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

    private SupplierPortalAccessResponse effectiveSupplierPortalAccess(
            SupplierPortalAccessResponse access) {
        var status = access.status();
        if ("PAUSED".equalsIgnoreCase(status)) {
            status = "DISABLED";
        } else if ("ACTIVE".equalsIgnoreCase(status)
                && access.expiresAt() != null
                && !access.expiresAt().isAfter(Instant.now())) {
            status = "EXPIRED";
        }
        return new SupplierPortalAccessResponse(
            access.id(), access.providerId(), access.providerName(), access.providerEmail(),
            access.portalCode(), access.portalUrl(), status, access.expiresAt(),
            access.createdAt(), access.updatedAt(), access.personalPinCreated()
        );
    }

    private String normalizeSupplierPortalManualStatus(String value) {
        var status = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if ("DISABLED".equals(status)) {
            return "PAUSED";
        }
        if (!List.of("ACTIVE", "PAUSED", "REVOKED").contains(status)) {
            throw PosApiException.badRequest("Supplier portal status is invalid.");
        }
        return status;
    }

    private String portalCodeOrGenerate(PosContext context, String requestedCode) {
        for (var attempt = 0; attempt < 5; attempt++) {
            var entropy = new byte[PUBLIC_LINK_ENTROPY_BYTES];
            SECURE_RANDOM.nextBytes(entropy);
            var token = HexFormat.of().withUpperCase().formatHex(entropy);
            if (!repository.supplierPortalCodeExists(context.companyId(), token)) {
                return token;
            }
        }
        throw PosApiException.conflict("A unique supplier portal link could not be generated.");
    }

    private void requireSupplierDocumentStorage() {
        if (!objectStorageService.isEnabled()) {
            throw PosApiException.serviceUnavailable("Supplier document storage is not enabled.");
        }
        objectStorageService.ensureBucketExists(supplierDocumentsBucket());
    }

    private String supplierDocumentsBucket() {
        return storageProperties.getMinio().getBucketSalesDocuments();
    }

    private String requirePublicSupplierDocumentReference(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            String documentUrl) {
        var reference = trimToNull(documentUrl);
        if (reference == null
                || reference.startsWith("http://")
                || reference.startsWith("https://")
                || !reference.startsWith(supplierInvoiceDocumentPrefix(access.companyId(), access.id()))) {
            throw PosApiException.badRequest("Supplier invoice document reference is invalid for this portal.");
        }
        requireSupplierDocumentStorage();
        if (!objectStorageService.objectExists(supplierDocumentsBucket(), reference)) {
            throw PosApiException.badRequest("Uploaded supplier invoice document was not found in storage.");
        }
        return reference;
    }

    private SupplierInvoiceResponse enrichSupplierInvoiceDocument(SupplierInvoiceResponse invoice) {
        var reference = trimToNull(invoice.documentUrl());
        if (reference == null || reference.startsWith("http://") || reference.startsWith("https://")) {
            return invoice;
        }
        var signedUrl = safeSignedSupplierDocumentUrl(reference);
        if (signedUrl == null) {
            return invoice;
        }
        return new SupplierInvoiceResponse(
            invoice.id(),
            invoice.providerId(),
            invoice.providerName(),
            invoice.purchaseOrderId(),
            invoice.purchaseOrderFolio(),
            invoice.invoiceNumber(),
            invoice.invoiceDate(),
            invoice.dueDate(),
            invoice.subtotalAmount(),
            invoice.taxAmount(),
            invoice.totalAmount(),
            invoice.currencyCode(),
            invoice.status(),
            signedUrl,
            invoice.notes(),
            invoice.submittedByName(),
            invoice.reviewedByUserId(),
            invoice.reviewedAt(),
            invoice.reviewNote(),
            invoice.createdAt()
        );
    }

    private String safeSignedSupplierDocumentUrl(String objectKey) {
        if (!objectStorageService.isEnabled()) {
            return null;
        }
        try {
            return objectStorageService.presignDownload(
                supplierDocumentsBucket(),
                objectKey,
                storageProperties.getMinio().getPresignExpirySeconds()
            );
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private void commitSupplierDocumentIfManaged(long companyId, String documentReference) {
        var objectKey = trimToNull(documentReference);
        if (objectKey == null || objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
            return;
        }
        var internalPrefix = "pos/supplier-invoices/" + companyId + "/";
        var publicPrefix = "pos/supplier-portal/" + companyId + "/";
        if (!objectKey.startsWith(internalPrefix) && !objectKey.startsWith(publicPrefix)) {
            return;
        }
        requireSupplierDocumentStorage();
        if (!objectStorageService.objectExists(supplierDocumentsBucket(), objectKey)) {
            throw PosApiException.badRequest("Uploaded supplier invoice document was not found in storage.");
        }
        var sizeBytes = objectStorageService.objectMetadata(supplierDocumentsBucket(), objectKey).sizeBytes();
        storageMeter.commit(companyId, supplierDocumentsBucket(), objectKey, sizeBytes);
    }

    private String buildSupplierInvoiceDocumentObjectKey(long companyId, long accessId, String fileName) {
        return supplierInvoiceDocumentPrefix(companyId, accessId)
            + UUID.randomUUID()
            + "-"
            + sanitizeSupplierDocumentFileName(fileName);
    }

    private String buildInternalSupplierInvoiceDocumentObjectKey(long companyId, long userId, String fileName) {
        return "pos/supplier-invoices/"
            + companyId
            + "/users/"
            + userId
            + "/"
            + UUID.randomUUID()
            + "-"
            + sanitizeSupplierDocumentFileName(fileName);
    }

    private String supplierInvoiceDocumentPrefix(long companyId, long accessId) {
        return "pos/supplier-portal/" + companyId + "/" + accessId + "/invoices/";
    }

    private long requireSupplierDocumentSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw PosApiException.badRequest("sizeBytes is required.");
        }
        if (sizeBytes > MAX_SUPPLIER_DOCUMENT_SIZE_BYTES) {
            throw PosApiException.badRequest("Supplier invoice documents cannot exceed 15 MB.");
        }
        return sizeBytes;
    }

    private String requireSupplierDocumentFileName(String fileName) {
        return sanitizeSupplierDocumentFileName(fileName);
    }

    private String requireSupplierDocumentContentType(String contentType, String fileName) {
        var normalized = contentType == null ? null : contentType.trim().toLowerCase(Locale.ROOT);
        if (normalized == null || normalized.isBlank() || "application/octet-stream".equals(normalized)) {
            normalized = inferSupplierDocumentContentType(fileName);
        }
        if (!SUPPLIER_DOCUMENT_CONTENT_TYPES.contains(normalized)) {
            throw PosApiException.badRequest("Only PDF, image, XML, DOCX or XLSX supplier documents are supported.");
        }
        return normalized;
    }

    private String inferSupplierDocumentContentType(String fileName) {
        var lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".xml")) {
            return "application/xml";
        }
        if (lower.endsWith(".docx")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        if (lower.endsWith(".xlsx")) {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        return "application/octet-stream";
    }

    private String sanitizeSupplierDocumentFileName(String fileName) {
        var normalized = Normalizer.normalize(fileName == null ? "supplier-document" : fileName, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9._-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("(^[.-]+|[.-]+$)", "");
        return normalized.isBlank() ? "supplier-document" : normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String compact(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, Math.max(0, maxLength - 1)).trim();
    }
}
