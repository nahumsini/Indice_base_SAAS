package com.indice.erp.sales.publiccatalog;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskEmployeeToolCatalogService;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.sales.kiosk.RouteSalesEmployeeKioskService;
import com.indice.erp.sales.kiosk.RouteSalesKioskCapabilities;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.CreateContactRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.CreateSaleRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.PaymentEvidencePresignRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.PaymentEvidenceRegisterRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PurchaseRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.AvailabilityRequest;
import jakarta.validation.Validator;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class SalesPublicCatalogAdapter implements KioskModuleAdapter {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private final SalesPublicCatalogService service;
    private final RouteSalesEmployeeKioskService routeSales;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public SalesPublicCatalogAdapter(
            SalesPublicCatalogService service,
            RouteSalesEmployeeKioskService routeSales,
            ObjectMapper objectMapper,
            Validator validator) {
        this.service = service;
        this.routeSales = routeSales;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @Override
    public String ownerModule() {
        return SalesPublicCatalogService.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        var descriptors = new LinkedHashSet<KioskCapabilityDescriptor>();
        descriptors.addAll(SalesPublicCatalogCapabilities.descriptors());
        descriptors.addAll(RouteSalesKioskCapabilities.descriptors());
        return Set.copyOf(descriptors);
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        if (isNativeRouteSalesTool(definition)) {
            return RouteSalesKioskCapabilities.descriptors();
        }
        return definition != null && SalesPublicCatalogService.KIOSK_TYPE.equals(definition.kioskType())
            ? SalesPublicCatalogCapabilities.descriptors() : Set.of();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        return map(service.bootstrap(publicDefinition(context)));
    }

    @Override
    public boolean supportsEmployeeCenter(KioskResolvedDefinition definition) {
        return isNativeRouteSalesTool(definition);
    }

    @Override
    public Set<String> employeeCenterTabPermissionKeys(KioskResolvedDefinition definition) {
        return isNativeRouteSalesTool(definition) ? Set.of("crm.sales") : Set.of();
    }

    @Override
    public Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
        requireEmployeeContext(context);
        requireGranted(context, RouteSalesKioskCapabilities.WORKSPACE_READ);
        return routeSales.bootstrap(context.definition(), context.session().identityId());
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        if (isNativeRouteSalesTool(context.definition())) {
            try {
                requireEmployeeContext(context);
            } catch (RuntimeException invalid) {
                return KioskAuthorization.deny("Authenticated route-sales access is required.");
            }
            return capabilities(context.definition()).stream()
                .anyMatch(capability -> capability.versionedKey().equals(request.versionedCapabilityKey()))
                ? KioskAuthorization.allow()
                : KioskAuthorization.deny("Route-sales capability is unavailable.");
        }
        publicDefinition(context);
        return capabilities(context.definition()).stream()
            .anyMatch(capability -> capability.versionedKey().equals(request.versionedCapabilityKey()))
            ? KioskAuthorization.allow()
            : KioskAuthorization.deny("Sales catalog capability is unavailable.");
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        if (RouteSalesKioskCapabilities.CONTACT_CREATE.equals(request.capabilityKey())) {
            return validatePayload(objectMapper.convertValue(request.payload(), CreateContactRequest.class));
        }
        if (RouteSalesKioskCapabilities.SALE_CREATE.equals(request.capabilityKey())) {
            return validatePayload(objectMapper.convertValue(request.payload(), CreateSaleRequest.class));
        }
        if (RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_PRESIGN.equals(request.capabilityKey())) {
            return validatePayload(objectMapper.convertValue(
                request.payload(), PaymentEvidencePresignRequest.class));
        }
        if (RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_REGISTER.equals(request.capabilityKey())) {
            return validatePayload(objectMapper.convertValue(
                request.payload(), PaymentEvidenceRegisterRequest.class));
        }
        if (SalesPublicCatalogCapabilities.REQUEST_CREATE.equals(request.capabilityKey())) {
            var payload = objectMapper.convertValue(request.payload(), PurchaseRequest.class);
            var violations = validator.validate(payload);
            if (!violations.isEmpty()) {
                var first = violations.iterator().next();
                return KioskValidationResult.invalid(first.getPropertyPath() + " " + first.getMessage());
            }
        }
        if (SalesPublicCatalogCapabilities.AVAILABILITY_READ.equals(request.capabilityKey())) {
            var payload = objectMapper.convertValue(request.payload(), AvailabilityRequest.class);
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
            case SalesPublicCatalogCapabilities.CATALOG_READ -> map(service.bootstrap(publicDefinition(context)));
            case SalesPublicCatalogCapabilities.AVAILABILITY_READ -> map(service.availability(
                publicDefinition(context), objectMapper.convertValue(request.payload(), AvailabilityRequest.class)));
            case SalesPublicCatalogCapabilities.REQUEST_CREATE -> {
                var submitted = service.submitPublic(
                    publicDefinition(context), objectMapper.convertValue(request.payload(), PurchaseRequest.class));
                yield map(submitted);
            }
            default -> throw new IllegalArgumentException("Unsupported sales catalog capability.");
        };
    }

    @Override
    public Map<String, Object> executeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        requireEmployeeContext(context);
        RouteSalesKioskCapabilities.require(request.capabilityKey());
        requireGranted(context, request.capabilityKey());
        return switch (request.capabilityKey()) {
            case RouteSalesKioskCapabilities.WORKSPACE_READ ->
                routeSales.bootstrap(context.definition(), context.session().identityId());
            case RouteSalesKioskCapabilities.CONTACT_CREATE ->
                routeSales.createContact(
                    context.definition(), context.session().identityId(),
                    objectMapper.convertValue(request.payload(), CreateContactRequest.class));
            case RouteSalesKioskCapabilities.SALE_CREATE ->
                routeSales.createSale(
                    context.definition(), context.session().identityId(),
                    objectMapper.convertValue(request.payload(), CreateSaleRequest.class));
            case RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_PRESIGN ->
                routeSales.createPaymentEvidenceUpload(
                    context.definition(), context.session().identityId(),
                    objectMapper.convertValue(request.payload(), PaymentEvidencePresignRequest.class));
            case RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_REGISTER ->
                routeSales.registerPaymentEvidence(
                    context.definition(), context.session().identityId(),
                    objectMapper.convertValue(request.payload(), PaymentEvidenceRegisterRequest.class));
            default -> throw new IllegalArgumentException("Unsupported employee route-sales capability.");
        };
    }

    private KioskResolvedDefinition publicDefinition(KioskExecutionContext context) {
        if (context.definition() == null
                || context.definition().legacyReferenceId() == null
                || !SalesPublicCatalogService.OWNER_MODULE.equals(context.definition().ownerModule())
                || !SalesPublicCatalogService.KIOSK_TYPE.equals(context.definition().kioskType())) {
            throw new IllegalArgumentException("Sales public catalog definition is invalid.");
        }
        return context.definition();
    }

    private void requireEmployeeContext(KioskExecutionContext context) {
        if (!KioskExecutionChannels.isEmployeeChannel(context.channel())
                || !isNativeRouteSalesTool(context.definition())
                || context.session() == null
                || !"USER".equals(context.session().identityType())
                || context.session().identityId() <= 0
                || context.session().companyId() != context.definition().companyId()
                || context.session().kioskDefinitionId() != context.definition().id()) {
            throw new SecurityException("Authenticated employee route-sales session is required.");
        }
    }

    private void requireGranted(KioskExecutionContext context, String capabilityKey) {
        var versioned = RouteSalesKioskCapabilities.require(capabilityKey).versionedKey();
        if (context.session().grantedCapabilities() == null
                || !context.session().grantedCapabilities().contains(versioned)) {
            throw new SecurityException("Kiosk capability is not granted: " + versioned + ".");
        }
    }

    private boolean isNativeRouteSalesTool(KioskResolvedDefinition definition) {
        return definition != null
            && RouteSalesKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && KioskEmployeeToolCatalogService.ROUTE_SALES_KIOSK_TYPE.equals(definition.kioskType())
            && KioskEmployeeToolCatalogService.ROUTE_SALES_RESERVED_CODE.equals(definition.code())
            && definition.legacyReferenceId() == null;
    }

    private KioskValidationResult validatePayload(Object payload) {
        var violations = validator.validate(payload);
        if (violations.isEmpty()) return KioskValidationResult.success();
        var first = violations.iterator().next();
        return KioskValidationResult.invalid(first.getPropertyPath() + " " + first.getMessage());
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }
}
