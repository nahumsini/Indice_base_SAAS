package com.indice.erp.sales;

import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesService {

    private static final long MAX_PRODUCT_IMAGE_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final long MAX_PAYMENT_EVIDENCE_SIZE_BYTES = 15L * 1024L * 1024L;
    private static final Set<String> PRODUCT_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
            "image/heic",
            "image/heif");
    private static final Set<String> PAYMENT_EVIDENCE_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp");
    private static final Set<String> PRODUCT_SALES_VISIBILITIES = Set.of(
            "commercial",
            "pos_ready",
            "quote_only");

    private final SalesRepository salesRepository;
    private final SalesReferenceService referenceService;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties storageProperties;
    private final CompanyStorageMeter storageMeter;
    private final BusinessExchangeRateService businessExchangeRateService;
    private final KpiCurrencyAggregationService kpiCurrencyAggregationService;
    private final SalesProductAvailabilityLinkCodec availabilityLinkCodec;
    private final OpportunityFlowService opportunityFlowService;
    private final Map<String, SalesEntityDefinition> definitions = SalesDefinitions.definitions();

    public SalesService(
            SalesRepository salesRepository,
            SalesReferenceService referenceService,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties storageProperties,
            CompanyStorageMeter storageMeter,
            BusinessExchangeRateService businessExchangeRateService,
            KpiCurrencyAggregationService kpiCurrencyAggregationService,
            SalesProductAvailabilityLinkCodec availabilityLinkCodec,
            OpportunityFlowService opportunityFlowService) {
        this.salesRepository = salesRepository;
        this.referenceService = referenceService;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.storageMeter = storageMeter;
        this.businessExchangeRateService = businessExchangeRateService;
        this.kpiCurrencyAggregationService = kpiCurrencyAggregationService;
        this.availabilityLinkCodec = availabilityLinkCodec;
        this.opportunityFlowService = opportunityFlowService;
    }

    public Map<String, Object> context(long companyId, long userId) {
        var users = salesRepository.contextUsers(companyId);
        var body = new LinkedHashMap<String, Object>();
        body.put("users", users);
        body.put("units", salesRepository.contextUnits(companyId));
        body.put("businesses", salesRepository.contextBusinesses(companyId));
        body.put("currentUserCompanyId", currentUserCompanyId(users, userId));
        body.put("dictionaries", dictionaries(companyId));
        return body;
    }

    public Map<String, Object> list(long companyId, String collection, Map<String, String> filters) {
        var definition = definition(collection);
        var items = salesRepository.list(companyId, definition, filters);
        if ("products".equals(collection)) {
            items.forEach(item -> {
                revealProductAvailability(item);
                enrichProductImages(companyId, item);
                enrichProductSalesReadiness(item);
            });
        }
        if ("quotes".equals(collection)) {
            items.forEach(item -> item.put("items", salesRepository.listQuoteItems(companyId, longId(item))));
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("count", items.size());
        body.put("collection", collection);
        return body;
    }

    public Map<String, Object> get(long companyId, String collection, long id) {
        var definition = definition(collection);
        var item = salesRepository.get(companyId, definition, id);
        if ("products".equals(collection)) {
            revealProductAvailability(item);
            enrichProductImages(companyId, item);
            enrichProductSalesReadiness(item);
        }
        if ("quotes".equals(collection)) {
            item.put("items", salesRepository.listQuoteItems(companyId, id));
        }
        return item;
    }

    @Transactional
    public Map<String, Object> create(long companyId, long userId, String collection, Map<String, Object> payload) {
        var definition = definition(collection);
        var normalizedPayload = normalizeBeforeSave(companyId, collection, payload);
        Long opportunityFlowId = null;
        if ("opportunities".equals(collection)) {
            opportunityFlowId = SalesPayloadSupport.longValue(normalizedPayload, "flowId");
            removeOpportunityFlowControl(normalizedPayload);
            if (opportunityFlowId == null) {
                opportunityFlowId = opportunityFlowService.defaultFlowId(companyId);
            }
            if (!SalesPayloadSupport.contains(normalizedPayload, "stage")) {
                normalizedPayload.put("stage", opportunityFlowService.initialStage(companyId, opportunityFlowId));
            }
            normalizedPayload.put("stage", opportunityFlowService.requireActiveStage(
                    companyId, opportunityFlowId, SalesPayloadSupport.stringValue(normalizedPayload, "stage")));
        }
        if ("sales".equals(collection)) {
            assignAuthenticatedSeller(companyId, userId, normalizedPayload);
            normalizedPayload.putAll(SalesCommissionCalculator.calculate(
                    normalizedPayload,
                    salesRepository.list(companyId, definition("commission-rules"), Map.of())));
        }
        referenceService.validateEntityPayload(companyId, collection, normalizedPayload);
        var id = salesRepository.create(companyId, userId, definition, normalizedPayload);
        if ("opportunities".equals(collection)) {
            var position = opportunityFlowService.initializeOpportunity(
                    companyId,
                    userId,
                    id,
                    opportunityFlowId,
                    SalesPayloadSupport.stringValue(normalizedPayload, "stage"));
            salesRepository.update(companyId, userId, definition, id, Map.of(
                    "stage", position.stageKey(),
                    "lifecycleStatus", position.lifecycleStatus(),
                    "probabilityPercent", position.probabilityPercent()));
        }
        if ("quotes".equals(collection)) {
            createQuoteItemsFromPayload(companyId, id, normalizedPayload);
            refreshQuoteAmount(companyId, id);
        }
        if ("sales".equals(collection)) {
            try {
                salesRepository.confirmSaleInventory(companyId, userId, id, normalizedPayload);
            } catch (IllegalArgumentException inventoryConfirmationError) {
                // A commercial close must not be lost because inventory still needs
                // configuration or replenishment. The sale keeps its pending inventory
                // statuses from the payload and can be resolved operationally afterwards.
            }
        }
        return get(companyId, collection, id);
    }

    @Transactional
    public Map<String, Object> update(long companyId, long userId, String collection, long id, Map<String, Object> payload) {
        var definition = definition(collection);
        var updatePayload = payload;
        if ("inventory-warehouses".equals(collection) || "inventory-balances".equals(collection)
                || "products".equals(collection)) {
            updatePayload = new LinkedHashMap<>(get(companyId, collection, id));
            if (payload != null) {
                updatePayload.putAll(payload);
            }
        }
        var normalizedPayload = normalizeBeforeSave(companyId, collection, updatePayload);
        Long opportunityFlowId = null;
        if ("opportunities".equals(collection) && SalesPayloadSupport.contains(normalizedPayload, "stage")) {
            opportunityFlowId = SalesPayloadSupport.longValue(normalizedPayload, "flowId");
            removeOpportunityFlowControl(normalizedPayload);
            var position = opportunityFlowService.moveOpportunity(
                    companyId,
                    userId,
                    id,
                    opportunityFlowId,
                    SalesPayloadSupport.stringValue(normalizedPayload, "stage"));
            normalizedPayload.put("stage", position.stageKey());
            normalizedPayload.put("lifecycleStatus", position.lifecycleStatus());
            normalizedPayload.put("probabilityPercent", position.probabilityPercent());
        } else if ("opportunities".equals(collection)) {
            removeOpportunityFlowControl(normalizedPayload);
        }
        if ("sales".equals(collection)) {
            removeClientCommissionCalculation(normalizedPayload);
            if (commissionInputsChanged(payload)) {
                var calculationInput = new LinkedHashMap<String, Object>(get(companyId, "sales", id));
                calculationInput.putAll(normalizedPayload);
                normalizedPayload.putAll(SalesCommissionCalculator.calculate(
                        calculationInput,
                        salesRepository.list(companyId, definition("commission-rules"), Map.of())));
            }
        }
        referenceService.validateEntityPayload(companyId, collection, normalizedPayload);
        salesRepository.update(companyId, userId, definition, id, normalizedPayload);
        if ("quotes".equals(collection)) {
            if (SalesPayloadSupport.value(normalizedPayload, "items") instanceof List<?>) {
                salesRepository.deleteQuoteItems(companyId, id);
            }
            createQuoteItemsFromPayload(companyId, id, normalizedPayload);
            refreshQuoteAmount(companyId, id);
        }
        return get(companyId, collection, id);
    }

    /**
     * Persists an inventory operation as a single transaction. Balance updates
     * and movement history must either finish together or roll back together.
     */
    @Transactional
    public Map<String, Object> commitInventoryOperation(
            long companyId,
            long userId,
            Map<String, Object> payload) {
        var balanceRows = requirePayloadRows(payload, "balances");
        var movementRows = requirePayloadRows(payload, "movements");
        var balanceKeys = new java.util.HashSet<String>();

        for (var balance : balanceRows) {
            var productId = requirePositiveId(balance, "productId");
            var warehouseId = requirePositiveId(balance, "warehouseId");
            balanceKeys.add(productId + ":" + warehouseId);
        }

        for (var movement : movementRows) {
            var productId = requirePositiveId(movement, "productId");
            var fromWarehouseId = optionalPositiveId(movement, "fromWarehouseId");
            var toWarehouseId = optionalPositiveId(movement, "toWarehouseId");
            var quantity = SalesPayloadSupport.decimalValue(movement, "quantity");
            if (quantity == null || quantity.signum() == 0) {
                throw new IllegalArgumentException("Cada movimiento debe tener una cantidad distinta de cero.");
            }
            if (fromWarehouseId == null && toWarehouseId == null) {
                throw new IllegalArgumentException("Cada movimiento debe indicar al menos un almacén.");
            }
            if (fromWarehouseId != null && !balanceKeys.contains(productId + ":" + fromWarehouseId)) {
                throw new IllegalArgumentException("Cada movimiento debe incluir el saldo del almacén de origen.");
            }
            if (toWarehouseId != null && !balanceKeys.contains(productId + ":" + toWarehouseId)) {
                throw new IllegalArgumentException("Cada movimiento debe incluir el saldo del almacén de destino.");
            }
        }

        var persistedBalances = new ArrayList<Map<String, Object>>();
        for (var balance : balanceRows) {
            var balancePayload = new LinkedHashMap<>(balance);
            var balanceId = SalesPayloadSupport.longValue(balancePayload, "id");
            balancePayload.remove("id");
            balancePayload.remove("ID");
            persistedBalances.add(balanceId != null && balanceId > 0
                    ? update(companyId, userId, "inventory-balances", balanceId, balancePayload)
                    : create(companyId, userId, "inventory-balances", balancePayload));
        }

        var persistedMovements = new ArrayList<Map<String, Object>>();
        for (var movement : movementRows) {
            persistedMovements.add(create(companyId, userId, "inventory-movements", movement));
        }

        var result = new LinkedHashMap<String, Object>();
        result.put("balances", persistedBalances);
        result.put("movements", persistedMovements);
        return result;
    }

    private static void removeClientCommissionCalculation(Map<String, Object> payload) {
        List.of(
                "commissionRate", "commissionAmount", "commissionRuleId", "commissionRuleCode",
                "commissionRuleName", "commissionType", "commissionValue", "commissionBreakdown")
                .forEach(payload::remove);
    }

    private static boolean commissionInputsChanged(Map<String, Object> payload) {
        if (payload == null) return false;
        return List.of("saleDate", "totalAmount", "sellerUserCompanyId", "sellerName", "saleLines")
                .stream().anyMatch(key -> SalesPayloadSupport.value(payload, key) != null);
    }

    @Transactional
    public void delete(long companyId, String collection, long id) {
        if ("inventory-warehouses".equals(collection)) {
            salesRepository.lockWarehouseForDeletion(companyId, id);
            if (salesRepository.countCashRegistersForWarehouse(companyId, id) > 0) {
                throw new IllegalArgumentException(
                        "Warehouse cannot be deleted because it is assigned to one or more POS registers. "
                                + "Reassign or delete the registers first.");
            }
        }
        if ("quotes".equals(collection)) {
            salesRepository.lockQuoteForDeletion(companyId, id);
            if (salesRepository.countActiveQuoteDependents(companyId, id) > 0) {
                throw new IllegalArgumentException(
                        "Quote cannot be deleted because it is already used by a sale, contract, or post-sale record.");
            }
        }
        if ("sales".equals(collection)) {
            salesRepository.lockSaleForDeletion(companyId, id);
            if (salesRepository.countActiveSaleDependents(companyId, id) > 0) {
                throw new IllegalArgumentException(
                        "Sale cannot be deleted because it has a credit account, POS ticket, or closed commission cut.");
            }
        }
        salesRepository.softDelete(companyId, definition(collection), id);
        if ("products".equals(collection)) {
            salesRepository.removeProductFromPublicCatalogs(companyId, id);
        }
    }

    public Map<String, Object> kpis(long companyId, String preferredCurrency) {
        var body = new LinkedHashMap<>(salesRepository.kpis(companyId));
        var rates = businessExchangeRateService.loadDailyRates();
        var metadata = rates.metadata();
        var effectiveDate = parseKpiRateDate(metadata == null ? null : metadata.sourceDate());
        var source = metadata == null ? "" : metadata.sourceName();
        var currency = preferredCurrency == null || preferredCurrency.isBlank() ? "MXN" : preferredCurrency;

        var pipeline = kpiCurrencyAggregationService.aggregate(salesRepository.opportunityKpiAmounts(companyId), currency, rates.ratesPerUsd(), "daily", effectiveDate, source);
        var quoted = kpiCurrencyAggregationService.aggregate(salesRepository.quoteKpiAmounts(companyId), currency, rates.ratesPerUsd(), "daily", effectiveDate, source);
        var sales = kpiCurrencyAggregationService.aggregate(salesRepository.salesKpiAmounts(companyId, "all"), currency, rates.ratesPerUsd(), "daily", effectiveDate, source);
        var monthly = kpiCurrencyAggregationService.aggregate(salesRepository.salesKpiAmounts(companyId, "month"), currency, rates.ratesPerUsd(), "daily", effectiveDate, source);
        var weekly = kpiCurrencyAggregationService.aggregate(salesRepository.salesKpiAmounts(companyId, "week"), currency, rates.ratesPerUsd(), "daily", effectiveDate, source);

        body.put("pipelineValue", pipeline.preferredTotal());
        body.put("quotedValue", quoted.preferredTotal());
        body.put("salesValue", sales.preferredTotal());
        body.put("monthlySalesValue", monthly.preferredTotal());
        body.put("weeklySalesValue", weekly.preferredTotal());
        body.put("monetaryKpis", Map.of("pipeline", pipeline, "quoted", quoted, "sales", sales, "monthlySales", monthly, "weeklySales", weekly));
        return body;
    }

    private LocalDate parseKpiRateDate(String value) {
        try {
            return value == null || value.isBlank() ? LocalDate.now() : LocalDate.parse(value);
        } catch (RuntimeException ignored) {
            return LocalDate.now();
        }
    }

    public Map<String, Object> previewCommissionRule(Map<String, Object> payload) {
        var ruleValue = SalesPayloadSupport.value(payload, "rule");
        var inputValue = SalesPayloadSupport.value(payload, "input");
        if (!(ruleValue instanceof Map<?, ?> rawRule) || !(inputValue instanceof Map<?, ?> rawInput)) {
            throw new IllegalArgumentException("rule and input are required.");
        }
        var rule = new LinkedHashMap<String, Object>();
        rawRule.forEach((key, value) -> rule.put(String.valueOf(key), value));
        var input = new LinkedHashMap<String, Object>();
        rawInput.forEach((key, value) -> input.put(String.valueOf(key), value));
        return SalesCommissionCalculator.preview(rule, input);
    }

    public Map<String, Object> listFiles(long companyId, String entityType, Long entityId) {
        var files = salesRepository.listFiles(companyId, entityType, entityId);
        files.forEach(this::enrichFileUrl);
        return Map.of("items", files, "count", files.size());
    }

    public Map<String, Object> createProductImageUpload(long companyId, Map<String, Object> payload) {
        requireProductImageStorage();
        var fileName = requireFileName(payload);
        var contentType = requireProductImageContentType(
                SalesPayloadSupport.stringValue(payload, "contentType"),
                fileName);
        var sizeBytes = requireProductImageSize(payload);
        var objectKey = buildProductImageObjectKey(companyId, fileName);
        var upload = storageMeter.presign(
                companyId,
                "SALES",
                productImagesBucket(),
                objectKey,
                contentType,
                sizeBytes,
                storageProperties.getMinio().getPresignExpirySeconds());

        var body = new LinkedHashMap<String, Object>();
        body.put("objectKey", upload.objectKey());
        body.put("object_key", upload.objectKey());
        body.put("uploadUrl", upload.uploadUrl());
        body.put("upload_url", upload.uploadUrl());
        body.put("expiresAt", upload.expiresAt().toString());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("uploadHeaders", upload.uploadHeaders());
        body.put("upload_headers", upload.uploadHeaders());
        body.put("fileName", fileName);
        body.put("contentType", contentType);
        body.put("sizeBytes", sizeBytes);
        return body;
    }

    public Map<String, Object> createSalePaymentEvidenceUpload(long companyId, Map<String, Object> payload) {
        requireProductImageStorage();
        var fileName = requireFileName(payload, "payment-evidence");
        var contentType = requirePaymentEvidenceContentType(
                SalesPayloadSupport.stringValue(payload, "contentType"),
                fileName);
        var sizeBytes = requirePaymentEvidenceSize(payload);
        var objectKey = paymentEvidencePrefix(companyId) + UUID.randomUUID() + "-" + sanitizeFileName(fileName);
        var upload = storageMeter.presign(
                companyId,
                "SALES",
                productImagesBucket(),
                objectKey,
                contentType,
                sizeBytes,
                storageProperties.getMinio().getPresignExpirySeconds());

        var body = new LinkedHashMap<String, Object>();
        body.put("objectKey", upload.objectKey());
        body.put("object_key", upload.objectKey());
        body.put("uploadUrl", upload.uploadUrl());
        body.put("upload_url", upload.uploadUrl());
        body.put("expiresAt", upload.expiresAt().toString());
        body.put("expires_at", upload.expiresAt().toString());
        body.put("uploadHeaders", upload.uploadHeaders());
        body.put("upload_headers", upload.uploadHeaders());
        body.put("fileName", fileName);
        body.put("contentType", contentType);
        body.put("sizeBytes", sizeBytes);
        return body;
    }

    @Transactional
    public Map<String, Object> registerSalePaymentEvidence(
            long companyId,
            long userId,
            long saleId,
            Map<String, Object> payload) {
        salesRepository.get(companyId, definition("sales"), saleId);
        requireProductImageStorage();

        var objectKey = firstNonBlank(
                SalesPayloadSupport.stringValue(payload, "objectKey"),
                SalesPayloadSupport.stringValue(payload, "object_key"));
        if (objectKey == null || !objectKey.startsWith(paymentEvidencePrefix(companyId))) {
            throw new IllegalArgumentException("A valid payment evidence objectKey is required.");
        }
        if (!objectStorageService.objectExists(productImagesBucket(), objectKey)) {
            throw new IllegalArgumentException("Uploaded payment evidence was not found in storage.");
        }

        var fileName = requireFileName(Map.of(
                "fileName",
                firstNonBlank(
                        SalesPayloadSupport.stringValue(payload, "fileName"),
                        objectKey.substring(objectKey.lastIndexOf('/') + 1))),
                "payment-evidence");
        var contentType = requirePaymentEvidenceContentType(
                SalesPayloadSupport.stringValue(payload, "contentType"),
                fileName);
        var sizeBytes = requirePaymentEvidenceSize(payload);
        storageMeter.commit(companyId, productImagesBucket(), objectKey, sizeBytes);

        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("contentType", contentType);
        metadata.put("sizeBytes", sizeBytes);

        var filePayload = new LinkedHashMap<String, Object>();
        filePayload.put("entityType", "sale");
        filePayload.put("entityId", saleId);
        filePayload.put("fileName", fileName);
        filePayload.put("fileKind", "payment_evidence");
        filePayload.put("fileStatus", "under_review");
        filePayload.put("source", "object_storage");
        filePayload.put("objectKey", objectKey);
        filePayload.put("url", signedProductImageUrl(objectKey));
        filePayload.put("metadata", metadata);

        var fileId = salesRepository.createFile(companyId, userId, filePayload);
        salesRepository.markSalePaymentEvidenceUnderReview(companyId, userId, saleId);
        var body = new LinkedHashMap<String, Object>(filePayload);
        body.put("id", fileId);
        return body;
    }

    @Transactional
    public Map<String, Object> registerProductImage(
            long companyId,
            long userId,
            long productId,
            Map<String, Object> payload) {
        salesRepository.get(companyId, definition("products"), productId);
        requireProductImageStorage();

        var objectKey = SalesPayloadSupport.stringValue(payload, "objectKey");
        if (objectKey == null) {
            objectKey = SalesPayloadSupport.stringValue(payload, "object_key");
        }
        if (objectKey == null || !objectKey.startsWith(productImagePrefix(companyId))) {
            throw new IllegalArgumentException("A valid product image objectKey is required.");
        }
        if (!objectStorageService.objectExists(productImagesBucket(), objectKey)) {
            throw new IllegalArgumentException("Uploaded product image was not found in storage.");
        }

        var existingFile = salesRepository.findFileByObjectKey(companyId, objectKey);
        if (existingFile != null) {
            var existingEntityId = SalesPayloadSupport.longValue(existingFile, "entityId");
            if (!"product".equals(SalesPayloadSupport.stringValue(existingFile, "entityType"))
                    || !"product_image".equals(SalesPayloadSupport.stringValue(existingFile, "fileKind"))
                    || existingEntityId == null
                    || existingEntityId != productId) {
                throw new IllegalArgumentException("The uploaded product image is already assigned to another record.");
            }
            enrichFileUrl(existingFile);
            return existingFile;
        }

        var fileName = firstNonBlank(
                SalesPayloadSupport.stringValue(payload, "fileName"),
                SalesPayloadSupport.stringValue(payload, "file_name"),
                objectKey.substring(objectKey.lastIndexOf('/') + 1));
        var contentType = requireProductImageContentType(SalesPayloadSupport.stringValue(payload, "contentType"), fileName);
        var sizeBytes = requireProductImageSize(payload);
        storageMeter.commit(companyId, productImagesBucket(), objectKey, sizeBytes);
        var signedUrl = signedProductImageUrl(objectKey);
        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("contentType", contentType);
        metadata.put("sizeBytes", sizeBytes);
        metadata.put("alt", SalesPayloadSupport.stringValue(payload, "alt"));

        var filePayload = new LinkedHashMap<String, Object>();
        filePayload.put("entityType", "product");
        filePayload.put("entityId", productId);
        filePayload.put("fileName", fileName);
        filePayload.put("fileKind", "product_image");
        filePayload.put("fileStatus", "uploaded");
        filePayload.put("source", "object_storage");
        filePayload.put("objectKey", objectKey);
        filePayload.put("url", signedUrl);
        filePayload.put("metadata", metadata);

        var id = salesRepository.createFile(companyId, userId, filePayload);
        var body = new LinkedHashMap<String, Object>();
        body.putAll(filePayload);
        body.put("id", id);
        return body;
    }

    @Transactional
    public Map<String, Object> createFile(long companyId, long userId, Map<String, Object> payload) {
        var entityType = SalesPayloadSupport.stringValue(payload, "entityType");
        var entityId = SalesPayloadSupport.longValue(payload, "entityId");
        if (entityType == null || entityId == null) {
            throw new IllegalArgumentException("entityType and entityId are required.");
        }
        referenceService.validateFileEntity(companyId, entityType, entityId);
        salesRepository.createFile(companyId, userId, payload);
        return listFiles(companyId, entityType, entityId);
    }

    @Transactional
    public void deleteFile(long companyId, long fileId) {
        var file = salesRepository.findFile(companyId, fileId);
        var objectKey = file == null ? null : SalesPayloadSupport.stringValue(file, "objectKey");
        if (objectKey != null && (objectKey.startsWith(productImagePrefix(companyId))
                || objectKey.startsWith(paymentEvidencePrefix(companyId)))) {
            objectStorageService.deleteObject(productImagesBucket(), objectKey);
            storageMeter.release(companyId, objectKey, "sales_file_deleted");
        }
        salesRepository.deleteFile(companyId, fileId);
    }

    @Transactional
    public Map<String, Object> createQuoteItem(long companyId, long quoteId, Map<String, Object> payload) {
        salesRepository.get(companyId, definition("quotes"), quoteId);
        referenceService.validateQuoteItemPayload(companyId, payload);
        salesRepository.createQuoteItem(companyId, quoteId, payload);
        refreshQuoteAmount(companyId, quoteId);
        return get(companyId, "quotes", quoteId);
    }

    @Transactional
    public Map<String, Object> updateQuoteItem(long companyId, long quoteId, long itemId, Map<String, Object> payload) {
        salesRepository.get(companyId, definition("quotes"), quoteId);
        referenceService.validateQuoteItemPayload(companyId, payload);
        salesRepository.updateQuoteItem(companyId, quoteId, itemId, payload);
        refreshQuoteAmount(companyId, quoteId);
        return get(companyId, "quotes", quoteId);
    }

    @Transactional
    public Map<String, Object> deleteQuoteItem(long companyId, long quoteId, long itemId) {
        salesRepository.get(companyId, definition("quotes"), quoteId);
        salesRepository.deleteQuoteItem(companyId, quoteId, itemId);
        refreshQuoteAmount(companyId, quoteId);
        return get(companyId, "quotes", quoteId);
    }

    @Transactional
    public Map<String, Object> connectQuote(long companyId, long userId, long quoteId, Map<String, Object> payload) {
        var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
        var mode = firstNonBlank(SalesPayloadSupport.stringValue(payload, "mode"), "quote_only");
        if ("existing_opportunity".equals(mode) || "existingOpportunity".equals(mode)) {
            var opportunityId = SalesPayloadSupport.longValue(payload, "opportunityId");
            if (opportunityId == null) {
                throw new IllegalArgumentException("opportunityId is required.");
            }
            referenceService.validateEntityPayload(companyId, "quotes", Map.of("opportunityId", opportunityId));
            salesRepository.linkQuoteToOpportunity(companyId, quoteId, opportunityId, "assigned_to_existing_opportunity");
            return get(companyId, "quotes", quoteId);
        }
        if ("create_opportunity".equals(mode) || "createOpportunity".equals(mode)) {
            var opportunityPayload = opportunityPayloadFromQuote(quote, payload);
            var opportunity = create(companyId, userId, "opportunities", opportunityPayload);
            salesRepository.linkQuoteToOpportunity(companyId, quoteId, longId(opportunity), "created_opportunity");
            return get(companyId, "quotes", quoteId);
        }

        salesRepository.linkQuoteToOpportunity(companyId, quoteId, null, "commercial_quote");
        return get(companyId, "quotes", quoteId);
    }

    private SalesEntityDefinition definition(String collection) {
        var definition = definitions.get(collection);
        if (definition == null) {
            throw new NoSuchElementException("Unsupported sales collection: " + collection);
        }
        return definition;
    }

    private Map<String, Object> normalizeBeforeSave(long companyId, String collection, Map<String, Object> payload) {
        var normalized = new LinkedHashMap<String, Object>();
        if (payload != null) {
            normalized.putAll(payload);
        }

        if ("opportunities".equals(collection)) {
            hydrateOpportunityFromContact(companyId, normalized);
        }
        if ("quotes".equals(collection)) {
            hydrateQuoteFromContactAndOpportunity(companyId, normalized);
            normalized.putIfAbsent("createdDate", LocalDate.now().toString());
        }
        if ("sales".equals(collection)) {
            hydrateSaleFromRelations(companyId, normalized);
            normalized.putIfAbsent("saleDate", LocalDate.now().toString());
        }
        if ("contracts".equals(collection)) {
            hydrateContractFromRelations(companyId, normalized);
        }
        if ("post-sales".equals(collection)) {
            hydratePostSaleFromRelations(companyId, normalized);
        }
        if ("products".equals(collection)) {
            removeClientProductSalesReadiness(normalized);
            removeEmbeddedProductImages(companyId, normalized);
            normalizeProductAvailability(normalized);
        }
        if ("inventory-balances".equals(collection)) {
            inheritInventoryBalanceWarehouseScope(companyId, normalized);
        }
        return normalized;
    }

    private void normalizeProductAvailability(Map<String, Object> payload) {
        var reservable = booleanValue(SalesPayloadSupport.value(payload, "reservable"));
        payload.put("reservable", reservable);
        if (!reservable) {
            payload.put("availabilityIcalUrl", null);
            return;
        }
        var rawUrl = SalesPayloadSupport.stringValue(payload, "availabilityIcalUrl");
        var uri = SalesAvailabilityUrlPolicy.requireSafeConfiguredUrl(rawUrl);
        payload.put("availabilityIcalUrl", availabilityLinkCodec.protect(uri.toString()));
    }

    private void revealProductAvailability(Map<String, Object> item) {
        var protectedUrl = SalesPayloadSupport.stringValue(item, "availabilityIcalUrl");
        if (protectedUrl == null || protectedUrl.isBlank()) return;
        item.put("availabilityIcalUrl", availabilityLinkCodec.reveal(protectedUrl));
    }

    private static void removeClientProductSalesReadiness(Map<String, Object> payload) {
        List.of(
                "readyForSales", "ready_for_sales",
                "salesReadiness", "sales_readiness",
                "salesReadinessReasons", "sales_readiness_reasons")
                .forEach(payload::remove);
    }

    private static void enrichProductSalesReadiness(Map<String, Object> item) {
        var reasons = new ArrayList<String>();
        var status = canonicalProductToken(item.get("status"));
        var visibility = canonicalProductToken(item.get("visibility"));
        var type = canonicalProductToken(item.get("type"));

        if ("draft".equals(status)) {
            reasons.add("DRAFT");
        } else if (!"active".equals(status)) {
            reasons.add("INACTIVE");
        }
        if (!PRODUCT_SALES_VISIBILITIES.contains(visibility)) {
            reasons.add("INTERNAL");
        }
        if ("operational_item".equals(type)) {
            reasons.add("OPERATIONAL_ITEM");
        }
        if (!hasPositiveProductPrice(item.get("price"))) {
            reasons.add("MISSING_PRICE");
        }

        var readiness = reasons.isEmpty()
                ? "READY"
                : reasons.size() == 1 && "MISSING_PRICE".equals(reasons.getFirst())
                        ? "REQUIRES_REVIEW"
                        : "NOT_READY";
        item.put("readyForSales", "READY".equals(readiness));
        item.put("salesReadiness", readiness);
        item.put("salesReadinessReasons", List.copyOf(reasons));
    }

    private static String canonicalProductToken(Object value) {
        if (value == null) {
            return "";
        }
        return String.valueOf(value)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
    }

    private static boolean hasPositiveProductPrice(Object value) {
        if (value == null) {
            return false;
        }
        try {
            var price = value instanceof BigDecimal decimal
                    ? decimal
                    : new BigDecimal(String.valueOf(value).trim());
            return price.compareTo(BigDecimal.ZERO) > 0;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean bool) return bool;
        if (value instanceof Number number) return number.intValue() != 0;
        return value != null && List.of("true", "1", "yes", "on")
            .contains(String.valueOf(value).trim().toLowerCase(Locale.ROOT));
    }

    private void inheritInventoryBalanceWarehouseScope(long companyId, Map<String, Object> payload) {
        var warehouseId = SalesPayloadSupport.longValue(payload, "warehouseId");
        if (warehouseId == null) {
            return;
        }
        var warehouse = salesRepository.get(companyId, definition("inventory-warehouses"), warehouseId);
        payload.put("warehouseName", warehouse.get("name"));
        payload.put("businessUnitId", warehouse.get("businessUnitId"));
        payload.put("businessUnitName", warehouse.get("businessUnitName"));
        payload.put("businessId", warehouse.get("businessId"));
        payload.put("businessName", warehouse.get("businessName"));
    }

    private void removeEmbeddedProductImages(long companyId, Map<String, Object> payload) {
        removeEmbeddedImageFields(companyId, payload);

        var customFieldsValue = SalesPayloadSupport.value(payload, "customFields");
        if (customFieldsValue instanceof Map<?, ?> customFieldsMap) {
            var customFields = new LinkedHashMap<String, Object>();
            customFieldsMap.forEach((key, value) -> customFields.put(String.valueOf(key), value));
            removeEmbeddedImageFields(companyId, customFields);
            payload.put("customFields", customFields);
        }

        var metadataValue = SalesPayloadSupport.value(payload, "metadata");
        if (!(metadataValue instanceof Map<?, ?> metadataMap)) {
            return;
        }

        var metadata = new LinkedHashMap<String, Object>();
        metadataMap.forEach((key, value) -> metadata.put(String.valueOf(key), value));
        removeEmbeddedImageFields(companyId, metadata);
        payload.put("metadata", metadata);
    }

    private void removeEmbeddedImageFields(long companyId, Map<String, Object> fields) {
        if (isEmbeddedImageUrl(fields.get("imageUrl"))) {
            fields.remove("imageUrl");
        }

        var galleryValue = fields.get("gallery");
        if (galleryValue instanceof List<?> gallery) {
            var safeGallery = new ArrayList<Object>();
            var primaryImageUsesObjectStorage = false;
            for (var item : gallery) {
                if (item instanceof Map<?, ?> imageMap) {
                    var safeImage = new LinkedHashMap<String, Object>();
                    imageMap.forEach((key, value) -> safeImage.put(String.valueOf(key), value));
                    var objectKey = imageObjectKey(safeImage);
                    if (objectKey != null && !objectKey.startsWith(productImagePrefix(companyId))) {
                        if (safeGallery.isEmpty()) {
                            fields.remove("imageUrl");
                        }
                        continue;
                    }
                    if (objectKey != null) {
                        safeImage.remove("url");
                    } else if (isEmbeddedImageUrl(safeImage.get("url"))) {
                        safeImage.remove("url");
                    }
                    if (objectKey != null || isPersistableImageUrl(safeImage.get("url"))) {
                        if (safeGallery.isEmpty() && objectKey != null) {
                            primaryImageUsesObjectStorage = true;
                        }
                        safeGallery.add(safeImage);
                    }
                    continue;
                }
                if (!isEmbeddedImageUrl(item)) {
                    safeGallery.add(item);
                }
            }
            if (safeGallery.isEmpty()) {
                fields.remove("gallery");
            } else {
                fields.put("gallery", safeGallery);
            }
            if (primaryImageUsesObjectStorage) {
                fields.remove("imageUrl");
            }
        }
    }

    private static boolean isEmbeddedImageUrl(Object value) {
        if (!(value instanceof String raw)) {
            return false;
        }
        var normalized = raw.trim();
        return normalized.regionMatches(true, 0, "data:", 0, 5)
                || normalized.regionMatches(true, 0, "blob:", 0, 5);
    }

    private static boolean isPersistableImageUrl(Object value) {
        return value instanceof String raw && !raw.trim().isBlank() && !isEmbeddedImageUrl(raw);
    }

    private void enrichProductImages(long companyId, Map<String, Object> item) {
        var metadataValue = item.get("metadata");
        var metadata = new LinkedHashMap<String, Object>();
        if (metadataValue instanceof Map<?, ?> metadataMap) {
            metadataMap.forEach((key, value) -> metadata.put(String.valueOf(key), value));
        }

        if (isEmbeddedImageUrl(metadata.get("imageUrl"))) {
            metadata.remove("imageUrl");
        }

        var galleryValue = metadata.get("gallery");
        var enrichedGallery = new ArrayList<Object>();
        var seenObjectKeys = new java.util.LinkedHashSet<String>();
        if (galleryValue instanceof List<?> gallery) {
            for (var imageValue : gallery) {
                if (!(imageValue instanceof Map<?, ?> imageMap)) {
                    continue;
                }
                var image = new LinkedHashMap<String, Object>();
                imageMap.forEach((key, value) -> image.put(String.valueOf(key), value));
                var objectKey = imageObjectKey(image);
                if (objectKey != null && !objectKey.startsWith(productImagePrefix(companyId))) {
                    continue;
                }
                if (objectKey != null) {
                    seenObjectKeys.add(objectKey);
                    var signedUrl = safeSignedProductImageUrl(objectKey);
                    if (signedUrl != null) {
                        image.put("url", signedUrl);
                    } else if (isEmbeddedImageUrl(image.get("url"))) {
                        image.remove("url");
                    }
                } else if (isEmbeddedImageUrl(image.get("url"))) {
                    image.remove("url");
                }
                if (objectKey != null || isPersistableImageUrl(image.get("url"))) {
                    enrichedGallery.add(image);
                }
            }
        }

        appendProductImageFiles(companyId, longId(item), enrichedGallery, seenObjectKeys);
        if (enrichedGallery.isEmpty()) {
            metadata.remove("gallery");
        } else {
            metadata.put("gallery", enrichedGallery);
        }
        if (!enrichedGallery.isEmpty()) {
            for (var imageValue : enrichedGallery) {
                if (imageValue instanceof Map<?, ?> image && isPersistableImageUrl(image.get("url"))) {
                    metadata.put("imageUrl", image.get("url"));
                    break;
                }
            }
        }
        item.put("metadata", metadata);
    }

    private void appendProductImageFiles(
            long companyId,
            long productId,
            List<Object> gallery,
            Set<String> seenObjectKeys) {
        for (var file : salesRepository.listFiles(companyId, "product", productId)) {
            if (!"product_image".equals(SalesPayloadSupport.stringValue(file, "fileKind"))) {
                continue;
            }
            var objectKey = SalesPayloadSupport.stringValue(file, "objectKey");
            if (objectKey == null || seenObjectKeys.contains(objectKey)) {
                continue;
            }
            enrichFileUrl(file);
            var image = new LinkedHashMap<String, Object>();
            image.put("id", file.get("id"));
            image.put("url", file.get("url"));
            image.put("objectKey", objectKey);
            image.put("fileName", file.get("fileName"));
            image.put("source", "upload");
            if (file.get("metadata") instanceof Map<?, ?> fileMetadata) {
                var alt = fileMetadata.get("alt");
                if (alt != null) {
                    image.put("alt", alt);
                }
                var contentType = fileMetadata.get("contentType");
                if (contentType != null) {
                    image.put("contentType", contentType);
                }
                var sizeBytes = fileMetadata.get("sizeBytes");
                if (sizeBytes != null) {
                    image.put("sizeBytes", sizeBytes);
                }
            }
            gallery.add(image);
            seenObjectKeys.add(objectKey);
        }
    }

    private void enrichFileUrl(Map<String, Object> file) {
        var objectKey = SalesPayloadSupport.stringValue(file, "objectKey");
        if (objectKey == null) {
            objectKey = SalesPayloadSupport.stringValue(file, "object_key");
        }
        if (objectKey == null) {
            return;
        }
        var signedUrl = safeSignedProductImageUrl(objectKey);
        if (signedUrl != null) {
            file.put("url", signedUrl);
        }
    }

    private String imageObjectKey(Map<String, Object> image) {
        var objectKey = image.get("objectKey");
        if (objectKey == null) {
            objectKey = image.get("object_key");
        }
        if (!(objectKey instanceof String raw) || raw.isBlank()) {
            return null;
        }
        return raw.trim();
    }

    private void requireProductImageStorage() {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Sales product image storage is not enabled.");
        }
        objectStorageService.ensureBucketExists(productImagesBucket());
    }

    private String productImagesBucket() {
        return storageProperties.getMinio().getBucketSalesDocuments();
    }

    private String signedProductImageUrl(String objectKey) {
        return objectStorageService.presignDownload(
                productImagesBucket(),
                objectKey,
                storageProperties.getMinio().getPresignExpirySeconds());
    }

    private String safeSignedProductImageUrl(String objectKey) {
        if (!objectStorageService.isEnabled()) {
            return null;
        }
        try {
            return signedProductImageUrl(objectKey);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private String buildProductImageObjectKey(long companyId, String fileName) {
        return productImagePrefix(companyId) + UUID.randomUUID() + "-" + sanitizeFileName(fileName);
    }

    private String productImagePrefix(long companyId) {
        return "sales/products/" + companyId + "/images/";
    }

    private String requireFileName(Map<String, Object> payload) {
        return requireFileName(payload, "product-image");
    }

    private String requireFileName(Map<String, Object> payload, String fallback) {
        var fileName = firstNonBlank(
                SalesPayloadSupport.stringValue(payload, "fileName"),
                SalesPayloadSupport.stringValue(payload, "file_name"),
                fallback);
        return sanitizeFileName(fileName);
    }

    private String paymentEvidencePrefix(long companyId) {
        return "sales/sales/" + companyId + "/payment-evidence/";
    }

    private long requirePaymentEvidenceSize(Map<String, Object> payload) {
        var sizeBytes = SalesPayloadSupport.longValue(payload, "sizeBytes");
        if (sizeBytes == null) {
            sizeBytes = SalesPayloadSupport.longValue(payload, "size_bytes");
        }
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("sizeBytes is required.");
        }
        if (sizeBytes > MAX_PAYMENT_EVIDENCE_SIZE_BYTES) {
            throw new IllegalArgumentException("Payment evidence cannot exceed 15 MB.");
        }
        return sizeBytes;
    }

    private String requirePaymentEvidenceContentType(String contentType, String fileName) {
        var normalized = contentType == null ? null : contentType.trim().toLowerCase(Locale.ROOT);
        if (normalized == null || normalized.isBlank() || "application/octet-stream".equals(normalized)) {
            normalized = fileName.toLowerCase(Locale.ROOT).endsWith(".pdf")
                    ? "application/pdf"
                    : inferImageContentType(fileName);
        }
        if (!PAYMENT_EVIDENCE_CONTENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Only PDF, JPEG, PNG or WebP payment evidence is supported.");
        }
        return normalized;
    }

    private long requireProductImageSize(Map<String, Object> payload) {
        var sizeBytes = SalesPayloadSupport.longValue(payload, "sizeBytes");
        if (sizeBytes == null) {
            sizeBytes = SalesPayloadSupport.longValue(payload, "size_bytes");
        }
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("sizeBytes is required.");
        }
        if (sizeBytes > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Product images cannot exceed 10 MB.");
        }
        return sizeBytes;
    }

    private String requireProductImageContentType(String contentType, String fileName) {
        var normalized = contentType == null ? null : contentType.trim().toLowerCase(Locale.ROOT);
        if (normalized == null || normalized.isBlank() || "application/octet-stream".equals(normalized)) {
            normalized = inferImageContentType(fileName);
        }
        if (!PRODUCT_IMAGE_CONTENT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Only image files are supported for products.");
        }
        return normalized;
    }

    private String inferImageContentType(String fileName) {
        var lower = fileName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        if (lower.endsWith(".avif")) {
            return "image/avif";
        }
        if (lower.endsWith(".heic")) {
            return "image/heic";
        }
        if (lower.endsWith(".heif")) {
            return "image/heif";
        }
        return "application/octet-stream";
    }

    private String sanitizeFileName(String fileName) {
        var normalized = Normalizer.normalize(firstNonBlank(fileName, "product-image"), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9._-]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^[.-]+|[.-]+$)", "");
        return normalized.isBlank() ? "product-image" : normalized;
    }

    private void hydrateOpportunityFromContact(long companyId, Map<String, Object> payload) {
        var contactId = SalesPayloadSupport.longValue(payload, "contactId");
        if (contactId == null) {
            return;
        }
        var contact = salesRepository.get(companyId, definition("contacts"), contactId);
        putIfAbsent(payload, "companyName", contact.get("companyName"));
        putIfAbsent(payload, "contactPerson", contact.get("contactPerson"));
        putIfAbsent(payload, "phone", contact.get("phone"));
        putIfAbsent(payload, "email", contact.get("email"));
        putIfAbsent(payload, "unitId", contact.get("unitId"));
        putIfAbsent(payload, "businessId", contact.get("businessId"));
        putIfAbsent(payload, "ownerUserCompanyId", contact.get("ownerUserCompanyId"));
        putIfAbsent(payload, "ownerName", contact.get("ownerName"));
    }

    private void hydrateQuoteFromContactAndOpportunity(long companyId, Map<String, Object> payload) {
        var opportunityId = SalesPayloadSupport.longValue(payload, "opportunityId");
        if (opportunityId != null) {
            var opportunity = salesRepository.get(companyId, definition("opportunities"), opportunityId);
            putIfAbsent(payload, "contactId", opportunity.get("contactId"));
            putIfAbsent(payload, "clientName", firstNonBlank((String) opportunity.get("companyName"), (String) opportunity.get("opportunityName")));
            putIfAbsent(payload, "contactPerson", opportunity.get("contactPerson"));
            putIfAbsent(payload, "assignedSellerUserCompanyId", opportunity.get("ownerUserCompanyId"));
            putIfAbsent(payload, "assignedSellerName", opportunity.get("ownerName"));
        }
        var contactId = SalesPayloadSupport.longValue(payload, "contactId");
        if (contactId != null) {
            var contact = salesRepository.get(companyId, definition("contacts"), contactId);
            putIfAbsent(payload, "clientName", contact.get("companyName"));
            putIfAbsent(payload, "contactPerson", contact.get("contactPerson"));
        }
    }

    private void hydrateContractFromRelations(long companyId, Map<String, Object> payload) {
        var quoteId = SalesPayloadSupport.longValue(payload, "quoteId");
        if (quoteId != null) {
            var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
            putIfAbsent(payload, "contactId", quote.get("contactId"));
            putIfAbsent(payload, "opportunityId", quote.get("opportunityId"));
            putIfAbsent(payload, "clientName", quote.get("clientName"));
            putIfAbsent(payload, "contactPerson", quote.get("contactPerson"));
            putIfAbsent(payload, "ownerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
            putIfAbsent(payload, "ownerName", quote.get("assignedSellerName"));
        }
    }

    private void hydrateSaleFromRelations(long companyId, Map<String, Object> payload) {
        var quoteId = SalesPayloadSupport.longValue(payload, "quoteId");
        if (quoteId != null) {
            var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
            putIfAbsent(payload, "contactId", quote.get("contactId"));
            putIfAbsent(payload, "opportunityId", quote.get("opportunityId"));
            putIfAbsent(payload, "quoteReference", quote.get("quoteNumber"));
            putIfAbsent(payload, "customerName", quote.get("clientName"));
            putIfAbsent(payload, "sellerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
            putIfAbsent(payload, "sellerName", quote.get("assignedSellerName"));
            putIfAbsent(payload, "totalAmount", quote.get("amount"));
            putIfAbsent(payload, "currency", quote.get("currency"));
        }

        var opportunityId = SalesPayloadSupport.longValue(payload, "opportunityId");
        if (opportunityId != null) {
            var opportunity = salesRepository.get(companyId, definition("opportunities"), opportunityId);
            putIfAbsent(payload, "contactId", opportunity.get("contactId"));
            putIfAbsent(payload, "unitId", opportunity.get("unitId"));
            putIfAbsent(payload, "businessId", opportunity.get("businessId"));
            putIfAbsent(payload, "customerName", firstNonBlank((String) opportunity.get("companyName"), (String) opportunity.get("opportunityName")));
            putIfAbsent(payload, "sellerUserCompanyId", opportunity.get("ownerUserCompanyId"));
            putIfAbsent(payload, "sellerName", opportunity.get("ownerName"));
        }

        var contactId = SalesPayloadSupport.longValue(payload, "contactId");
        if (contactId != null) {
            var contact = salesRepository.get(companyId, definition("contacts"), contactId);
            putIfAbsent(payload, "customerName", contact.get("companyName"));
            putIfAbsent(payload, "unitId", contact.get("unitId"));
            putIfAbsent(payload, "businessId", contact.get("businessId"));
        }
    }

    private void assignAuthenticatedSeller(long companyId, long userId, Map<String, Object> payload) {
        var seller = salesRepository.contextUsers(companyId).stream()
                .filter(user -> Long.valueOf(userId).equals(user.get("userId")))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("The authenticated user is not active in this company."));
        payload.put("sellerUserCompanyId", seller.get("userCompanyId"));
        payload.put("sellerName", seller.get("name"));
    }

    private void hydratePostSaleFromRelations(long companyId, Map<String, Object> payload) {
        var quoteId = SalesPayloadSupport.longValue(payload, "quoteId");
        if (quoteId != null) {
            var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
            putIfAbsent(payload, "contactId", quote.get("contactId"));
            putIfAbsent(payload, "opportunityId", quote.get("opportunityId"));
            putIfAbsent(payload, "clientName", quote.get("clientName"));
            putIfAbsent(payload, "ownerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
            putIfAbsent(payload, "ownerName", quote.get("assignedSellerName"));
            putIfAbsent(payload, "lifetimeValue", quote.get("amount"));
        }
    }

    private void createQuoteItemsFromPayload(long companyId, long quoteId, Map<String, Object> payload) {
        var items = SalesPayloadSupport.value(payload, "items");
        if (!(items instanceof List<?> list)) {
            return;
        }
        for (var item : list) {
            if (item instanceof Map<?, ?> map) {
                var itemPayload = new LinkedHashMap<String, Object>();
                map.forEach((key, value) -> itemPayload.put(String.valueOf(key), value));
                referenceService.validateQuoteItemPayload(companyId, itemPayload);
                salesRepository.createQuoteItem(companyId, quoteId, itemPayload);
            }
        }
    }

    private void refreshQuoteAmount(long companyId, long quoteId) {
        var total = salesRepository.quoteItemsTotal(companyId, quoteId);
        salesRepository.updateQuoteAmount(companyId, quoteId, total);
    }

    private Map<String, Object> opportunityPayloadFromQuote(Map<String, Object> quote, Map<String, Object> payload) {
        var opportunityPayload = new LinkedHashMap<String, Object>();
        opportunityPayload.put("contactId", quote.get("contactId"));
        opportunityPayload.put("opportunityName", firstNonBlank(
                SalesPayloadSupport.stringValue(payload, "opportunityName"),
                "Opportunity from " + quote.get("quoteNumber")));
        opportunityPayload.put("companyName", quote.get("clientName"));
        opportunityPayload.put("contactPerson", quote.get("contactPerson"));
        opportunityPayload.put("source", "quote");
        opportunityPayload.put("status", "active");
        opportunityPayload.put("estimatedValue", quote.get("amount"));
        opportunityPayload.put("currency", quote.get("currency"));
        opportunityPayload.put("ownerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
        opportunityPayload.put("ownerName", quote.get("assignedSellerName"));
        opportunityPayload.put("notes", "Created from quote " + quote.get("quoteNumber"));
        return opportunityPayload;
    }

    private void removeOpportunityFlowControl(Map<String, Object> payload) {
        payload.remove("flowId");
        payload.remove("flow_id");
    }

    private Map<String, Object> dictionaries(long companyId) {
        var dictionaries = new LinkedHashMap<String, Object>();
        dictionaries.put("opportunityStages", opportunityFlowService.activeStageKeys(companyId));
        dictionaries.put("temperatures", List.of("hot", "warm", "cold"));
        dictionaries.put("sources", List.of("manual", "website", "referral", "campaign", "social_media", "whatsapp", "existing_customer", "other"));
        dictionaries.put("opportunityStatuses", List.of("active", "pending_follow_up", "overdue", "on_hold", "closed"));
        dictionaries.put("nextActions", List.of("call", "whatsapp", "email", "meeting", "send_proposal", "follow_up", "review_documents", "close_deal"));
        dictionaries.put("productTypes", List.of("product", "service", "package", "subscription", "operational_item"));
        dictionaries.put("productCategories", List.of("cleaning", "technology", "consulting", "installation", "hospitality", "marketing", "software", "other"));
        dictionaries.put("quoteStatuses", List.of("draft", "sent", "viewed", "negotiation", "approved", "rejected", "expired", "closed_won"));
        dictionaries.put("contractStatuses", List.of("draft", "internal_review", "sent", "viewed", "pending_signature", "signed", "expired", "cancelled"));
        dictionaries.put("signatureStatuses", List.of("not_requested", "waiting", "signed", "declined", "expired"));
        dictionaries.put("contractTypes", List.of("service_agreement", "sales_agreement", "renewal_agreement", "subscription_agreement", "nda", "operational_agreement", "custom_contract"));
        dictionaries.put("postSaleStatuses", List.of("active", "pending_follow_up", "in_service", "renewal_soon", "recurrent", "at_risk", "completed", "closed"));
        dictionaries.put("relationTypes", List.of("one_time_customer", "recurrent_customer", "renewal_customer", "dormant_customer", "lost_prospect"));
        dictionaries.put("lostReasons", List.of("price", "timing", "no_response", "competitor", "not_qualified", "budget", "other"));
        return dictionaries;
    }

    private Long currentUserCompanyId(List<Map<String, Object>> users, long userId) {
        return users.stream()
                .filter(user -> Long.valueOf(userId).equals(user.get("userId")))
                .map(user -> (Long) user.get("userCompanyId"))
                .findFirst()
                .orElse(null);
    }

    private static long longId(Map<String, Object> item) {
        var id = item.get("id");
        return id instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(id));
    }

    private static List<Map<String, Object>> requirePayloadRows(Map<String, Object> payload, String key) {
        var value = SalesPayloadSupport.value(payload == null ? Map.of() : payload, key);
        if (!(value instanceof List<?> rows) || rows.isEmpty()) {
            throw new IllegalArgumentException("La operación debe incluir " + key + ".");
        }

        var result = new ArrayList<Map<String, Object>>();
        for (var row : rows) {
            if (!(row instanceof Map<?, ?> source)) {
                throw new IllegalArgumentException("La operación contiene un registro inválido en " + key + ".");
            }
            var mapped = new LinkedHashMap<String, Object>();
            for (var entry : source.entrySet()) {
                mapped.put(String.valueOf(entry.getKey()), entry.getValue());
            }
            result.add(mapped);
        }
        return result;
    }

    private static long requirePositiveId(Map<String, Object> payload, String key) {
        var value = SalesPayloadSupport.longValue(payload, key);
        if (value == null || value <= 0) {
            throw new IllegalArgumentException("La operación contiene un identificador inválido: " + key + ".");
        }
        return value;
    }

    private static Long optionalPositiveId(Map<String, Object> payload, String key) {
        var rawValue = SalesPayloadSupport.value(payload, key);
        if (rawValue == null || (rawValue instanceof String text && text.isBlank())) {
            return null;
        }
        return requirePositiveId(payload, key);
    }

    private static void putIfAbsent(Map<String, Object> payload, String key, Object value) {
        if (value != null && !payload.containsKey(key) && !payload.containsKey(SalesPayloadSupport.camelToSnake(key))) {
            payload.put(key, value);
        }
    }

    private static String firstNonBlank(String first, String fallback) {
        return first != null && !first.isBlank() ? first : fallback;
    }

    private static String firstNonBlank(String first, String second, String fallback) {
        var value = firstNonBlank(first, second);
        return value != null && !value.isBlank() ? value : fallback;
    }
}
