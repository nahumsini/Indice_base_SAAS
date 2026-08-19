package com.indice.erp.pos.discount;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.discount.DiscountDtos.EvaluatedRuleResponse;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationRequest;
import com.indice.erp.pos.discount.DiscountDtos.EvaluationResponse;
import com.indice.erp.pos.discount.DiscountDtos.RuleListResponse;
import com.indice.erp.pos.discount.DiscountDtos.RuleRequest;
import com.indice.erp.pos.discount.DiscountDtos.RuleResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiscountRuleService {

    private static final Set<String> SCOPES = Set.of("PRODUCT", "CATEGORY", "CUSTOMER", "ORDER", "MANUAL");
    private static final Set<String> TYPES = Set.of("PERCENTAGE", "FIXED_AMOUNT");
    private static final Set<String> CHANNELS = Set.of("POS", "SALES", "KIOSK", "PUBLIC_CATALOG");
    private static final Set<String> STATUSES = Set.of("ACTIVE", "PAUSED", "ARCHIVED");

    private final DiscountRuleRepository repository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Autowired
    public DiscountRuleService(DiscountRuleRepository repository, ObjectMapper objectMapper) {
        this(repository, objectMapper, Clock.systemUTC());
    }

    DiscountRuleService(DiscountRuleRepository repository, ObjectMapper objectMapper, Clock clock) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public RuleListResponse list(PosContext context) {
        var items = repository.list(context).stream().map(this::response).toList();
        return new RuleListResponse(items, items.size());
    }

    @Transactional
    public RuleResponse create(PosContext context, RuleRequest request) {
        validate(context, request);
        var id = repository.insert(context, request);
        return response(require(context, id));
    }

    @Transactional
    public RuleResponse update(PosContext context, long ruleId, RuleRequest request) {
        validate(context, request);
        var current = require(context, ruleId);
        var version = request.version() == null ? current.version() : request.version();
        if (!repository.update(context, ruleId, request, version)) {
            throw PosApiException.conflict("The discount rule changed. Reload it before saving again.");
        }
        return response(require(context, ruleId));
    }

    @Transactional
    public RuleResponse transition(PosContext context, long ruleId, DiscountDtos.StatusRequest request) {
        var current = require(context, ruleId);
        var status = normalized(request.status());
        if (!STATUSES.contains(status)) throw PosApiException.badRequest("Invalid discount rule status.");
        var version = request.version() == null ? current.version() : request.version();
        if (!repository.updateStatus(context, ruleId, status, version)) {
            throw PosApiException.conflict("The discount rule changed. Reload it before trying again.");
        }
        return response(require(context, ruleId));
    }

    public EvaluationResponse evaluate(PosContext context, EvaluationRequest request) {
        var channel = normalized(request.channel());
        if (!CHANNELS.contains(channel)) throw PosApiException.badRequest("Invalid discount channel.");
        var currency = normalized(request.currencyCode());
        var now = clock.instant();
        var items = repository.list(context).stream()
            .filter(rule -> eligible(rule, request, channel, currency, now))
            .map(rule -> new EvaluatedRuleResponse(
                response(rule), calculate(rule, request.amount()), rule.requiresAuthorization(),
                !rule.requiresAuthorization() || context.canManageOtherUsers()))
            .sorted(Comparator.comparing((EvaluatedRuleResponse item) -> item.rule().priority()).reversed())
            .toList();
        return new EvaluationResponse(items, items.size());
    }

    public List<RuleResponse> publishedRules(
            long companyId,
            Long unitId,
            Long businessId,
            Long warehouseId,
            String channel,
            String currencyCode) {
        var context = publicContext(companyId, unitId, businessId);
        var normalizedChannel = normalized(channel);
        var normalizedCurrency = normalized(currencyCode);
        var now = clock.instant();
        return repository.list(context).stream()
            .filter(rule -> "ACTIVE".equals(rule.status()) && !now.isBefore(rule.startsAt()) && !now.isAfter(rule.endsAt()))
            .filter(rule -> channels(rule).contains(normalizedChannel))
            .filter(rule -> !rule.requiresAuthorization() && !"MANUAL".equals(rule.scope()))
            .filter(rule -> !"FIXED_AMOUNT".equals(rule.discountType()) || rule.currencyCode().equals(normalizedCurrency))
            .filter(rule -> rule.warehouseId() == null || rule.warehouseId().equals(warehouseId))
            .filter(rule -> rule.unitId() == null || rule.unitId().equals(unitId))
            .filter(rule -> rule.businessId() == null || rule.businessId().equals(businessId))
            .map(this::response)
            .toList();
    }

    public EvaluatedRuleResponse bestAutomaticRule(
            long companyId,
            Long unitId,
            Long businessId,
            EvaluationRequest request) {
        return evaluate(publicContext(companyId, unitId, businessId), request).items().stream()
            .filter(item -> !item.authorizationRequired() && !"manual".equals(item.rule().scope()))
            .max(Comparator.comparing(EvaluatedRuleResponse::discountAmount)
                .thenComparing(item -> item.rule().priority()))
            .orElse(null);
    }

    public RuleResponse requireApplicable(
            PosContext context,
            long ruleId,
            EvaluationRequest request,
            BigDecimal submittedDiscountAmount,
            BigDecimal orderAmount) {
        var rule = require(context, ruleId);
        var now = clock.instant();
        var effectiveRequest = "ORDER".equals(rule.scope())
            ? new EvaluationRequest(request.channel(), orderAmount, request.productId(), request.category(),
                request.customerType(), "ORDER", request.currencyCode(), request.warehouseId(),
                request.unitId(), request.businessId())
            : request;
        if (!eligible(rule, effectiveRequest, normalized(effectiveRequest.channel()), normalized(effectiveRequest.currencyCode()), now)) {
            throw PosApiException.badRequest("The selected discount rule is not applicable to this sale.");
        }
        if (rule.requiresAuthorization() && !context.canManageOtherUsers()) {
            throw PosApiException.forbidden("This discount requires an administrator or supervisor authorization.");
        }
        var maximum = calculate(rule, effectiveRequest.amount());
        if (submittedDiscountAmount.setScale(2, RoundingMode.HALF_UP)
                .compareTo(maximum.setScale(2, RoundingMode.HALF_UP)) > 0) {
            throw PosApiException.badRequest("The submitted discount exceeds the selected rule.");
        }
        return response(rule);
    }

    public void recordApplication(
            PosContext context,
            RuleResponse rule,
            long ticketId,
            Long ticketItemId,
            BigDecimal amount) {
        repository.insertApplication(context, rule.id(), ticketId, ticketItemId, amount,
            rule.requiresAuthorization() ? context.userId() : null, rule);
    }

    private boolean eligible(
            DiscountRuleRecord rule,
            EvaluationRequest request,
            String channel,
            String currency,
            Instant now) {
        if (!"ACTIVE".equals(rule.status()) || now.isBefore(rule.startsAt()) || now.isAfter(rule.endsAt())) return false;
        if (!channels(rule).contains(channel)) return false;
        if (rule.minimumAmount() != null && request.amount().compareTo(rule.minimumAmount()) < 0) return false;
        if ("FIXED_AMOUNT".equals(rule.discountType()) && !rule.currencyCode().equals(currency)) return false;
        if (rule.warehouseId() != null && !rule.warehouseId().equals(request.warehouseId())) return false;
        if (rule.unitId() != null && !rule.unitId().equals(request.unitId())) return false;
        if (rule.businessId() != null && !rule.businessId().equals(request.businessId())) return false;

        return switch (rule.scope()) {
            case "PRODUCT" -> rule.productId() != null && rule.productId().equals(request.productId());
            case "CATEGORY" -> same(rule.category(), request.category());
            case "CUSTOMER" -> same(rule.customerType(), request.customerType());
            case "ORDER" -> "ORDER".equals(normalized(request.scope()));
            case "MANUAL" -> true;
            default -> false;
        };
    }

    private BigDecimal calculate(DiscountRuleRecord rule, BigDecimal amount) {
        var calculated = "PERCENTAGE".equals(rule.discountType())
            ? amount.multiply(rule.value()).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
            : rule.value().min(amount);
        return rule.maximumDiscountAmount() == null ? calculated : calculated.min(rule.maximumDiscountAmount());
    }

    private void validate(PosContext context, RuleRequest request) {
        var scope = normalized(request.scope());
        var type = normalized(request.discountType());
        if (!SCOPES.contains(scope)) throw PosApiException.badRequest("Invalid discount scope.");
        if (!TYPES.contains(type)) throw PosApiException.badRequest("Invalid discount type.");
        if (request.endsAt().isBefore(request.startsAt())) throw PosApiException.badRequest("The end date must follow the start date.");
        if ("PERCENTAGE".equals(type) && request.value().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw PosApiException.badRequest("Percentage discounts cannot exceed 100%.");
        }
        var channels = request.enabledChannels().stream().map(this::normalized).collect(java.util.stream.Collectors.toSet());
        if (channels.isEmpty() || !CHANNELS.containsAll(channels)) throw PosApiException.badRequest("Invalid discount channels.");
        if ("PRODUCT".equals(scope) && (request.productId() == null || !repository.productExists(context, request.productId()))) {
            throw PosApiException.badRequest("Select a product that belongs to this company.");
        }
        if ("CATEGORY".equals(scope) && blank(request.category())) throw PosApiException.badRequest("Select a category.");
        if ("CUSTOMER".equals(scope) && blank(request.customerType())) throw PosApiException.badRequest("Select a customer type.");
        validateOrganizationalScope(context, request);
    }

    private void validateOrganizationalScope(PosContext context, RuleRequest request) {
        switch (context.scope().type()) {
            case CORPORATE_OFFICE -> { }
            case UNIT_HEADQUARTERS -> {
                if (request.unitId() != null && !request.unitId().equals(context.scope().unitId())) {
                    throw PosApiException.forbidden("The discount rule is outside your unit.");
                }
            }
            case BUSINESS_OFFICE -> {
                if (request.businessId() != null && !request.businessId().equals(context.scope().businessId())) {
                    throw PosApiException.forbidden("The discount rule is outside your business.");
                }
                if (request.unitId() != null && !request.unitId().equals(context.scope().unitId())) {
                    throw PosApiException.forbidden("The discount rule is outside your unit.");
                }
            }
        }
    }

    private DiscountRuleRecord require(PosContext context, long ruleId) {
        return repository.find(context, ruleId).orElseThrow(() -> PosApiException.notFound("Discount rule not found."));
    }

    private PosContext publicContext(long companyId, Long unitId, Long businessId) {
        var scope = unitId != null && businessId != null
            ? PosScope.businessOffice(unitId, businessId)
            : unitId != null ? PosScope.unitHeadquarters(unitId) : PosScope.corporateOffice();
        return new PosContext(0L, companyId, "Public channel", "public", true, scope);
    }

    private RuleResponse response(DiscountRuleRecord rule) {
        return new RuleResponse(
            rule.id(), rule.unitId(), rule.businessId(), rule.warehouseId(), rule.name(), rule.description(),
            lower(rule.scope()), "PERCENTAGE".equals(rule.discountType()) ? "percentage" : "fixedAmount",
            rule.value(), rule.currencyCode(), rule.startsAt(), rule.endsAt(), rule.minimumAmount(),
            rule.maximumDiscountAmount(), lower(rule.customerType()), rule.productId(), rule.category(),
            rule.requiresAuthorization(), rule.stackable(), rule.priority(), effectiveStatus(rule),
            channels(rule).stream().map(this::channelResponse).toList(), rule.version(), rule.createdAt(), rule.updatedAt());
    }

    private String effectiveStatus(DiscountRuleRecord rule) {
        if ("PAUSED".equals(rule.status()) || "ARCHIVED".equals(rule.status())) return lower(rule.status());
        var now = clock.instant();
        if (now.isBefore(rule.startsAt())) return "scheduled";
        if (now.isAfter(rule.endsAt())) return "expired";
        return "active";
    }

    private List<String> channels(DiscountRuleRecord rule) {
        try {
            return objectMapper.readValue(rule.enabledChannelsJson(), new TypeReference<List<String>>() { }).stream()
                .map(this::normalized).filter(CHANNELS::contains).distinct().toList();
        } catch (Exception ex) {
            throw PosApiException.badRequest("Stored discount channels are invalid.");
        }
    }

    private String channelResponse(String channel) {
        return switch (channel) {
            case "PUBLIC_CATALOG" -> "publicCatalog";
            default -> channel.toLowerCase(Locale.ROOT);
        };
    }

    private String normalized(String value) {
        if (value == null) return "";
        var normalized = value.trim().replace('-', '_').replaceAll("([a-z])([A-Z])", "$1_$2");
        return normalized.toUpperCase(Locale.ROOT);
    }

    private String lower(String value) {
        return value == null ? null : value.toLowerCase(Locale.ROOT);
    }

    private boolean same(String first, String second) {
        return !blank(first) && !blank(second) && first.trim().equalsIgnoreCase(second.trim());
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
