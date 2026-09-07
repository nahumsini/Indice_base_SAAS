package com.indice.erp.pos.receipt;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.providers.ProviderService;
import com.indice.erp.finance.providers.ProviderStatus;
import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.ProviderResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.treasury.TreasuryMovementCommand;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.cashmovement.CashMovementService;
import com.indice.erp.pos.cashmovement.dto.CashMovementCreateRequest;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.shift.ShiftRecord;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.ShiftStatus;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaidInventoryReceiptService {
    private static final Set<String> PAYMENT_METHODS = Set.of("CASH", "TRANSFER");
    private static final Set<String> EVIDENCE_TYPES = Set.of("application/pdf", "image/jpeg", "image/png", "image/webp");
    private static final long MAX_EVIDENCE_BYTES = 15L * 1024 * 1024;
    private static final int MAX_ITEMS = 100;
    private static final BigDecimal MAX_TAX_RATE = BigDecimal.ONE;

    private final PaidInventoryReceiptRepository repository;
    private final CashRegisterService cashRegisters;
    private final ShiftRepository shifts;
    private final CashMovementService cashMovements;
    private final TreasuryService treasury;
    private final ProviderService providers;
    private final CompanyStorageMeter storageMeter;
    private final ObjectStorageService objectStorage;
    private final ObjectStorageProperties storageProperties;

    public PaidInventoryReceiptService(
            PaidInventoryReceiptRepository repository,
            CashRegisterService cashRegisters,
            ShiftRepository shifts,
            CashMovementService cashMovements,
            TreasuryService treasury,
            ProviderService providers,
            CompanyStorageMeter storageMeter,
            ObjectStorageService objectStorage,
            ObjectStorageProperties storageProperties) {
        this.repository = repository;
        this.cashRegisters = cashRegisters;
        this.shifts = shifts;
        this.cashMovements = cashMovements;
        this.treasury = treasury;
        this.providers = providers;
        this.storageMeter = storageMeter;
        this.objectStorage = objectStorage;
        this.storageProperties = storageProperties;
    }

    @Transactional(readOnly = true)
    public List<PaidInventoryReceiptDtos.ProductOptionResponse> products(
            PosContext context, long cashRegisterId, String query) {
        var register = cashRegisters.requireOperationalRegister(context, cashRegisterId);
        return repository.products(context, register.warehouseId(), query).stream()
            .map(product -> new PaidInventoryReceiptDtos.ProductOptionResponse(
                product.id(), product.name(), product.sku(), product.category(), product.currency(),
                product.inventoryUnit(), product.unitCost()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PaidInventoryReceiptDtos.ProviderOptionResponse> providerOptions(PosContext context) {
        return providers.list(toFinanceContext(context)).providers().stream()
            .filter(provider -> provider.status() == ProviderStatus.ACTIVE)
            .map(PaidInventoryReceiptService::providerOption)
            .toList();
    }

    @Transactional
    public PaidInventoryReceiptDtos.ProviderOptionResponse createProvider(
            PosContext context, PaidInventoryReceiptDtos.QuickProviderRequest request) {
        var created = providers.create(toFinanceContext(context), new CreateProviderRequest(
            null, null, required(request.name(), "Provider name is required."), null, null, null, null,
            null, 0, ProviderStatus.ACTIVE, "Proveedor creado desde una recepción pagada en POS.", null, null));
        return providerOption(created);
    }

    @Transactional(readOnly = true)
    public List<PaidInventoryReceiptDtos.PaymentAccountResponse> paymentAccounts(
            PosContext context, long cashRegisterId, long shiftId, String currencyCode) {
        var register = cashRegisters.requireOperationalRegister(context, cashRegisterId);
        var shift = requireOpenShift(context, shiftId, register.id());
        var currency = currency(currencyCode);
        if (!currency.equalsIgnoreCase(shift.currencyCode())) {
            throw PosApiException.badRequest("Receipt currency must match the open shift currency.");
        }
        return treasury.listEligibleAccounts(
                context.companyId(), currency, shift.unitId(), shift.businessId()).stream()
            .filter(account -> "BANK".equals(account.type()))
            .map(account -> new PaidInventoryReceiptDtos.PaymentAccountResponse(
                account.id(), account.name(), account.type(), account.currencyCode(),
                account.availableBalance(), account.pendingBalance()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PaidInventoryReceiptDtos.ReceiptResponse> recent(PosContext context, long shiftId) {
        shifts.findById(context, shiftId).orElseThrow(() -> PosApiException.notFound("Shift not found."));
        return repository.recentForShift(context, shiftId).stream()
            .map(receipt -> response(receipt, repository.items(context, receipt.id()), receipt.status(), receipt.reversalReason()))
            .toList();
    }

    @Transactional
    public PaidInventoryReceiptDtos.ReceiptResponse create(
            PosContext context, PaidInventoryReceiptDtos.CreateRequest request) {
        var idempotencyKey = required(request.idempotencyKey(), "Idempotency key is required.");
        var fingerprint = BillingHashing.sha256(PosJsonSupport.toJson(request));
        var existing = repository.findByIdempotencyKey(context, idempotencyKey);
        if (existing != null) return idempotentResponse(context, existing, fingerprint);

        var register = cashRegisters.requireOperationalRegister(context, request.cashRegisterId());
        var shift = requireOpenShift(context, request.shiftId(), register.id());
        var currency = currency(request.currencyCode());
        if (!currency.equalsIgnoreCase(shift.currencyCode())) {
            throw PosApiException.badRequest("Receipt currency must match the open shift currency.");
        }
        var method = token(request.paymentMethod());
        if (!PAYMENT_METHODS.contains(method)) {
            throw PosApiException.badRequest("Payment method must be CASH or TRANSFER.");
        }
        if (method.equals("TRANSFER") && request.paymentAccountId() == null) {
            throw PosApiException.badRequest("A payment account is required for transfer payouts.");
        }
        if (method.equals("CASH") && request.paymentAccountId() != null) {
            throw PosApiException.badRequest("Cash payouts cannot specify a transfer account.");
        }
        if (request.items() == null || request.items().isEmpty() || request.items().size() > MAX_ITEMS) {
            throw PosApiException.badRequest("Receipt must contain between 1 and 100 items.");
        }

        var provider = providers.get(toFinanceContext(context), request.providerId());
        if (provider.status() != ProviderStatus.ACTIVE) {
            throw PosApiException.badRequest("The selected provider is not active.");
        }

        var prepared = new ArrayList<PreparedItem>();
        var subtotal = BigDecimal.ZERO;
        var tax = BigDecimal.ZERO;
        var total = BigDecimal.ZERO;
        for (var item : request.items()) {
            var preparedItem = prepareItem(context, item, currency);
            prepared.add(preparedItem);
            subtotal = subtotal.add(preparedItem.subtotal());
            tax = tax.add(preparedItem.tax());
            total = total.add(preparedItem.lineTotal());
        }
        subtotal = money(subtotal);
        tax = money(tax);
        total = money(total);
        if (total.signum() <= 0) throw PosApiException.badRequest("Receipt total must be greater than zero.");

        if (method.equals("TRANSFER")) {
            treasury.requireEligibleAccount(context.companyId(), request.paymentAccountId(), currency,
                shift.unitId(), shift.businessId(), Set.of("BANK"));
        }

        var number = "REC-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT);
        var metadataValues = new LinkedHashMap<String, Object>();
        if (nullable(request.notes()) != null) metadataValues.put("notes", nullable(request.notes()));
        metadataValues.put("pricing", "SERVER_AUTHORITY");
        var metadata = PosJsonSupport.toJson(metadataValues);

        final long receiptId;
        try {
            receiptId = repository.insertReceipt(context, idempotencyKey, fingerprint, number,
                shift.unitId(), shift.businessId(), register.warehouseId(), register.id(), shift.id(),
                provider.id(), provider.name(), method, request.paymentAccountId(), subtotal, tax, total,
                currency, nullable(request.paymentReference()), metadata);
        } catch (DuplicateKeyException exception) {
            var winner = repository.findByIdempotencyKey(context, idempotencyKey);
            if (winner == null) throw exception;
            return idempotentResponse(context, winner, fingerprint);
        }

        var responses = new ArrayList<PaidInventoryReceiptDtos.ItemResponse>();
        for (var item : prepared) {
            var product = item.product() == null
                ? repository.createProduct(context, item.productInput(), currency)
                : item.product();
            var id = repository.addItemAndInventory(context, receiptId, number, shift.unitId(), shift.businessId(),
                register.warehouseId(), register.warehouseName(), product, item.quantity(), item.enteredUnitCost(),
                item.inventoryUnitCost(), item.taxRate(), item.taxIncluded(), item.taxProfileId(), item.taxName(),
                item.subtotal(), item.tax(), item.lineTotal());
            responses.add(itemResponse(id, product, item));
        }
        postPayout(context, shift, receiptId, number, method, request.paymentAccountId(), total, currency,
            nullable(request.paymentReference()));
        return new PaidInventoryReceiptDtos.ReceiptResponse(receiptId, number, register.id(), shift.id(),
            register.warehouseId(), register.warehouseName(), provider.id(), provider.name(), method,
            request.paymentAccountId(), subtotal, tax, total, currency, nullable(request.paymentReference()),
            "POSTED", null, responses, metadataValues);
    }

    public PaidInventoryReceiptDtos.AttachmentUploadResponse presignAttachment(
            PosContext context, long receiptId, PaidInventoryReceiptDtos.AttachmentUploadRequest request) {
        var receipt = repository.requireReceipt(context, receiptId);
        if (!"POSTED".equals(receipt.status())) {
            throw PosApiException.conflict("A document cannot be added to a reversed receipt.");
        }
        requireStorage();
        var fileName = fileName(request.fileName());
        var contentType = contentType(request.contentType());
        var sizeBytes = evidenceSize(request.sizeBytes());
        var objectKey = evidencePrefix(context.companyId(), receiptId) + UUID.randomUUID() + "-" + fileName;
        var upload = storageMeter.presign(context.companyId(), "POS", bucket(), objectKey, contentType, sizeBytes,
            storageProperties.getMinio().getPresignExpirySeconds());
        return new PaidInventoryReceiptDtos.AttachmentUploadResponse(
            upload.objectKey(), upload.uploadUrl(), upload.uploadHeaders(), contentType);
    }

    @Transactional
    public PaidInventoryReceiptDtos.AttachmentResponse registerAttachment(
            PosContext context, long receiptId, PaidInventoryReceiptDtos.AttachmentRegisterRequest request) {
        var receipt = repository.requireReceipt(context, receiptId);
        if (!"POSTED".equals(receipt.status())) {
            throw PosApiException.conflict("A document cannot be added to a reversed receipt.");
        }
        requireStorage();
        var expectedPrefix = evidencePrefix(context.companyId(), receiptId);
        if (!request.objectKey().startsWith(expectedPrefix)) {
            throw PosApiException.badRequest("Invalid receipt document object key.");
        }
        var fileName = fileName(request.fileName());
        var contentType = contentType(request.contentType());
        var sizeBytes = evidenceSize(request.sizeBytes());
        if (!objectStorage.objectExists(bucket(), request.objectKey())) {
            throw PosApiException.badRequest("Uploaded receipt document was not found.");
        }
        storageMeter.commit(context.companyId(), bucket(), request.objectKey(), sizeBytes);
        var id = repository.insertAttachment(context, receiptId, request.objectKey(), fileName, contentType, sizeBytes);
        return new PaidInventoryReceiptDtos.AttachmentResponse(id, fileName, contentType, sizeBytes,
            objectStorage.presignDownload(bucket(), request.objectKey(), storageProperties.getMinio().getPresignExpirySeconds()));
    }

    @Transactional
    public PaidInventoryReceiptDtos.ReceiptResponse reverse(
            PosContext context, long receiptId, PaidInventoryReceiptDtos.ReverseRequest request) {
        var reason = required(request.reason(), "Reversal reason is required.");
        var receipt = repository.lockReceipt(context, receiptId);
        if (!"POSTED".equals(receipt.status())) {
            throw PosApiException.conflict("Inventory receipt is already reversed.");
        }
        var shift = requireOpenShift(context, receipt.shiftId(), receipt.cashRegisterId());
        var items = repository.items(context, receiptId);
        for (var item : items) repository.reverseInventory(context, receipt, item, reason);
        reversePayout(context, shift, receipt, reason);
        repository.markReversed(context, receiptId, reason);
        return response(receipt, items, "REVERSED", reason);
    }

    private PreparedItem prepareItem(
            PosContext context, PaidInventoryReceiptDtos.ItemRequest item, String currency) {
        if (item == null || item.product() == null) {
            throw PosApiException.badRequest("Every receipt item requires a product.");
        }
        var product = item.product().productId() == null
            ? null : repository.requireProduct(context, item.product().productId());
        var inventoryUnit = product == null
            ? PaidInventoryReceiptRepository.normalizeUnit(item.product().inventoryUnit())
            : product.inventoryUnit();
        if (item.product().inventoryUnit() != null
                && !inventoryUnit.equals(PaidInventoryReceiptRepository.normalizeUnit(item.product().inventoryUnit()))) {
            throw PosApiException.badRequest("Receipt quantity unit must match the product inventory unit.");
        }
        if (product != null && product.currency() != null && !currency.equalsIgnoreCase(product.currency())) {
            throw PosApiException.badRequest("Receipt currency must match the selected product currency.");
        }
        if (product == null) {
            required(item.product().name(), "New product name is required.");
            if (item.product().salePrice() != null && item.product().salePrice().signum() < 0) {
                throw PosApiException.badRequest("New product sale price cannot be negative.");
            }
        }
        var quantity = amount(item.quantity(), 3, "Quantity");
        if ("Piece".equals(inventoryUnit) && quantity.remainder(BigDecimal.ONE).signum() != 0) {
            throw PosApiException.badRequest("Products measured by piece require a whole quantity.");
        }
        var enteredUnitCost = amount(item.unitCost(), 4, "Unit cost");
        var taxRate = taxRate(item.taxRate());
        var taxIncluded = Boolean.TRUE.equals(item.taxIncluded()) && taxRate.signum() > 0;
        var gross = quantity.multiply(enteredUnitCost).setScale(6, RoundingMode.HALF_UP);
        final BigDecimal subtotal;
        final BigDecimal tax;
        final BigDecimal lineTotal;
        if (taxIncluded) {
            lineTotal = money(gross);
            subtotal = money(lineTotal.divide(BigDecimal.ONE.add(taxRate), 8, RoundingMode.HALF_UP));
            tax = money(lineTotal.subtract(subtotal));
        } else {
            subtotal = money(gross);
            tax = money(subtotal.multiply(taxRate));
            lineTotal = money(subtotal.add(tax));
        }
        var inventoryUnitCost = subtotal.divide(quantity, 4, RoundingMode.HALF_UP);
        return new PreparedItem(product, item.product(), quantity, enteredUnitCost, inventoryUnitCost,
            taxRate, taxIncluded, nullable(item.taxProfileId()), nullable(item.taxName()), subtotal, tax, lineTotal);
    }

    private PaidInventoryReceiptDtos.ReceiptResponse idempotentResponse(
            PosContext context, PaidInventoryReceiptRepository.ReceiptRow receipt, String fingerprint) {
        if (receipt.requestFingerprint() != null && !Objects.equals(receipt.requestFingerprint(), fingerprint)) {
            throw PosApiException.conflict("Idempotency key was already used with different receipt values.");
        }
        return response(receipt, repository.items(context, receipt.id()), receipt.status(), receipt.reversalReason());
    }

    private void postPayout(PosContext context, ShiftRecord shift, long receiptId, String number, String method,
            Long accountId, BigDecimal total, String currency, String reference) {
        if (method.equals("CASH")) {
            var movement = cashMovements.create(context, new CashMovementCreateRequest(
                shift.id(), shift.cashRegisterId(), "CASH_OUT", total, currency,
                "Paid inventory receipt " + number, reference, Map.of("receiptId", receiptId)));
            repository.linkPayout(context, receiptId, movement.id(), null);
            return;
        }
        var movement = treasury.post(new TreasuryMovementCommand(
            context.companyId(), accountId, shift.unitId(), shift.businessId(), currency, "POS",
            "PAID_INVENTORY_RECEIPT", String.valueOf(receiptId), "POS_RECEIPT:" + receiptId + ":PAYOUT",
            total.negate(), BigDecimal.ZERO, "Paid inventory receipt " + number, Instant.now(),
            context.userId(), null, PosJsonSupport.toJson(paymentMetadata(number, reference))));
        repository.linkPayout(context, receiptId, null, movement.movementId());
    }

    private void reversePayout(PosContext context, ShiftRecord shift, PaidInventoryReceiptRepository.ReceiptRow receipt,
            String reason) {
        if (receipt.paymentMethod().equals("CASH")) {
            cashMovements.create(context, new CashMovementCreateRequest(shift.id(), shift.cashRegisterId(), "CASH_IN",
                receipt.totalAmount(), receipt.currencyCode(), "Reversal of " + receipt.receiptNumber(), null,
                Map.of("receiptId", receipt.id(), "reason", reason)));
            return;
        }
        treasury.post(new TreasuryMovementCommand(context.companyId(), receipt.paymentAccountId(), shift.unitId(),
            shift.businessId(), receipt.currencyCode(), "POS", "PAID_INVENTORY_RECEIPT_REVERSAL",
            String.valueOf(receipt.id()), "POS_RECEIPT:" + receipt.id() + ":REVERSAL", receipt.totalAmount(),
            BigDecimal.ZERO, "Reversal of " + receipt.receiptNumber(), Instant.now(), context.userId(), null,
            PosJsonSupport.toJson(Map.of("reason", reason))));
    }

    private PaidInventoryReceiptDtos.ReceiptResponse response(
            PaidInventoryReceiptRepository.ReceiptRow receipt,
            List<PaidInventoryReceiptRepository.ItemRow> items,
            String status,
            String reason) {
        return new PaidInventoryReceiptDtos.ReceiptResponse(
            receipt.id(), receipt.receiptNumber(), receipt.cashRegisterId(), receipt.shiftId(),
            receipt.warehouseId(), receipt.warehouseName(), receipt.providerId(), receipt.providerName(),
            receipt.paymentMethod(), receipt.paymentAccountId(), receipt.subtotalAmount(), receipt.taxAmount(),
            receipt.totalAmount(), receipt.currencyCode(), receipt.paymentReference(), status, reason,
            items.stream().map(item -> new PaidInventoryReceiptDtos.ItemResponse(
                item.id(), item.productId(), item.productName(), item.sku(), item.inventoryUnit(), item.quantity(),
                item.enteredUnitCost(), item.inventoryUnitCost(), item.taxRate(), item.taxIncluded(),
                item.taxProfileId(), item.taxName(), item.subtotalAmount(), item.taxAmount(), item.lineTotal()))
                .toList(),
            Map.of());
    }

    private static PaidInventoryReceiptDtos.ItemResponse itemResponse(
            long id, PaidInventoryReceiptRepository.ProductRow product, PreparedItem item) {
        return new PaidInventoryReceiptDtos.ItemResponse(
            id, product.id(), product.name(), product.sku(), product.inventoryUnit(), item.quantity(),
            item.enteredUnitCost(), item.inventoryUnitCost(), item.taxRate(), item.taxIncluded(),
            item.taxProfileId(), item.taxName(), item.subtotal(), item.tax(), item.lineTotal());
    }

    private static PaidInventoryReceiptDtos.ProviderOptionResponse providerOption(ProviderResponse provider) {
        return new PaidInventoryReceiptDtos.ProviderOptionResponse(
            provider.id(), provider.name(), provider.email(), provider.taxId(), provider.paymentTermsDays());
    }

    private FinanceContext toFinanceContext(PosContext context) {
        return new FinanceContext(context.userId(), context.companyId(), context.userName(), context.role(), true,
            toFinanceScope(context.scope()));
    }

    private FinanceScope toFinanceScope(PosScope scope) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> FinanceScope.corporateOffice();
            case UNIT_HEADQUARTERS -> FinanceScope.unitHeadquarters(scope.unitId());
            case BUSINESS_OFFICE -> FinanceScope.businessOffice(scope.unitId(), scope.businessId());
        };
    }

    private ShiftRecord requireOpenShift(PosContext context, long shiftId, long registerId) {
        var shift = shifts.findById(context, shiftId).orElseThrow(() -> PosApiException.notFound("Shift not found."));
        if (shift.status() != ShiftStatus.OPEN || shift.cashRegisterId() != registerId) {
            throw PosApiException.conflict("Paid inventory receipts require the matching open shift.");
        }
        if (!shift.openedByUserId().equals(context.userId()) && !context.canManageOtherUsers()) {
            throw PosApiException.forbidden("Shift belongs to another user.");
        }
        return shift;
    }

    private void requireStorage() {
        if (!objectStorage.isEnabled()) {
            throw PosApiException.serviceUnavailable("Receipt document storage is not enabled.");
        }
        objectStorage.ensureBucketExists(bucket());
    }

    private String bucket() {
        return storageProperties.getMinio().getBucketSalesDocuments();
    }

    private static String evidencePrefix(long companyId, long receiptId) {
        return "pos/inventory-receipts/" + companyId + "/" + receiptId + "/evidence/";
    }

    private static long evidenceSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0 || sizeBytes > MAX_EVIDENCE_BYTES) {
            throw PosApiException.badRequest("Receipt document must be between 1 byte and 15 MB.");
        }
        return sizeBytes;
    }

    private static String contentType(String value) {
        var contentType = required(value, "Receipt document content type is required.").toLowerCase(Locale.ROOT);
        if (!EVIDENCE_TYPES.contains(contentType)) {
            throw PosApiException.badRequest("Receipt document must be PDF, JPEG, PNG, or WebP.");
        }
        return contentType;
    }

    private static String fileName(String value) {
        var name = required(value, "Receipt document file name is required.");
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        return name.substring(0, Math.min(name.length(), 180));
    }

    private BigDecimal amount(BigDecimal value, int scale, String label) {
        if (value == null || value.signum() <= 0) {
            throw PosApiException.badRequest(label + " must be greater than zero.");
        }
        return value.setScale(scale, RoundingMode.HALF_UP);
    }

    private BigDecimal taxRate(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO.setScale(6, RoundingMode.HALF_UP);
        if (value.signum() < 0 || value.compareTo(MAX_TAX_RATE) > 0) {
            throw PosApiException.badRequest("Tax rate must be between 0 and 1.");
        }
        return value.setScale(6, RoundingMode.HALF_UP);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String token(String value) {
        return required(value, "Payment method is required.").toUpperCase(Locale.ROOT);
    }

    private String currency(String value) {
        var result = required(value, "Currency is required.").toUpperCase(Locale.ROOT);
        if (!result.matches("[A-Z]{3}")) {
            throw PosApiException.badRequest("Currency must use a three-letter code.");
        }
        return result;
    }

    private static String required(String value, String message) {
        var result = nullable(value);
        if (result == null) throw PosApiException.badRequest(message);
        return result;
    }

    private static String nullable(String value) {
        var text = value == null ? null : value.trim();
        return text == null || text.isBlank() ? null : text;
    }

    private Map<String, Object> paymentMetadata(String receiptNumber, String reference) {
        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("receiptNumber", receiptNumber);
        if (nullable(reference) != null) metadata.put("reference", nullable(reference));
        return metadata;
    }

    private record PreparedItem(
            PaidInventoryReceiptRepository.ProductRow product,
            PaidInventoryReceiptDtos.ProductInput productInput,
            BigDecimal quantity,
            BigDecimal enteredUnitCost,
            BigDecimal inventoryUnitCost,
            BigDecimal taxRate,
            boolean taxIncluded,
            String taxProfileId,
            String taxName,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal lineTotal) {}
}
