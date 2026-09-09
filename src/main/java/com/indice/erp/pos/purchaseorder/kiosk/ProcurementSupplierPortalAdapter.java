package com.indice.erp.pos.purchaseorder.kiosk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskFileIntentService;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentRegisterRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import com.indice.erp.storage.ObjectStorageProperties;
import jakarta.validation.Validator;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class ProcurementSupplierPortalAdapter implements KioskModuleAdapter {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

    private final PurchaseOrderRepository repository;
    private final PurchaseOrderService service;
    private final ProcurementSupplierPortalIdentityService identities;
    private final ProcurementKioskModuleAuditService moduleAudit;
    private final KioskFileIntentService fileIntents;
    private final ObjectStorageProperties storageProperties;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final ProcurementSupplierPortalScopeReconciler scopeReconciler;
    private final ProcurementProviderCenterService providerCenter;

    @Autowired
    public ProcurementSupplierPortalAdapter(
            PurchaseOrderRepository repository,
            PurchaseOrderService service,
            ProcurementSupplierPortalIdentityService identities,
            ProcurementKioskModuleAuditService moduleAudit,
            KioskFileIntentService fileIntents,
            ObjectStorageProperties storageProperties,
            ObjectMapper objectMapper,
            Validator validator,
            ProcurementSupplierPortalScopeReconciler scopeReconciler,
            ProcurementProviderCenterService providerCenter) {
        this.repository = repository;
        this.service = service;
        this.identities = identities;
        this.moduleAudit = moduleAudit;
        this.fileIntents = fileIntents;
        this.storageProperties = storageProperties;
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.scopeReconciler = scopeReconciler;
        this.providerCenter = providerCenter;
    }

    ProcurementSupplierPortalAdapter(
            PurchaseOrderRepository repository,
            PurchaseOrderService service,
            ProcurementSupplierPortalIdentityService identities,
            ProcurementKioskModuleAuditService moduleAudit,
            KioskFileIntentService fileIntents,
            ObjectStorageProperties storageProperties,
            ObjectMapper objectMapper,
            Validator validator,
            ProcurementSupplierPortalScopeReconciler scopeReconciler) {
        this(repository, service, identities, moduleAudit, fileIntents, storageProperties,
            objectMapper, validator, scopeReconciler, null);
    }

    @Override
    public String ownerModule() {
        return ProcurementSupplierPortalCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return ProcurementSupplierPortalCapabilities.descriptors();
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        return ProcurementSupplierPortalCapabilities.descriptorsFor(definition.kioskType());
    }

    @Override
    public boolean supportsProviderCenter(KioskResolvedDefinition definition) {
        return providerCenter != null && providerCenter.supports(definition.kioskType());
    }

    @Override
    public boolean providerCenterAccessAllows(
            KioskResolvedDefinition definition, long providerId) {
        return supportsProviderCenter(definition)
            && providerCenter.hasAccess(definition.companyId(), providerId);
    }

    @Override
    public Map<String, Object> providerBootstrap(KioskExecutionContext context) {
        return requireProviderCenter().bootstrap(context);
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        var access = access(context);
        return Map.of(
            "kioskType", ProcurementSupplierPortalCapabilities.KIOSK_TYPE,
            "status", effectiveStatus(access),
            "expiresAt", access.expiresAt() == null ? "" : access.expiresAt().toString(),
            "accessLevel", "CONTROLLED",
            "inactivityTimeoutSeconds", 15 * 60,
            "availableFactors", List.of("PIN")
        );
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        if (KioskExecutionChannels.PROVIDER_MULTI_KIOSK.equals(context.channel())) {
            return context.session() != null
                    && "PROVIDER".equals(context.session().identityType())
                    && supportsProviderCenter(context.definition())
                    && providerCenterAccessAllows(
                        context.definition(), context.session().identityId())
                ? KioskAuthorization.allow()
                : KioskAuthorization.deny("Provider Center procurement session is required.");
        }
        var access = access(context);
        if (ProcurementSupplierPortalCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())) {
            return KioskAuthorization.allow();
        }
        if (!operational(access)
                || context.session() == null
                || !"PROVIDER".equals(context.session().identityType())
                || context.session().identityId() != access.providerId()) {
            return KioskAuthorization.deny("Supplier portal authentication is required.");
        }
        if (!allowedCapabilities(access).contains(request.capabilityKey())) {
            return KioskAuthorization.deny("Supplier portal capability is not granted.");
        }
        if (fileCapability(request.capabilityKey())
                && !Objects.equals(request.resourceId(), access.id())) {
            return KioskAuthorization.deny("Supplier portal file scope is invalid.");
        }
        return KioskAuthorization.allow();
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        var payload = request.payload();
        return switch (request.capabilityKey()) {
            case ProcurementSupplierPortalCapabilities.IDENTITY_VERIFY ->
                required(payload, "credential_payload", "pin")
                    ? KioskValidationResult.success()
                    : KioskValidationResult.invalid("credential_payload is required.");
            case ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE ->
                validate(payload, SupplierPortalSubmissionRequest.class);
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN ->
                validate(payload, SupplierPortalDocumentUploadRequest.class);
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER ->
                validate(payload, SupplierPortalDocumentRegisterRequest.class);
            case ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT ->
                validate(payload, SupplierPortalInvoiceRequest.class);
            default -> KioskValidationResult.success();
        };
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        var access = access(context);
        var response = switch (request.capabilityKey()) {
            case ProcurementSupplierPortalCapabilities.IDENTITY_VERIFY -> authenticate(context, request);
            case ProcurementSupplierPortalCapabilities.CATALOG_READ -> legacy(context)
                ? map(service.supplierPortalContext(access)) : publicContext(context, access);
            case ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE -> submission(
                context, access, converted(request.payload(), SupplierPortalSubmissionRequest.class));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN -> presign(
                access, converted(request.payload(), SupplierPortalDocumentUploadRequest.class));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER ->
                service.registerPublicSupplierInvoiceUpload(
                    access, converted(request.payload(), SupplierPortalDocumentRegisterRequest.class));
            case ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT -> submitInvoice(
                context, access, converted(request.payload(), SupplierPortalInvoiceRequest.class));
            default -> throw new IllegalArgumentException("Unsupported procurement kiosk capability.");
        };
        audit(context, request, response);
        response.remove("_audit_record_id");
        return response;
    }

    @Override
    public Map<String, Object> executeProvider(
            KioskExecutionContext context, KioskActionRequest request) {
        return requireProviderCenter().execute(context, request);
    }

    private Map<String, Object> authenticate(
            KioskExecutionContext context,
            KioskActionRequest request) {
        var pin = text(request.payload(), "credential_payload", "pin");
        var access = access(context);
        var response = new LinkedHashMap<>(identities.verify(access, pin));
        response.put("context", legacy(context)
            ? map(service.supplierPortalContext(access)) : publicContext(context, access));
        return response;
    }

    private Map<String, Object> publicContext(
            KioskExecutionContext context,
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        var view = service.supplierPortalContext(access);
        var response = new LinkedHashMap<String, Object>();
        response.put("providerName", view.providerName());
        if (context.definition() != null) {
            response.put("kioskName", context.definition().name());
        }
        if (access.companyName() != null && !access.companyName().isBlank()) {
            response.put("companyName", access.companyName());
        }
        if (access.unitName() != null && !access.unitName().isBlank()) {
            response.put("unitName", access.unitName());
        }
        if (access.businessName() != null && !access.businessName().isBlank()) {
            response.put("businessName", access.businessName());
        }
        if (view.providerEmail() != null && !view.providerEmail().isBlank()) {
            response.put("providerEmail", view.providerEmail());
        }
        response.put("status", view.status());
        response.put("catalogProducts", view.catalogProducts());
        return response;
    }

    private Map<String, Object> submission(
            KioskExecutionContext context,
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalSubmissionRequest request) {
        var submission = service.createPublicSupplierSubmission(access, request);
        if (legacy(context)) {
            return map(submission);
        }
        var response = new LinkedHashMap<String, Object>();
        response.put("_audit_record_id", submission.id());
        response.put("submissionNumber", submission.submissionNumber());
        response.put("status", submission.status().name());
        var submittedAt = submission.submittedAt() == null
            ? submission.createdAt() : submission.submittedAt();
        if (submittedAt != null) response.put("submittedAt", submittedAt.toString());
        return response;
    }

    private Map<String, Object> presign(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalDocumentUploadRequest request) {
        var response = new LinkedHashMap<>(map(service.createPublicSupplierInvoiceUpload(access, request)));
        response.put("bucket_name", storageProperties.getMinio().getBucketSalesDocuments());
        return response;
    }

    private Map<String, Object> submitInvoice(
            KioskExecutionContext context,
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            SupplierPortalInvoiceRequest request) {
        if (request.documentUrl() != null && !request.documentUrl().isBlank()) {
            fileIntents.requireAdopted(
                context, access.id(), request.documentUrl(),
                ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN);
        }
        var invoice = service.createPublicSupplierInvoice(access, request);
        if (request.documentUrl() != null && !request.documentUrl().isBlank()) {
            fileIntents.consumeAdopted(
                context, access.id(), request.documentUrl(),
                ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN,
                "SUPPLIER_INVOICE", invoice.id());
        }
        if (legacy(context)) {
            return map(invoice);
        }
        var response = new LinkedHashMap<String, Object>();
        response.put("_audit_record_id", invoice.id());
        response.put("invoiceNumber", invoice.invoiceNumber());
        response.put("status", invoice.status().name());
        if (invoice.createdAt() != null) response.put("createdAt", invoice.createdAt().toString());
        return response;
    }

    private void audit(
            KioskExecutionContext context,
            KioskActionRequest request,
            Map<String, Object> response) {
        switch (request.capabilityKey()) {
            case ProcurementSupplierPortalCapabilities.SUBMISSION_CREATE -> moduleAudit.success(
                context, "SUPPLIER_SUBMISSION_CREATED", "SUPPLIER_SUBMISSION",
                auditRecordId(response), Map.of("policy", "REVIEW_REQUIRED"));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER -> moduleAudit.success(
                context, "SUPPLIER_INVOICE_DOCUMENT_REGISTERED", "SUPPLIER_PORTAL_ACCESS",
                context.definition().legacyReferenceId(), Map.of("policy", "DIRECT"));
            case ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT -> moduleAudit.success(
                context, "SUPPLIER_INVOICE_SUBMITTED", "SUPPLIER_INVOICE",
                auditRecordId(response), Map.of("policy", "REVIEW_REQUIRED"));
            default -> {
                // Identity, catalog and presign outcomes are fully captured by Engine audit.
            }
        }
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access(KioskExecutionContext context) {
        requireContext(context);
        var access = context.definition() != null
                && context.definition().legacyReferenceId() != null
            ? repository.findSupplierPortalAccessByLegacyReference(
                context.definition().companyId(), context.definition().legacyReferenceId())
                .orElseThrow(() -> new SecurityException("Supplier portal is unavailable."))
            : repository.findSupplierPortalAccessByCode(context.accessReference())
                .orElseThrow(() -> new SecurityException("Supplier portal is unavailable."));
        if (context.definition() != null
                && (!Objects.equals(context.definition().legacyReferenceId(), access.id())
                    || context.definition().companyId() != access.companyId())) {
            throw new SecurityException("Supplier portal scope is invalid.");
        }
        if (access.unitId() == null || access.businessId() == null) {
            if (context.definition() != null) {
                scopeReconciler.disableIncomplete(context.definition(), access);
            }
            throw new SecurityException("Supplier portal scope is incomplete.");
        }
        if (context.definition() != null
                && (!Objects.equals(context.definition().unitId(), access.unitId())
                    || !Objects.equals(context.definition().businessId(), access.businessId()))) {
            scopeReconciler.synchronizeChangedScope(context.definition(), access);
            throw new SecurityException("Supplier portal scope changed; authenticate again.");
        }
        return access;
    }

    private Set<String> allowedCapabilities(
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        try {
            if (access.allowedCapabilitiesJson() == null || access.allowedCapabilitiesJson().isBlank()) {
                return Set.of();
            }
            return Set.copyOf(objectMapper.readValue(access.allowedCapabilitiesJson(), STRING_LIST));
        } catch (JsonProcessingException failure) {
            throw new SecurityException("Supplier portal capabilities are invalid.");
        }
    }

    private boolean operational(PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        return "ACTIVE".equalsIgnoreCase(access.status())
            && (access.expiresAt() == null || access.expiresAt().isAfter(Instant.now()));
    }

    private boolean legacy(KioskExecutionContext context) {
        return "LEGACY_PUBLIC_LINK".equals(context.channel());
    }

    private Long auditRecordId(Map<String, Object> response) {
        var internal = number(response.get("_audit_record_id"));
        return internal == null ? number(response.get("id")) : internal;
    }

    private boolean fileCapability(String capabilityKey) {
        return ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN.equals(capabilityKey)
            || ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER.equals(capabilityKey);
    }

    private String effectiveStatus(PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        if (access.expiresAt() != null && !access.expiresAt().isAfter(Instant.now())) {
            return "EXPIRED";
        }
        return "PAUSED".equalsIgnoreCase(access.status()) ? "DISABLED" : access.status().toUpperCase();
    }

    private <T> KioskValidationResult validate(Map<String, Object> payload, Class<T> type) {
        try {
            var value = converted(payload, type);
            var violations = validator.validate(value);
            if (violations.isEmpty()) {
                return KioskValidationResult.success();
            }
            var first = violations.iterator().next();
            return KioskValidationResult.invalid(first.getPropertyPath() + " " + first.getMessage());
        } catch (IllegalArgumentException failure) {
            return KioskValidationResult.invalid("Request payload is invalid.");
        }
    }

    private <T> T converted(Map<String, Object> payload, Class<T> type) {
        var normalized = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        normalized.remove("kiosk_session_token");
        normalized.remove("identification_token");
        normalized.remove("resource_id");
        return objectMapper.convertValue(normalized, type);
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private boolean required(Map<String, Object> payload, String... keys) {
        return !text(payload, keys).isBlank();
    }

    private String text(Map<String, Object> payload, String... keys) {
        if (payload != null) {
            for (var key : keys) {
                var value = payload.get(key);
                if (value != null && !String.valueOf(value).isBlank()) {
                    return String.valueOf(value).trim();
                }
            }
        }
        return "";
    }

    private Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private void requireContext(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule())) {
            throw new IllegalArgumentException("Kiosk context does not belong to Procurement.");
        }
    }

    private ProcurementProviderCenterService requireProviderCenter() {
        if (providerCenter == null) {
            throw new SecurityException("Provider Center procurement is unavailable.");
        }
        return providerCenter;
    }
}
