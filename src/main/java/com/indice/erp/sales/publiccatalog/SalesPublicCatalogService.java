package com.indice.erp.sales.publiccatalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationRequest;
import com.indice.erp.pos.discount.DiscountRuleService;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogAdminAccess.AdminContext;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AdminResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.BootstrapResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.LinkResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PublicImage;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PublicItem;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PurchaseRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestItemResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestListResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.ReviewRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SaveRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.StatusRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SubmissionResponse;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesPublicCatalogService {

    public static final String OWNER_MODULE = "SALES";
    public static final String KIOSK_TYPE = "public_catalog";
    private static final BigDecimal MAX_QUANTITY = new BigDecimal("999999.0000");
    private static final BigDecimal MAX_STORED_AMOUNT = new BigDecimal("99999999999.9999");

    private final SalesPublicCatalogRepository repository;
    private final KioskRegistryService registry;
    private final ObjectMapper objectMapper;
    private final SalesPublicCatalogLinkCodec linkCodec;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties storageProperties;
    private final Clock clock;
    private final SalesPublicCatalogAvailabilityService availabilityService;
    @Autowired
    private DiscountRuleService discountRules;

    @Autowired
    public SalesPublicCatalogService(
            SalesPublicCatalogRepository repository,
            KioskRegistryService registry,
            ObjectMapper objectMapper,
            SalesPublicCatalogLinkCodec linkCodec,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties storageProperties,
            SalesPublicCatalogAvailabilityService availabilityService) {
        this(repository, registry, objectMapper, linkCodec, objectStorageService, storageProperties,
            Clock.systemUTC(), availabilityService);
    }

    SalesPublicCatalogService(
            SalesPublicCatalogRepository repository,
            KioskRegistryService registry,
            ObjectMapper objectMapper,
            SalesPublicCatalogLinkCodec linkCodec,
            Clock clock) {
        this(repository, registry, objectMapper, linkCodec, null, null, clock, null);
    }

    SalesPublicCatalogService(
            SalesPublicCatalogRepository repository,
            KioskRegistryService registry,
            ObjectMapper objectMapper,
            SalesPublicCatalogLinkCodec linkCodec,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties storageProperties,
            Clock clock) {
        this(repository, registry, objectMapper, linkCodec, objectStorageService, storageProperties,
            clock, null);
    }

    SalesPublicCatalogService(
            SalesPublicCatalogRepository repository,
            KioskRegistryService registry,
            ObjectMapper objectMapper,
            SalesPublicCatalogLinkCodec linkCodec,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties storageProperties,
            Clock clock,
            SalesPublicCatalogAvailabilityService availabilityService) {
        this.repository = repository;
        this.registry = registry;
        this.objectMapper = objectMapper;
        this.linkCodec = linkCodec;
        this.objectStorageService = objectStorageService;
        this.storageProperties = storageProperties;
        this.clock = clock;
        this.availabilityService = availabilityService;
    }

    @Transactional(readOnly = true)
    public List<AdminResponse> list(AdminContext access) {
        return repository.list(access.companyId()).stream()
            .filter(row -> access.includes(row.unitId(), row.businessId()))
            .map(row -> admin(row, null)).toList();
    }

    @Transactional
    public AdminResponse create(AdminContext access, SaveRequest request) {
        validateSave(access, request, false);
        var companyId = access.companyId();
        var userId = access.userId();
        var code = uniqueCode(companyId, request.name());
        var token = token();
        var id = repository.insert(
            companyId, userId, code, request, tokenHint(token), linkCodec.protect(token));
        repository.replaceProducts(companyId, id, distinct(request.productIds()));
        var definition = registry.registerLegacyDefinition(
            companyId, OWNER_MODULE, KIOSK_TYPE, id, code, request.name().trim(), "active",
            request.unitId(), request.businessId(), request.expiresAt(), token, false, KioskAccessLevel.PUBLIC,
            "sales-public-catalog", "es-MX", userId);
        registry.synchronizeCapabilities(definition, SalesPublicCatalogCapabilities.descriptors());
        audit(companyId, id, null, "PUBLIC_CATALOG_CREATED", userId,
            Map.of("code", code, "unit_id", request.unitId(), "business_id", request.businessId(),
                "product_count", distinct(request.productIds()).size()));
        return admin(require(companyId, id), token);
    }

    @Transactional
    public AdminResponse update(AdminContext access, long catalogId, SaveRequest request) {
        var companyId = access.companyId();
        var userId = access.userId();
        var current = require(access, catalogId);
        requireMutable(current);
        validateSave(access, request, true);
        if (request.version() == null || !repository.update(
                companyId, userId, catalogId, request, request.version())) {
            throw new IllegalStateException("Public catalog changed; reload before saving again.");
        }
        repository.replaceProducts(companyId, catalogId, distinct(request.productIds()));
        registry.requireByLegacyReference(companyId, OWNER_MODULE, catalogId);
        registry.registerLegacyDefinition(
            companyId, OWNER_MODULE, KIOSK_TYPE, catalogId, current.code(), request.name().trim(),
            current.status(), request.unitId(), request.businessId(), request.expiresAt(),
            "registry-managed", false,
            KioskAccessLevel.PUBLIC, "sales-public-catalog", "es-MX", userId);
        audit(companyId, catalogId, null, "PUBLIC_CATALOG_UPDATED", userId,
            Map.of("unit_id", request.unitId(), "business_id", request.businessId(),
                "product_count", distinct(request.productIds()).size(),
                "configuration_version", request.version() + 1));
        return admin(require(companyId, catalogId), null);
    }

    @Transactional
    public AdminResponse transition(AdminContext access, long catalogId, StatusRequest request) {
        var companyId = access.companyId();
        var userId = access.userId();
        var current = require(access, catalogId);
        requireMutable(current);
        var target = normalizeLifecycle(request.status());
        if (target.equals(current.status())) return admin(current, null);
        registry.transition(companyId, OWNER_MODULE, catalogId,
            KioskDefinitionStatus.valueOf(target), userId, request.reason());
        if (!repository.updateStatus(companyId, userId, catalogId, target)) {
            throw new NoSuchElementException("Public catalog not found.");
        }
        audit(companyId, catalogId, null, "PUBLIC_CATALOG_" + target, userId,
            Map.of("reason", request.reason() == null ? "" : request.reason()));
        return admin(require(companyId, catalogId), null);
    }

    @Transactional
    public AdminResponse rotate(AdminContext access, long catalogId) {
        var companyId = access.companyId();
        var userId = access.userId();
        var current = require(access, catalogId);
        requireMutable(current);
        var token = token();
        registry.replacePublicToken(companyId, OWNER_MODULE, catalogId, token, userId);
        if (!repository.updateToken(
                companyId, userId, catalogId, tokenHint(token), linkCodec.protect(token))) {
            throw new NoSuchElementException("Public catalog not found.");
        }
        audit(companyId, catalogId, null, "PUBLIC_CATALOG_TOKEN_ROTATED", userId,
            Map.of("token_hint", tokenHint(token)));
        return admin(require(companyId, catalogId), token);
    }

    @Transactional
    public LinkResponse revealLink(AdminContext access, long catalogId) {
        var catalog = require(access, catalogId);
        requireMutable(catalog);
        if (catalog.protectedToken() == null || catalog.protectedToken().isBlank()) {
            var token = token();
            registry.replacePublicToken(
                catalog.companyId(), OWNER_MODULE, catalog.id(), token, access.userId());
            if (!repository.updateToken(
                    catalog.companyId(), access.userId(), catalog.id(), tokenHint(token),
                    linkCodec.protect(token))) {
                throw new IllegalStateException("Legacy public catalog link could not be reissued.");
            }
            audit(catalog.companyId(), catalog.id(), null, "PUBLIC_CATALOG_LEGACY_LINK_REISSUED",
                access.userId(), Map.of("token_hint", tokenHint(token)));
            return new LinkResponse(
                "/public-catalog/" + token, tokenHint(token), catalog.version() + 1);
        }
        var token = linkCodec.reveal(catalog.protectedToken());
        if (!tokenHint(token).equals(catalog.tokenHint())) {
            throw new IllegalStateException("Protected public catalog link does not match its token hint.");
        }
        audit(catalog.companyId(), catalog.id(), null, "PUBLIC_CATALOG_LINK_REVEALED",
            access.userId(), Map.of("token_hint", catalog.tokenHint()));
        return new LinkResponse("/public-catalog/" + token, catalog.tokenHint(), catalog.version());
    }

    @Transactional
    public void delete(AdminContext access, long catalogId, String reason) {
        var companyId = access.companyId();
        var userId = access.userId();
        var current = require(access, catalogId);
        var definition = registry.requireByLegacyReference(companyId, OWNER_MODULE, catalogId);
        var effective = definition.effectiveStatus(clock.instant());
        if (effective != KioskDefinitionStatus.REVOKED
                && effective != KioskDefinitionStatus.EXPIRED) {
            throw new IllegalStateException("Revoke or let the public catalog expire before deleting it.");
        }
        var deletionSnapshot = new LinkedHashMap<String, Object>();
        deletionSnapshot.put("code", current.code());
        deletionSnapshot.put("name", current.name());
        deletionSnapshot.put("status", effective.name());
        deletionSnapshot.put("unit_id", current.unitId() == null ? "" : current.unitId());
        deletionSnapshot.put("unit_name", current.unitName() == null ? "" : current.unitName());
        deletionSnapshot.put("business_id", current.businessId() == null ? "" : current.businessId());
        deletionSnapshot.put("business_name", current.businessName() == null ? "" : current.businessName());
        deletionSnapshot.put("reason", reason == null ? "" : reason.trim());
        audit(companyId, catalogId, null, "PUBLIC_CATALOG_DELETED", userId, deletionSnapshot);
        registry.deleteDefinition(companyId, OWNER_MODULE, catalogId, userId, reason);
        if (!repository.physicalDelete(companyId, catalogId)) {
            throw new NoSuchElementException("Public catalog not found.");
        }
    }

    @Transactional(readOnly = true)
    public BootstrapResponse bootstrap(long catalogId) {
        var catalog = requirePublic(catalogId);
        return bootstrap(catalog);
    }

    @Transactional(readOnly = true)
    public BootstrapResponse bootstrap(KioskResolvedDefinition definition) {
        return bootstrap(requirePublic(definition));
    }

    public AvailabilityResponse availability(
            KioskResolvedDefinition definition, AvailabilityRequest request) {
        if (availabilityService == null) {
            throw new IllegalStateException("Public catalog availability is not configured.");
        }
        return availabilityService.availability(requirePublic(definition), request);
    }

    private BootstrapResponse bootstrap(SalesPublicCatalogRepository.CatalogRecord catalog) {
        var sourceItems = repository.publicItems(catalog);
        var imagesByProduct = repository.publicImages(
            catalog.companyId(), sourceItems.stream().map(PublicItem::id).toList());
        var items = sourceItems.stream()
            .map(item -> publicView(catalog, item,
                imagesByProduct == null ? List.of() : imagesByProduct.getOrDefault(item.id(), List.of())))
            .toList();
        return new BootstrapResponse(
            catalog.code(), catalog.companyName(), catalog.companyLogoUrl(),
            catalog.unitName(), catalog.businessName(),
            catalog.title(), catalog.description(), catalog.coverImageUrl(),
            catalog.contactCtaLabel(), catalog.contactMethod(), catalog.contactValue(),
            catalog.showPrices(), catalog.showWholesalePrices(), catalog.showStockStatus(),
            catalog.showItemTypeBadges(), catalog.showCategories(), catalog.allowCart(),
            catalog.allowPurchaseRequest(), catalog.allowImageDownloads(), "REVIEW_REQUIRED", items,
            discountRules == null ? List.of() : discountRules.publishedRules(
                catalog.companyId(), catalog.unitId(), catalog.businessId(), null,
                "PUBLIC_CATALOG", items.stream().map(PublicItem::currency).findFirst().orElse("MXN")));
    }

    @Transactional
    public RequestResponse submit(long catalogId, PurchaseRequest request) {
        var catalog = requirePublic(catalogId);
        if (!catalog.allowPurchaseRequest()) {
            throw new SecurityException("Purchase requests are disabled for this catalog.");
        }
        validateContactMethod(request.preferredContactMethod());
        if (request.items().isEmpty() && (request.message() == null || request.message().isBlank())) {
            throw new IllegalArgumentException("Add products or a message before sending the request.");
        }
        var requested = new LinkedHashMap<Long, BigDecimal>();
        request.items().forEach(item -> requested.merge(item.productId(), item.quantity(), BigDecimal::add));
        var catalogItems = repository.publicItems(catalog).stream()
            .collect(java.util.stream.Collectors.toMap(PublicItem::id, item -> item));
        var lines = new ArrayList<RequestItemResponse>();
        String currency = null;
        for (var entry : requested.entrySet()) {
            var product = catalogItems.get(entry.getKey());
            if (product == null) throw new IllegalArgumentException("A selected product is not in this catalog.");
            var quantity = entry.getValue().setScale(4, RoundingMode.HALF_UP);
            if (quantity.signum() <= 0) throw new IllegalArgumentException("Quantity must be greater than zero.");
            if (quantity.compareTo(MAX_QUANTITY) > 0) {
                throw new IllegalArgumentException("Combined quantity exceeds the supported maximum.");
            }
            if (currency == null) currency = product.currency();
            if (!currency.equalsIgnoreCase(product.currency())) {
                throw new IllegalArgumentException("A request cannot mix currencies.");
            }
            var unitPrice = money(price(catalog, product, quantity));
            var lineSubtotal = money(unitPrice.multiply(quantity));
            var automatic = discountRules == null ? null : discountRules.bestAutomaticRule(
                catalog.companyId(), catalog.unitId(), catalog.businessId(),
                new EvaluationRequest("PUBLIC_CATALOG", lineSubtotal, product.id(), product.category(),
                    null, "PRODUCT", product.currency(), null, catalog.unitId(), catalog.businessId()));
            var lineDiscount = automatic == null ? BigDecimal.ZERO.setScale(4) : money(automatic.discountAmount());
            var lineTotal = money(lineSubtotal.subtract(lineDiscount));
            requireStoredAmount(lineTotal);
            lines.add(new RequestItemResponse(
                product.id(), product.sku(), product.name(), quantity, unitPrice,
                lineDiscount, automatic == null ? null : automatic.rule().id(), lineTotal));
        }
        var subtotal = lines.stream().map(line -> money(line.unitPrice().multiply(line.quantity())))
            .reduce(BigDecimal.ZERO.setScale(4), BigDecimal::add);
        var lineDiscountTotal = lines.stream().map(RequestItemResponse::discountAmount)
            .reduce(BigDecimal.ZERO.setScale(4), BigDecimal::add);
        var orderRule = discountRules == null ? null : discountRules.bestAutomaticRule(
            catalog.companyId(), catalog.unitId(), catalog.businessId(),
            new EvaluationRequest("PUBLIC_CATALOG", subtotal, null, null, null, "ORDER",
                currency == null ? "MXN" : currency, null, catalog.unitId(), catalog.businessId()));
        var orderDiscount = orderRule == null ? BigDecimal.ZERO.setScale(4) : money(orderRule.discountAmount());
        if (orderDiscount.signum() > 0 && lineDiscountTotal.signum() > 0) {
            if (orderDiscount.compareTo(lineDiscountTotal) >= 0) {
                lines.replaceAll(line -> new RequestItemResponse(
                    line.productId(), line.sku(), line.productName(), line.quantity(), line.unitPrice(),
                    BigDecimal.ZERO.setScale(4), null, money(line.unitPrice().multiply(line.quantity()))));
                lineDiscountTotal = BigDecimal.ZERO.setScale(4);
            } else {
                orderDiscount = BigDecimal.ZERO.setScale(4);
                orderRule = null;
            }
        }
        var discountTotal = money(lineDiscountTotal.add(orderDiscount));
        var total = money(subtotal.subtract(discountTotal));
        requireStoredAmount(total);
        var now = clock.instant();
        var number = "PCR-" + LocalDate.ofInstant(now, ZoneOffset.UTC).toString().replace("-", "")
            + "-" + fragment(8);
        var requestId = discountRules == null
            ? repository.insertRequest(
                catalog, number, request, currency == null ? "MXN" : currency.toUpperCase(Locale.ROOT),
                lines.size(), total)
            : repository.insertRequest(
                catalog, number, request, currency == null ? "MXN" : currency.toUpperCase(Locale.ROOT),
                lines.size(), subtotal, discountTotal, orderRule == null ? null : orderRule.rule().id(), total);
        for (int index = 0; index < lines.size(); index++) {
            repository.insertRequestItem(catalog.companyId(), requestId, lines.get(index), index);
        }
        audit(catalog.companyId(), catalog.id(), requestId, "PUBLIC_CATALOG_REQUEST_SUBMITTED", null,
            Map.of("request_number", number, "item_count", lines.size(),
                "estimated_total", total, "discount_amount", discountTotal, "policy", "REVIEW_REQUIRED"));
        return repository.findRequest(catalog.companyId(), requestId).orElseThrow();
    }

    @Transactional
    public SubmissionResponse submitPublic(KioskResolvedDefinition definition, PurchaseRequest request) {
        var catalog = requirePublic(definition);
        var submitted = submit(catalog.id(), request);
        return new SubmissionResponse(
            submitted.requestNumber(), submitted.requestNumber(), submitted.status(),
            "REVIEW_REQUIRED", submitted.currencyCode(), submitted.itemCount(),
            catalog.showPrices() ? submitted.estimatedTotal() : null);
    }

    @Transactional(readOnly = true)
    public RequestListResponse requests(AdminContext access, String status) {
        var items = repository.listRequests(access.companyId(), status, access);
        return new RequestListResponse(items, items.size());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> audit(AdminContext access, long catalogId) {
        require(access, catalogId);
        return repository.listAudit(access.companyId(), catalogId);
    }

    @Transactional
    public RequestResponse review(
            AdminContext access,
            long requestId,
            ReviewRequest request) {
        var companyId = access.companyId();
        var userId = access.userId();
        var status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!List.of("IN_REVIEW", "ACCEPTED", "REJECTED").contains(status)) {
            throw new IllegalArgumentException("Unsupported review status.");
        }
        var current = repository.findRequest(companyId, requestId)
            .orElseThrow(() -> new NoSuchElementException("Catalog request not found."));
        var requestScope = repository.requestScope(companyId, requestId)
            .orElseThrow(() -> new NoSuchElementException("Catalog request not found."));
        access.requireIncludes(requestScope.unitId(), requestScope.businessId());
        if (!repository.reviewRequest(companyId, userId, requestId, status, request.note())) {
            throw new IllegalStateException("Catalog request is no longer reviewable.");
        }
        audit(companyId, current.catalogId(), requestId, "PUBLIC_CATALOG_REQUEST_" + status,
            userId, Map.of("request_number", current.requestNumber()));
        return repository.findRequest(companyId, requestId).orElseThrow();
    }

    @Scheduled(
        fixedDelayString = "${app.sales.public-catalog.retention-delay-ms:86400000}",
        initialDelayString = "${app.sales.public-catalog.retention-initial-delay-ms:3600000}")
    public int purgeRetainedPersonalData() {
        return repository.purgeRetainedPersonalData();
    }

    private void validateSave(AdminContext access, SaveRequest request, boolean update) {
        var companyId = access.companyId();
        requireFuture(request.expiresAt());
        validateContactMethod(request.contactMethod());
        if (request.unitId() == null || request.businessId() == null) {
            throw new IllegalArgumentException("Business Unit and Business are required.");
        }
        access.requireIncludes(request.unitId(), request.businessId());
        repository.scope(companyId, request.unitId(), request.businessId())
            .orElseThrow(() -> new IllegalArgumentException(
                "Business does not belong to the selected Business Unit and company."));
        var products = distinct(request.productIds());
        if (!repository.productsBelongToCompany(companyId, products)) {
            throw new IllegalArgumentException("A selected product does not belong to this company.");
        }
        if (!repository.productsArePublishable(companyId, products)) {
            throw new IllegalArgumentException(
                "Every selected product must be active, public and have a valid server price and currency.");
        }
        if (update && request.version() == null) {
            throw new IllegalArgumentException("version is required when editing a catalog.");
        }
    }

    private SalesPublicCatalogRepository.CatalogRecord require(long companyId, long catalogId) {
        return repository.find(companyId, catalogId)
            .orElseThrow(() -> new NoSuchElementException("Public catalog not found."));
    }

    private SalesPublicCatalogRepository.CatalogRecord require(AdminContext access, long catalogId) {
        var catalog = require(access.companyId(), catalogId);
        access.requireIncludes(catalog.unitId(), catalog.businessId());
        return catalog;
    }

    private SalesPublicCatalogRepository.CatalogRecord requirePublic(long catalogId) {
        var catalog = repository.findById(catalogId)
            .orElseThrow(() -> new NoSuchElementException("Public catalog not found."));
        if (!"ACTIVE".equals(catalog.status())
                || catalog.unitId() == null || catalog.businessId() == null
                || catalog.expiresAt() != null && !catalog.expiresAt().isAfter(clock.instant())) {
            throw new NoSuchElementException("Public catalog not found.");
        }
        return catalog;
    }

    private SalesPublicCatalogRepository.CatalogRecord requirePublic(KioskResolvedDefinition definition) {
        if (definition == null || definition.legacyReferenceId() == null
                || !OWNER_MODULE.equals(definition.ownerModule())
                || !KIOSK_TYPE.equals(definition.kioskType())) {
            throw new NoSuchElementException("Public catalog not found.");
        }
        var catalog = requirePublic(definition.legacyReferenceId());
        if (catalog.companyId() != definition.companyId()
                || !java.util.Objects.equals(catalog.unitId(), definition.unitId())
                || !java.util.Objects.equals(catalog.businessId(), definition.businessId())) {
            throw new NoSuchElementException("Public catalog not found.");
        }
        return catalog;
    }

    private AdminResponse admin(SalesPublicCatalogRepository.CatalogRecord row, String token) {
        return new AdminResponse(
            row.id(), row.companyId(), row.companyName(), row.companyLogoUrl(),
            row.unitId(), row.unitName(),
            row.businessId(), row.businessName(),
            row.code(), row.name(), row.title(), row.description(),
            row.coverImageUrl(), row.contactCtaLabel(), row.contactMethod(), row.contactValue(),
            effectiveStatus(row), row.expiresAt(), row.tokenHint(), token,
            token == null ? null : "/public-catalog/" + token,
            row.showPrices(), row.showWholesalePrices(), row.showStockStatus(),
            row.showItemTypeBadges(), row.showCategories(), row.allowCart(),
            row.allowPurchaseRequest(), row.allowImageDownloads(),
            repository.productIds(row.companyId(), row.id()),
            row.version(), row.createdAt(), row.updatedAt());
    }

    private PublicItem publicView(
            SalesPublicCatalogRepository.CatalogRecord catalog,
            PublicItem item,
            List<SalesPublicCatalogRepository.PublicImageSource> imageSources) {
        var wholesaleVisible = catalog.showPrices() && catalog.showWholesalePrices()
            && validWholesale(item);
        var stockVisible = catalog.showStockStatus();
        var images = publicImages(catalog.companyId(), item, imageSources);
        var primaryImage = images.isEmpty() ? null : images.get(0);
        return new PublicItem(
            item.id(), item.name(), item.sku(),
            catalog.showItemTypeBadges() ? item.type() : null,
            catalog.showCategories() ? item.category() : null,
            item.description(),
            primaryImage == null ? item.thumbnailUrl() : primaryImage.url(),
            primaryImage == null ? item.thumbnailAlt() : primaryImage.alt(), images,
            catalog.showPrices() ? item.publicPrice() : null,
            wholesaleVisible ? item.wholesalePrice() : null,
            wholesaleVisible ? item.wholesaleMinQuantity() : null,
            item.currency(), stockVisible && item.usesInventory(),
            stockVisible ? item.publicInventoryStatus() : null, item.readyForSales(), item.reservable());
    }

    private List<PublicImage> publicImages(
            long companyId,
            PublicItem item,
            List<SalesPublicCatalogRepository.PublicImageSource> imageSources) {
        var images = new ArrayList<PublicImage>();
        var seen = new java.util.LinkedHashSet<String>();
        if (imageSources != null) {
            for (var source : imageSources) {
                var url = publicImageUrl(companyId, source);
                if (url == null || !seen.add(url)) continue;
                images.add(new PublicImage(url,
                    firstNonBlank(source.alt(), item.thumbnailAlt(), item.name())));
            }
        }
        var fallback = safePublicUrl(item.thumbnailUrl());
        if (fallback != null && seen.add(fallback)) {
            images.add(new PublicImage(fallback,
                firstNonBlank(item.thumbnailAlt(), item.name())));
        }
        return List.copyOf(images);
    }

    private String publicImageUrl(long companyId, SalesPublicCatalogRepository.PublicImageSource source) {
        if (source == null) return null;
        if (source.objectKey() != null && objectStorageService != null && storageProperties != null
                && objectStorageService.isEnabled()) {
            if (!source.objectKey().startsWith("sales/products/" + companyId + "/images/")) {
                return null;
            }
            try {
                return safePublicUrl(objectStorageService.presignDownload(
                    storageProperties.getMinio().getBucketSalesDocuments(),
                    source.objectKey(), storageProperties.getMinio().getPresignExpirySeconds()));
            } catch (RuntimeException ignored) {
                // A stale file must not hide other valid product images.
            }
        }
        return safePublicUrl(source.url());
    }

    private String safePublicUrl(String value) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        var lower = normalized.toLowerCase(Locale.ROOT);
        return lower.startsWith("data:") || lower.startsWith("blob:") ? null : normalized;
    }

    private String firstNonBlank(String... values) {
        for (var value : values) {
            if (value != null && !value.isBlank()) return value.trim();
        }
        return null;
    }

    private BigDecimal price(
            SalesPublicCatalogRepository.CatalogRecord catalog,
            PublicItem item,
            BigDecimal quantity) {
        if (catalog.showWholesalePrices() && validWholesale(item)
                && quantity.compareTo(item.wholesaleMinQuantity()) >= 0) {
            return item.wholesalePrice();
        }
        return item.publicPrice();
    }

    private boolean validWholesale(PublicItem item) {
        return item.wholesalePrice() != null && item.wholesalePrice().signum() >= 0
            && item.wholesaleMinQuantity() != null && item.wholesaleMinQuantity().signum() > 0;
    }

    private void requireMutable(SalesPublicCatalogRepository.CatalogRecord catalog) {
        if ("REVOKED".equals(catalog.status())) {
            throw new IllegalStateException("A revoked catalog is immutable.");
        }
        if ("EXPIRED".equals(effectiveStatus(catalog))) {
            throw new IllegalStateException("An expired catalog is immutable.");
        }
    }

    private String normalizeLifecycle(String value) {
        var status = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACTIVE", "DISABLED", "REVOKED").contains(status)) {
            throw new IllegalArgumentException("Unsupported catalog status.");
        }
        return status;
    }

    private void validateContactMethod(String value) {
        var method = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!List.of("whatsapp", "email", "phone", "website").contains(method)) {
            throw new IllegalArgumentException("Unsupported contact method.");
        }
    }

    private void requireFuture(Instant value) {
        if (value != null && !value.isAfter(clock.instant())) {
            throw new IllegalArgumentException("expiresAt must be in the future.");
        }
    }

    private String uniqueCode(long companyId, String name) {
        var base = slug(name);
        if (base.isBlank()) base = "PUBLIC-CATALOG";
        base = base.substring(0, Math.min(base.length(), 70));
        var candidate = base;
        for (int attempt = 2; repository.codeExists(companyId, candidate); attempt++) {
            var suffix = "-" + attempt;
            candidate = base.substring(0, Math.min(base.length(), 80 - suffix.length())) + suffix;
        }
        return candidate;
    }

    private String slug(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private List<Long> distinct(List<Long> values) {
        return values.stream().distinct().toList();
    }

    private String token() {
        return "spc_" + UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
    }

    private String tokenHint(String value) {
        return value.substring(Math.max(0, value.length() - 8));
    }

    private String fragment(int length) {
        return UUID.randomUUID().toString().replace("-", "")
            .substring(0, length).toUpperCase(Locale.ROOT);
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(4, RoundingMode.HALF_UP);
    }

    private void requireStoredAmount(BigDecimal value) {
        if (value.abs().compareTo(MAX_STORED_AMOUNT) > 0) {
            throw new IllegalArgumentException("The estimated amount exceeds the supported maximum.");
        }
    }

    private String effectiveStatus(SalesPublicCatalogRepository.CatalogRecord catalog) {
        if ("ACTIVE".equals(catalog.status()) && catalog.expiresAt() != null
                && !catalog.expiresAt().isAfter(clock.instant())) {
            return "EXPIRED";
        }
        return catalog.status();
    }

    private void audit(
            long companyId,
            long catalogId,
            Long requestId,
            String eventType,
            Long actorId,
            Map<String, ?> snapshot) {
        repository.audit(companyId, catalogId, requestId, eventType, actorId,
            MDC.get("requestId"), MDC.get("actionId"), json(snapshot));
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Catalog audit snapshot is not serializable.", failure);
        }
    }
}
