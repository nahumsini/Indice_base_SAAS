package com.indice.erp.pos.selfservice;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.kiosk.PointOfSaleKioskExperience;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketCreateRequest;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class SelfServiceKioskExperience implements PointOfSaleKioskExperience {

    public static final String CATALOG_READ = PointOfSaleKioskCapabilities.SELF_SERVICE_CATALOG_READ;
    public static final String PRETICKET_CREATE = PointOfSaleKioskCapabilities.SELF_SERVICE_PRETICKET_CREATE;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final SelfServiceKioskService service;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public SelfServiceKioskExperience(
            SelfServiceKioskService service,
            ObjectMapper objectMapper,
            Validator validator) {
        this.service = service;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Override
    public String kioskType() {
        return SelfServiceKioskService.KIOSK_TYPE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return PointOfSaleKioskCapabilities.selfServiceDescriptors();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        return map(service.bootstrap(definition(context)));
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        return capabilities().stream().anyMatch(capability -> capability.key().equals(request.capabilityKey()))
            ? KioskAuthorization.allow()
            : KioskAuthorization.deny("Self-service capability is not available.");
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        if (PRETICKET_CREATE.equals(request.capabilityKey())) {
            var payload = convert(request.payload(), PreticketCreateRequest.class);
            var violations = validator.validate(payload);
            if (!violations.isEmpty()) {
                var first = violations.iterator().next();
                return KioskValidationResult.invalid(first.getPropertyPath() + " " + first.getMessage());
            }
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        return switch (request.capabilityKey()) {
            case CATALOG_READ -> map(service.bootstrap(definition(context)));
            case PRETICKET_CREATE -> map(service.createPreticket(
                definition(context), convert(request.payload(), PreticketCreateRequest.class)));
            default -> throw new IllegalArgumentException("Unsupported self-service capability.");
        };
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition definition(
            KioskExecutionContext context) {
        if (context.definition() == null
                || context.definition().legacyReferenceId() == null
                || !SelfServiceKioskService.OWNER_MODULE.equals(context.definition().ownerModule())
                || !SelfServiceKioskService.supportsPublicType(context.definition().kioskType())) {
            throw new IllegalArgumentException("Self-service kiosk definition is invalid.");
        }
        return context.definition();
    }

    private <T> T convert(Map<String, Object> payload, Class<T> type) {
        return objectMapper.convertValue(payload == null ? Map.of() : payload, type);
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }
}
