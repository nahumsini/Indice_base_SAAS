package com.indice.erp.sales.publiccatalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PurchaseRequest;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class SalesPublicCatalogAdapter implements KioskModuleAdapter {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private final SalesPublicCatalogService service;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public SalesPublicCatalogAdapter(
            SalesPublicCatalogService service,
            ObjectMapper objectMapper,
            Validator validator) {
        this.service = service;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Override
    public String ownerModule() {
        return SalesPublicCatalogService.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return SalesPublicCatalogCapabilities.descriptors();
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        return definition != null && SalesPublicCatalogService.KIOSK_TYPE.equals(definition.kioskType())
            ? capabilities() : Set.of();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        return map(service.bootstrap(definition(context)));
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        definition(context);
        return capabilities(context.definition()).stream()
            .anyMatch(capability -> capability.versionedKey().equals(request.versionedCapabilityKey()))
            ? KioskAuthorization.allow()
            : KioskAuthorization.deny("Sales catalog capability is unavailable.");
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        if (SalesPublicCatalogCapabilities.REQUEST_CREATE.equals(request.capabilityKey())) {
            var payload = objectMapper.convertValue(request.payload(), PurchaseRequest.class);
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
            case SalesPublicCatalogCapabilities.CATALOG_READ -> map(service.bootstrap(definition(context)));
            case SalesPublicCatalogCapabilities.REQUEST_CREATE -> {
                var submitted = service.submitPublic(
                    definition(context), objectMapper.convertValue(request.payload(), PurchaseRequest.class));
                yield map(submitted);
            }
            default -> throw new IllegalArgumentException("Unsupported sales catalog capability.");
        };
    }

    private KioskResolvedDefinition definition(KioskExecutionContext context) {
        if (context.definition() == null
                || context.definition().legacyReferenceId() == null
                || !SalesPublicCatalogService.OWNER_MODULE.equals(context.definition().ownerModule())
                || !SalesPublicCatalogService.KIOSK_TYPE.equals(context.definition().kioskType())) {
            throw new IllegalArgumentException("Sales public catalog definition is invalid.");
        }
        return context.definition();
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }
}
