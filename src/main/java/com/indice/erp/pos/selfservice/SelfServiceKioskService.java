package com.indice.erp.pos.selfservice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationRequest;
import com.indice.erp.pos.discount.DiscountRuleService;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.cashregister.CashRegisterRepository;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.CashRegisterStatus;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.AdminResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.BootstrapResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CatalogItem;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.CreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.SelfCheckoutCreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketCreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketItemResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketListResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketReceiptResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.StatusRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.UpdateRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SelfServiceKioskService {

    public static final String OWNER_MODULE = "POINT_OF_SALE";
    public static final String KIOSK_TYPE = "self_service";

    public static boolean supportsPublicType(String kioskType) {
        return PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(kioskType)
            || PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(kioskType);
    }

    private static final int DEFAULT_MAX_ITEMS = 30;
    private static final int DEFAULT_TTL_MINUTES = 120;
    private static final BigDecimal MAX_AGGREGATED_QUANTITY = new BigDecimal("9999.0000");
    private static final BigDecimal MAX_STORED_AMOUNT = new BigDecimal("99999999999.9999");
    private static final int CLAIM_CODE_SPACE = 1_000;
    private static final Pattern ISO_CURRENCY = Pattern.compile("[A-Z]{3}");
    private static final String HUMAN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SelfServiceKioskRepository repository;
    private final CashRegisterRepository cashRegisters;
    private final ShiftRepository shifts;
    private final KioskRegistryService registry;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    @Autowired
    private DiscountRuleService discountRules;

    @Autowired
    public SelfServiceKioskService(
            SelfServiceKioskRepository repository,
            CashRegisterRepository cashRegisters,
            ShiftRepository shifts,
            KioskRegistryService registry,
            ObjectMapper objectMapper) {
        this(repository, cashRegisters, shifts, registry, objectMapper, Clock.systemUTC());
    }

    SelfServiceKioskService(
            SelfServiceKioskRepository repository,
            CashRegisterRepository cashRegisters,
            ShiftRepository shifts,
            KioskRegistryService registry,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.cashRegisters = cashRegisters;
        this.shifts = shifts;
        this.registry = registry;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<AdminResponse> list(PosContext context) {
        return repository.list(context).stream().map(record -> admin(record, null)).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> publicAccess(PosContext context, long kioskId) {
        var current = require(context, kioskId);
        var definition = definition(context.companyId(), kioskId);
        var effectiveStatus = definition.effectiveStatus(clock.instant());
        if (effectiveStatus.terminal() || effectiveStatus == KioskDefinitionStatus.EXPIRED) {
            throw PosApiException.conflict("Self-service kiosk access is no longer available.");
        }
        final String token;
        try {
            token = registry.recoverPublicToken(
                context.companyId(), OWNER_MODULE, definition.kioskType(), kioskId);
        } catch (IllegalStateException unavailable) {
            throw PosApiException.conflict(unavailable.getMessage());
        }
        return Map.of(
            "kioskId", definition.id(),
            "name", current.name(),
            "displayUrl", publicDisplayUrl(definition.kioskType(), token),
            "publicTokenHint", definition.publicTokenHint()
        );
    }

    @Transactional
    public AdminResponse create(PosContext context, CreateRequest request) {
        return create(context, request, KIOSK_TYPE, "pos-self-service");
    }

    @Transactional
    public AdminResponse createSelfCheckout(
            PosContext context,
            SelfCheckoutCreateRequest request) {
        var warehouse = cashRegisters.findWarehouse(context, request.warehouseId())
            .orElseThrow(() -> PosApiException.notFound("Warehouse not found."));
        if (warehouse.unitId() == null || warehouse.businessId() == null) {
            throw PosApiException.badRequest(
                "El almacén debe tener unidad de negocio y negocio antes de crear el autocobro.");
        }
        var register = cashRegisters.findFirstActiveByWarehouse(context, request.warehouseId())
            .orElseThrow(() -> PosApiException.conflict(
                "El almacén seleccionado necesita una caja POS activa antes de crear el autocobro."));
        if (!Objects.equals(register.unitId(), warehouse.unitId())
                || !Objects.equals(register.businessId(), warehouse.businessId())) {
            if (!cashRegisters.synchronizeScopeFromWarehouse(context, register.id(), warehouse)) {
                throw PosApiException.conflict(
                    "No fue posible sincronizar la caja POS con el alcance del almacén.");
            }
            register = cashRegisters.findFirstActiveByWarehouse(context, request.warehouseId())
                .orElseThrow(() -> PosApiException.conflict(
                    "No fue posible recuperar la caja POS después de sincronizarla."));
        }
        var createRequest = new CreateRequest(
            register.id(), request.name(), null, request.expiresAt(), true, false, 100, 120);
        return create(
            context,
            createRequest,
            PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE,
            "pos-self-checkout");
    }

    private AdminResponse create(
            PosContext context,
            CreateRequest request,
            String kioskType,
            String themeKey) {
        var register = cashRegisters.findById(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.notFound("Cash register not found."));
        if (!register.active()) {
            throw PosApiException.conflict("Self-service requires an active cash register.");
        }
        if (register.unitId() == null || register.businessId() == null) {
            throw PosApiException.badRequest(
                "Assign a business unit and business to the cash register before creating a kiosk.");
        }
        requireOperationalRegister(context.companyId(), register);
        requireFuture(request.expiresAt());
        var code = uniqueCode(context.companyId(), request.code(), request.name());
        var token = generateToken();
        var id = repository.insert(
            context, register.warehouseId(), register.id(), register.unitId(), register.businessId(),
            code, request.name().trim(), request.expiresAt(), tokenHint(token),
            request.showStock() == null || request.showStock(),
            Boolean.TRUE.equals(request.customerNameRequired()),
            defaulted(request.maxItemsPerTicket(), DEFAULT_MAX_ITEMS),
            defaulted(request.preticketTtlMinutes(), DEFAULT_TTL_MINUTES));
        var definition = registry.registerLegacyDefinitionWithLocation(
            context.companyId(), OWNER_MODULE, kioskType, id, code, request.name().trim(),
            "active", register.unitId(), register.businessId(), register.warehouseId(),
            request.expiresAt(), token, false, KioskAccessLevel.PUBLIC,
            themeKey, "es-MX", context.userId());
        if (definition.legacyReferenceId() == null || definition.legacyReferenceId() != id) {
            throw new IllegalStateException("Self-service kiosk registry binding failed.");
        }
        registry.synchronizeCapabilities(
            definition, PointOfSaleKioskCapabilities.selfServiceDescriptors());
        audit(context.companyId(), id, null, "SELF_SERVICE_KIOSK_CREATED", context.userId(),
            Map.of("code", code, "cash_register_id", register.id()));
        return admin(require(context, id), token);
    }

    @Transactional
    public AdminResponse update(PosContext context, long kioskId, UpdateRequest request) {
        var current = require(context, kioskId);
        requireMutable(current);
        requireFuture(request.expiresAt());
        var showStock = request.showStock() == null ? current.showStock() : request.showStock();
        var nameRequired = request.customerNameRequired() == null
            ? current.customerNameRequired() : request.customerNameRequired();
        var maxItems = defaulted(request.maxItemsPerTicket(), current.maxItems());
        var ttl = defaulted(request.preticketTtlMinutes(), current.ttlMinutes());
        if (!repository.update(context, kioskId, request.name().trim(), request.expiresAt(),
                showStock, nameRequired, maxItems, ttl, request.version())) {
            throw PosApiException.conflict("Self-service kiosk changed; reload before saving again.");
        }
        var definition = definition(context.companyId(), kioskId);
        var selfCheckout = PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(
            definition.kioskType());
        registry.registerLegacyDefinitionWithLocation(
            context.companyId(), OWNER_MODULE, definition.kioskType(), kioskId,
            current.code(), request.name().trim(),
            current.status(), current.unitId(), current.businessId(), current.warehouseId(),
            request.expiresAt(), "registry-managed", false, KioskAccessLevel.PUBLIC,
            selfCheckout ? "pos-self-checkout" : "pos-self-service", "es-MX", context.userId());
        audit(context.companyId(), kioskId, null, "SELF_SERVICE_KIOSK_UPDATED", context.userId(),
            Map.of("configuration_version", request.version() + 1));
        return admin(require(context, kioskId), null);
    }

    @Transactional
    public AdminResponse transition(PosContext context, long kioskId, StatusRequest request) {
        var current = require(context, kioskId);
        requireMutable(current);
        var target = normalizeStatus(request.status());
        var engineTarget = KioskDefinitionStatus.valueOf(target);
        if (target.equals(current.status())) {
            return admin(current, null);
        }
        if (engineTarget == KioskDefinitionStatus.ACTIVE) {
            requireOperationalAssignment(current.companyId(), current.cashRegisterId(),
                current.unitId(), current.businessId(), current.warehouseId());
        }
        registry.transition(
            context.companyId(), OWNER_MODULE, definition(
                context.companyId(), kioskId).kioskType(), kioskId,
            engineTarget, context.userId(), request.reason());
        if (!repository.updateStatus(context, kioskId, target)) {
            throw PosApiException.notFound("Self-service kiosk not found.");
        }
        audit(context.companyId(), kioskId, null, "SELF_SERVICE_KIOSK_" + target,
            context.userId(), Map.of("reason", request.reason() == null ? "" : request.reason()));
        return admin(require(context, kioskId), null);
    }

    @Transactional
    public AdminResponse rotateLink(PosContext context, long kioskId) {
        var current = require(context, kioskId);
        requireMutable(current);
        var token = generateToken();
        var definition = definition(context.companyId(), kioskId);
        registry.replacePublicToken(
            context.companyId(), OWNER_MODULE, definition.kioskType(), kioskId,
            token, context.userId());
        if (!repository.updateTokenHint(context, kioskId, tokenHint(token))) {
            throw PosApiException.notFound("Self-service kiosk not found.");
        }
        audit(context.companyId(), kioskId, null, "SELF_SERVICE_KIOSK_TOKEN_ROTATED",
            context.userId(), Map.of("token_hint", tokenHint(token)));
        return admin(require(context, kioskId), token);
    }

    @Transactional
    public void delete(PosContext context, long kioskId, String reason) {
        var current = require(context, kioskId);
        var definition = definition(context.companyId(), kioskId);
        var effective = definition.effectiveStatus(clock.instant());
        audit(context.companyId(), kioskId, null, "SELF_SERVICE_KIOSK_DELETED",
            context.userId(), Map.of(
                "code", current.code(),
                "name", current.name(),
                "status", effective.name(),
                "reason", reason == null ? "" : reason.trim()));
        registry.deleteDefinition(
            context.companyId(), OWNER_MODULE, definition.kioskType(), kioskId,
            context.userId(), reason);
        if (!repository.delete(context, kioskId)) {
            throw PosApiException.notFound("Self-service kiosk not found.");
        }
    }

    @Transactional(readOnly = true)
    public BootstrapResponse bootstrap(KioskResolvedDefinition definition) {
        var kiosk = requirePublic(definition);
        var sourceRegisterOpen = shifts.hasOpenShift(kiosk.companyId(), kiosk.cashRegisterId());
        var moduleItems = sourceRegisterOpen ? repository.catalog(kiosk) : List.<CatalogItem>of();
        var items = moduleItems.stream()
            .map(item -> kiosk.showStock() ? item : new CatalogItem(
                item.productId(), item.sku(), item.name(), item.description(), item.category(),
                item.unitPrice(), item.currencyCode(), null, item.stockTracked(), item.available()))
            .toList();
        var currency = moduleItems.stream().map(CatalogItem::currencyCode)
            .filter(value -> value != null && !value.isBlank()).findFirst().orElse("MXN");
        return new BootstrapResponse(
            kiosk.code(), kiosk.name(), kiosk.companyName(), kiosk.unitName(),
            kiosk.businessName(), kiosk.warehouseName(), kiosk.cashRegisterName(), currency,
            kiosk.showStock(), kiosk.customerNameRequired(), kiosk.maxItems(), kiosk.ttlMinutes(),
            PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(definition.kioskType())
                ? "SELF_CHECKOUT_PAYMENT_REQUIRED"
                : "PRETICKET_REQUIRES_CASHIER_CONFIRMATION",
            items, definition.kioskType(),
            sourceRegisterOpen ? "READY" : "SOURCE_REGISTER_CLOSED",
            sourceRegisterOpen,
            discountRules == null ? List.of() : discountRules.publishedRules(
                kiosk.companyId(), kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId(), "KIOSK", currency));
    }

    @Transactional
    public PreticketReceiptResponse createPreticket(
            KioskResolvedDefinition definition,
            PreticketCreateRequest request) {
        var kiosk = requirePublic(definition);
        requireOpenSourceRegister(kiosk);
        if (kiosk.customerNameRequired() && blank(request.customerName())) {
            throw PosApiException.badRequest("Customer name is required.");
        }
        var quantities = new LinkedHashMap<Long, BigDecimal>();
        request.items().forEach(item -> quantities.merge(
            item.productId(), item.quantity(), BigDecimal::add));
        if (quantities.isEmpty() || quantities.size() > kiosk.maxItems()) {
            throw PosApiException.badRequest("Preticket item limit exceeded.");
        }
        var catalog = repository.catalog(kiosk).stream()
            .collect(java.util.stream.Collectors.toMap(CatalogItem::productId, item -> item));
        var lines = new ArrayList<PreticketItemResponse>();
        String currency = null;
        for (var entry : quantities.entrySet()) {
            var product = catalog.get(entry.getKey());
            if (product == null) {
                throw PosApiException.badRequest("A selected product is not available in this kiosk.");
            }
            var quantity = entry.getValue().setScale(4, RoundingMode.HALF_UP);
            if (quantity.compareTo(BigDecimal.ZERO) <= 0
                    || quantity.compareTo(MAX_AGGREGATED_QUANTITY) > 0) {
                throw PosApiException.badRequest("Aggregated product quantity is outside the supported range.");
            }
            var available = product.availableQuantity() == null
                ? BigDecimal.ZERO : product.availableQuantity();
            if (product.stockTracked() && quantity.compareTo(available) > 0) {
                throw PosApiException.conflict("Requested quantity is not currently available.");
            }
            var productCurrency = currency(product.currencyCode());
            if (currency == null) {
                currency = productCurrency;
            } else if (!currency.equals(productCurrency)) {
                throw PosApiException.badRequest("A preticket cannot mix currencies.");
            }
            if (product.unitPrice() == null) {
                throw PosApiException.badRequest("Product price is invalid.");
            }
            var unitPrice = money(product.unitPrice());
            requireStoredAmount(unitPrice, "Product price");
            var lineSubtotal = money(unitPrice.multiply(quantity));
            var automatic = discountRules == null ? null : discountRules.bestAutomaticRule(
                kiosk.companyId(), kiosk.unitId(), kiosk.businessId(),
                new EvaluationRequest("KIOSK", lineSubtotal, product.productId(), product.category(),
                    null, "PRODUCT", productCurrency, kiosk.warehouseId(), kiosk.unitId(), kiosk.businessId()));
            var lineDiscount = automatic == null ? BigDecimal.ZERO.setScale(4) : money(automatic.discountAmount());
            var lineTotal = money(lineSubtotal.subtract(lineDiscount));
            requireStoredAmount(lineTotal, "Preticket line total");
            lines.add(new PreticketItemResponse(
                product.productId(), product.sku(), product.name(), quantity, unitPrice,
                lineDiscount, automatic == null ? null : automatic.rule().id(), lineTotal));
        }
        var subtotal = lines.stream().map(line -> money(line.unitPrice().multiply(line.quantity())))
            .reduce(BigDecimal.ZERO.setScale(4), BigDecimal::add);
        var lineDiscountTotal = lines.stream().map(PreticketItemResponse::discountAmount)
            .reduce(BigDecimal.ZERO.setScale(4), BigDecimal::add);
        var orderRule = discountRules == null ? null : discountRules.bestAutomaticRule(
            kiosk.companyId(), kiosk.unitId(), kiosk.businessId(),
            new EvaluationRequest("KIOSK", subtotal, null, null, null, "ORDER",
                currency == null ? "MXN" : currency, kiosk.warehouseId(), kiosk.unitId(), kiosk.businessId()));
        var orderDiscount = orderRule == null ? BigDecimal.ZERO.setScale(4) : money(orderRule.discountAmount());
        if (orderDiscount.signum() > 0 && lineDiscountTotal.signum() > 0) {
            if (orderDiscount.compareTo(lineDiscountTotal) >= 0) {
                lines.replaceAll(line -> new PreticketItemResponse(
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
        requireStoredAmount(total, "Preticket total");
        var now = clock.instant();
        var number = "SS-" + LocalDate.ofInstant(now, ZoneOffset.UTC).toString().replace("-", "")
            + "-" + randomFragment(10);
        var claimCode = generateClaimCode(kiosk);
        var expiresAt = now.plus(kiosk.ttlMinutes(), ChronoUnit.MINUTES);
        var preticketId = discountRules == null
            ? repository.insertPreticket(
                kiosk, number, claimCode, currency == null ? "MXN" : currency.toUpperCase(Locale.ROOT),
                trim(request.customerName()), trim(request.customerEmail()), trim(request.customerPhone()),
                lines.size(), total, expiresAt)
            : repository.insertPreticket(
                kiosk, number, claimCode, currency == null ? "MXN" : currency.toUpperCase(Locale.ROOT),
                trim(request.customerName()), trim(request.customerEmail()), trim(request.customerPhone()),
                lines.size(), subtotal, discountTotal, orderRule == null ? null : orderRule.rule().id(), total, expiresAt);
        for (int index = 0; index < lines.size(); index++) {
            repository.insertPreticketItem(kiosk.companyId(), preticketId, lines.get(index), index);
        }
        audit(kiosk.companyId(), kiosk.id(), preticketId, "SELF_SERVICE_PRETICKET_CREATED", null,
            Map.of("preticket_number", number, "item_count", lines.size(),
                "total_amount", total, "discount_amount", discountTotal, "policy", "DIRECT_PRETICKET_ONLY"));
        return receipt(repository.findPreticket(kiosk.companyId(), preticketId).orElseThrow());
    }

    private void requireOpenSourceRegister(SelfServiceKioskRepository.KioskRecord kiosk) {
        if (!shifts.hasOpenShift(kiosk.companyId(), kiosk.cashRegisterId())) {
            throw PosApiException.conflict("The source cash register is closed.");
        }
    }

    @Transactional(readOnly = true)
    public PreticketListResponse pending(PosContext context, long cashRegisterId) {
        var register = requireVisibleRegister(context, cashRegisterId);
        var items = repository.listPending(context, register);
        return new PreticketListResponse(items, items.size());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> audit(PosContext context, long kioskId) {
        require(context, kioskId);
        return repository.listAudit(context.companyId(), kioskId);
    }

    @Transactional
    public PreticketResponse claim(PosContext context, long preticketId, long cashRegisterId) {
        var register = requireVisibleRegister(context, cashRegisterId);
        if (!repository.claim(context, preticketId, register)) {
            throw PosApiException.conflict("Preticket is unavailable, expired, or already claimed.");
        }
        var response = repository.findPreticket(context.companyId(), preticketId)
            .orElseThrow(() -> PosApiException.notFound("Preticket not found."));
        audit(context.companyId(), response.kioskId(), preticketId, "SELF_SERVICE_PRETICKET_CLAIMED",
            context.userId(), Map.of("preticket_number", response.preticketNumber()));
        return response;
    }

    @Transactional
    public PreticketResponse releaseClaim(
            PosContext context,
            long preticketId,
            long cashRegisterId) {
        var register = requireVisibleRegister(context, cashRegisterId);
        if (!repository.releaseClaim(context, preticketId, register)) {
            throw PosApiException.conflict(
                "Preticket claim cannot be released by this user and cash register.");
        }
        var response = repository.findPreticket(context.companyId(), preticketId)
            .orElseThrow(() -> PosApiException.notFound("Preticket not found."));
        audit(context.companyId(), response.kioskId(), preticketId,
            "SELF_SERVICE_PRETICKET_CLAIM_RELEASED", context.userId(),
            Map.of("preticket_number", response.preticketNumber(),
                "cash_register_id", cashRegisterId));
        return response;
    }

    private CashRegisterRecord requireVisibleRegister(PosContext context, long cashRegisterId) {
        if (cashRegisterId <= 0) {
            throw PosApiException.notFound("Cash register not found.");
        }
        var register = cashRegisters.findById(context, cashRegisterId)
            .orElseThrow(() -> PosApiException.notFound("Cash register not found."));
        requireOperationalRegister(context.companyId(), register);
        return register;
    }

    @Scheduled(
        fixedDelayString = "${app.pos.self-service.expiration-delay-ms:300000}",
        initialDelayString = "${app.pos.self-service.expiration-initial-delay-ms:60000}")
    public int expirePending() {
        return repository.expirePending();
    }

    @Scheduled(
        fixedDelayString = "${app.pos.self-service.retention-delay-ms:86400000}",
        initialDelayString = "${app.pos.self-service.retention-initial-delay-ms:3600000}")
    public int purgeRetainedPersonalData() {
        return repository.purgeRetainedPersonalData();
    }

    private SelfServiceKioskRepository.KioskRecord require(PosContext context, long kioskId) {
        return repository.find(context, kioskId)
            .orElseThrow(() -> PosApiException.notFound("Self-service kiosk not found."));
    }

    private SelfServiceKioskRepository.KioskRecord requirePublic(
            KioskResolvedDefinition definition) {
        if (definition == null
                || definition.legacyReferenceId() == null
                || !OWNER_MODULE.equals(definition.ownerModule())
                || !supportsPublicType(definition.kioskType())
                || definition.effectiveStatus(clock.instant()) != KioskDefinitionStatus.ACTIVE) {
            throw PosApiException.notFound("Self-service kiosk not found.");
        }
        var kiosk = repository.findById(definition.legacyReferenceId())
            .orElseThrow(() -> PosApiException.notFound("Self-service kiosk not found."));
        if (definition.companyId() != kiosk.companyId()
                || !Objects.equals(definition.unitId(), kiosk.unitId())
                || !Objects.equals(definition.businessId(), kiosk.businessId())
                || !Objects.equals(definition.locationId(), kiosk.warehouseId())
                || !"ACTIVE".equals(kiosk.status())
                || kiosk.expiresAt() != null && !kiosk.expiresAt().isAfter(clock.instant())) {
            throw PosApiException.notFound("Self-service kiosk not found.");
        }
        requireOperationalAssignment(kiosk.companyId(), kiosk.cashRegisterId(),
            kiosk.unitId(), kiosk.businessId(), kiosk.warehouseId());
        return kiosk;
    }

    private void requireOperationalRegister(long companyId, CashRegisterRecord register) {
        if (register == null
                || !Objects.equals(companyId, register.companyId())
                || register.id() == null
                || register.warehouseId() == null
                || register.unitId() == null
                || register.businessId() == null
                || !register.active()
                || register.status() != CashRegisterStatus.ACTIVE) {
            throw PosApiException.conflict("Self-service requires an active cash register.");
        }
        requireOperationalAssignment(companyId, register.id(), register.unitId(),
            register.businessId(), register.warehouseId());
    }

    private void requireOperationalAssignment(
            long companyId,
            long cashRegisterId,
            Long unitId,
            Long businessId,
            long warehouseId) {
        if (!repository.hasOperationalRegisterAssignment(
                companyId, cashRegisterId, unitId, businessId, warehouseId)) {
            throw PosApiException.conflict(
                "Self-service cash register and warehouse assignment is not operational.");
        }
    }

    private AdminResponse admin(SelfServiceKioskRepository.KioskRecord row, String token) {
        var effectiveStatus = "ACTIVE".equals(row.status())
                && row.expiresAt() != null
                && !row.expiresAt().isAfter(clock.instant())
            ? "EXPIRED"
            : row.status();
        var publicUrl = token == null ? null : publicDisplayUrl(
            definition(row.companyId(), row.id()).kioskType(), token);
        return new AdminResponse(
            row.id(), row.companyId(), row.companyName(), row.unitId(), row.unitName(),
            row.businessId(), row.businessName(), row.warehouseId(), row.warehouseName(),
            row.cashRegisterId(), row.cashRegisterCode(), row.cashRegisterName(), row.code(),
            row.name(), effectiveStatus, row.expiresAt(), row.tokenHint(), token,
            publicUrl,
            row.showStock(), row.customerNameRequired(), row.maxItems(), row.ttlMinutes(),
            row.version(), row.createdAt(), row.updatedAt());
    }

    private String publicDisplayUrl(String kioskType, String token) {
        var route = PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(kioskType)
            ? "/pos-self-checkout/"
            : "/pos-self-service/";
        return route + token;
    }

    private KioskResolvedDefinition definition(long companyId, long kioskId) {
        for (var kioskType : List.of(
                PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE,
                PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE)) {
            try {
                return registry.requireByLegacyReference(
                    companyId, OWNER_MODULE, kioskType, kioskId);
            } catch (java.util.NoSuchElementException ignored) {
                // Both experiences share one legacy table; the registry owns the type.
            }
        }
        throw new java.util.NoSuchElementException("Self-service kiosk definition not found.");
    }

    private void requireMutable(SelfServiceKioskRepository.KioskRecord kiosk) {
        if ("REVOKED".equals(kiosk.status())) {
            throw PosApiException.conflict("A revoked self-service kiosk is immutable.");
        }
        if (kiosk.expiresAt() != null && !kiosk.expiresAt().isAfter(clock.instant())) {
            throw PosApiException.conflict("An expired self-service kiosk is immutable.");
        }
    }

    private void requireFuture(Instant expiresAt) {
        if (expiresAt != null && !expiresAt.isAfter(clock.instant())) {
            throw PosApiException.badRequest("expiresAt must be in the future.");
        }
    }

    private String normalizeStatus(String value) {
        var status = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACTIVE", "DISABLED", "REVOKED").contains(status)) {
            throw PosApiException.badRequest("Unsupported self-service kiosk status.");
        }
        return status;
    }

    private String uniqueCode(long companyId, String requested, String name) {
        var base = slug(blank(requested) ? name : requested);
        if (base.isBlank()) {
            base = "SELF-SERVICE";
        }
        var candidate = base;
        for (int attempt = 2; repository.codeExists(companyId, candidate); attempt++) {
            candidate = base.substring(0, Math.min(base.length(), 70)) + "-" + attempt;
        }
        return candidate;
    }

    private String slug(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private String generateToken() {
        return "pss_" + UUID.randomUUID().toString().replace("-", "")
            + UUID.randomUUID().toString().replace("-", "");
    }

    private String randomFragment(int length) {
        var value = new StringBuilder(length);
        for (var index = 0; index < length; index++) {
            value.append(HUMAN_CODE_ALPHABET.charAt(
                SECURE_RANDOM.nextInt(HUMAN_CODE_ALPHABET.length())));
        }
        return value.toString();
    }

    private String generateClaimCode(SelfServiceKioskRepository.KioskRecord kiosk) {
        repository.lockClaimCodeAllocation(kiosk.companyId(), kiosk.cashRegisterId());
        var start = SECURE_RANDOM.nextInt(CLAIM_CODE_SPACE);
        for (var offset = 0; offset < CLAIM_CODE_SPACE; offset++) {
            var candidate = String.format(Locale.ROOT, "%03d", (start + offset) % CLAIM_CODE_SPACE);
            if (!repository.activeClaimCodeExists(
                    kiosk.companyId(), kiosk.cashRegisterId(), candidate)) {
                return candidate;
            }
        }
        throw PosApiException.conflict("No short pre-ticket codes are currently available.");
    }

    private String tokenHint(String token) {
        return token.substring(Math.max(0, token.length() - 8));
    }

    private int defaulted(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(4, RoundingMode.HALF_UP);
    }

    private String currency(String value) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!ISO_CURRENCY.matcher(normalized).matches()) {
            throw PosApiException.badRequest("Product currency is invalid.");
        }
        return normalized;
    }

    private void requireStoredAmount(BigDecimal value, String field) {
        if (value == null || value.signum() < 0 || value.compareTo(MAX_STORED_AMOUNT) > 0) {
            throw PosApiException.badRequest(field + " exceeds the supported amount range.");
        }
    }

    private PreticketReceiptResponse receipt(PreticketResponse response) {
        return new PreticketReceiptResponse(
            response.preticketNumber(), response.claimCode(), response.status(),
            response.currencyCode(), response.itemCount(), response.discountAmount(), response.totalAmount(),
            response.expiresAt());
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private String trim(String value) {
        return blank(value) ? null : value.trim();
    }

    private void audit(
            long companyId,
            long kioskId,
            Long preticketId,
            String eventType,
            Long actorId,
            Map<String, ?> snapshot) {
        repository.audit(
            companyId, kioskId, preticketId, eventType, "SUCCEEDED",
            MDC.get("requestId"), MDC.get("actionId"), actorId, json(snapshot));
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Self-service audit snapshot is not serializable.", exception);
        }
    }
}
