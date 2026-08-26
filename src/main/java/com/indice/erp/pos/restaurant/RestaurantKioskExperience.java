package com.indice.erp.pos.restaurant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.pos.kiosk.PointOfSaleKioskExperience;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.AddItemRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.ItemStatusRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.OpenOrderRequest;
import com.indice.erp.pos.restaurant.RestaurantOrderDtos.UpdateFloorPlanRequest;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class RestaurantKioskExperience implements PointOfSaleKioskExperience {

    private final RestaurantOrderService service;
    private final ObjectMapper objectMapper;

    public RestaurantKioskExperience(RestaurantOrderService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @Override
    public String kioskType() {
        return RestaurantKioskCapabilities.WAITER_TYPE;
    }

    @Override
    public Set<String> kioskTypes() {
        return Set.of(
            RestaurantKioskCapabilities.WAITER_TYPE,
            RestaurantKioskCapabilities.CENTER_TYPE,
            RestaurantKioskCapabilities.KITCHEN_TYPE);
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return RestaurantKioskCapabilities.descriptors();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        return service.publicBootstrap(definition(context));
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        if (!RestaurantKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())
                && (context.session() == null
                    || !service.canUseSession(definition(context), context.session().identityId()))) {
            return KioskAuthorization.deny("Restaurant kiosk authentication or scope is invalid.");
        }
        if (RestaurantKioskCapabilities.FLOOR_PLAN_UPDATE.equals(request.capabilityKey())
                && !service.canEditFloorPlan(definition(context), context.session().identityId())) {
            return KioskAuthorization.deny("Restaurant floor-plan editing is not allowed.");
        }
        return supports(request.capabilityKey())
            ? KioskAuthorization.allow() : KioskAuthorization.deny("Restaurant kiosk capability is unavailable.");
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        if (RestaurantKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())
                && text(request.payload(), "credential_payload", "pin").isBlank()) {
            return KioskValidationResult.invalid("credential_payload is required.");
        }
        if (RestaurantKioskCapabilities.FLOOR_PLAN_UPDATE.equals(request.capabilityKey())
                && (request.payload() == null || !(request.payload().get("tables") instanceof java.util.List<?>))) {
            return KioskValidationResult.invalid("tables is required.");
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        var definition = definition(context);
        var userCompanyId = context.session() == null ? 0 : context.session().identityId();
        return switch (request.capabilityKey()) {
            case RestaurantKioskCapabilities.IDENTITY_VERIFY -> service.identify(
                definition, text(request.payload(), "credential_payload", "pin"));
            case RestaurantKioskCapabilities.WORKSPACE_READ -> service.workspace(definition, userCompanyId);
            case RestaurantKioskCapabilities.ORDER_OPEN -> service.openOrder(
                definition, userCompanyId, convert(request.payload(), OpenOrderRequest.class));
            case RestaurantKioskCapabilities.ITEM_ADD -> service.addItem(
                definition, userCompanyId, convert(request.payload(), AddItemRequest.class));
            case RestaurantKioskCapabilities.ROUND_SEND -> service.sendRound(
                definition, userCompanyId, longValue(request.payload(), "orderId", "resource_id"));
            case RestaurantKioskCapabilities.ITEM_STATUS -> service.updateItemStatus(
                definition, userCompanyId, convert(request.payload(), ItemStatusRequest.class));
            case RestaurantKioskCapabilities.CHECK_REQUEST -> service.requestCheck(
                definition, userCompanyId, longValue(request.payload(), "orderId", "resource_id"));
            case RestaurantKioskCapabilities.FLOOR_PLAN_UPDATE -> service.updateFloorPlan(
                definition, userCompanyId, convert(request.payload(), UpdateFloorPlanRequest.class));
            default -> throw new IllegalArgumentException("Unsupported restaurant kiosk capability.");
        };
    }

    private KioskResolvedDefinition definition(KioskExecutionContext context) {
        if (context.definition() == null || context.definition().legacyReferenceId() == null
                || !service.supports(context.definition().kioskType())) {
            throw new IllegalArgumentException("Restaurant kiosk definition is invalid.");
        }
        return context.definition();
    }

    private <T> T convert(Map<String, Object> payload, Class<T> type) {
        return objectMapper.convertValue(payload == null ? Map.of() : payload, type);
    }

    private long longValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload == null ? null : payload.get(key);
            if (value instanceof Number number) return number.longValue();
            if (value != null && !String.valueOf(value).isBlank()) return Long.parseLong(String.valueOf(value));
        }
        throw new IllegalArgumentException("orderId is required.");
    }

    private String text(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload == null ? null : payload.get(key);
            if (value != null && !String.valueOf(value).isBlank()) return String.valueOf(value).trim();
        }
        return "";
    }
}
