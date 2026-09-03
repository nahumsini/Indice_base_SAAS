package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskIdentityBiometricService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.Map;
import java.util.Set;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

@Component
public class PayableKioskAdapter implements KioskModuleAdapter {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final Set<String> EMPLOYEE_TAB_PERMISSIONS = Set.of("expenses.expenses");
    private static final Set<String> EMPLOYEE_CAPABILITIES = Set.of(
        PayableKioskCapabilities.PAYABLE_CREATE,
        PayableKioskCapabilities.ATTACHMENT_PRESIGN,
        PayableKioskCapabilities.ATTACHMENT_REGISTER);
    private final PayableKioskService service;
    private final PayableEmployeeKioskService employeeCenter;
    private final ObjectMapper objectMapper;
    private final FinanceKioskModuleAuditService moduleAudit;
    private final Validator validator;
    private final KioskIdentityBiometricService biometrics;

    public PayableKioskAdapter(
            PayableKioskService service,
            ObjectMapper objectMapper,
            FinanceKioskModuleAuditService moduleAudit,
            Validator validator,
            KioskIdentityBiometricService biometrics,
            PayableEmployeeKioskService employeeCenter) {
        this.service = service;
        this.objectMapper = objectMapper;
        this.moduleAudit = moduleAudit;
        this.validator = validator;
        this.biometrics = biometrics;
        this.employeeCenter = employeeCenter;
    }

    @Override
    public String ownerModule() {
        return PayableKioskCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return PayableKioskCapabilities.descriptors();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        requireContext(context);
        return service.publicBootstrap(context.accessReference());
    }

    @Override
    public boolean supportsEmployeeCenter(KioskResolvedDefinition definition) {
        return employeeCenter.supports(definition);
    }

    @Override
    public Set<String> employeeCenterTabPermissionKeys(KioskResolvedDefinition definition) {
        return EMPLOYEE_TAB_PERMISSIONS;
    }

    @Override
    public Set<String> employeeCapabilityTabPermissionKeys(
            KioskResolvedDefinition definition,
            KioskCapabilityDescriptor capability) {
        return EMPLOYEE_CAPABILITIES.contains(capability.key())
            ? EMPLOYEE_TAB_PERMISSIONS : Set.of();
    }

    @Override
    public Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
        requireEmployeeContext(context);
        return employeeCenter.bootstrap(context.definition(), context.session().identityId());
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        if (KioskExecutionChannels.isEmployeeChannel(context.channel())) {
            return context.session() != null
                    && "USER".equals(context.session().identityType())
                    && EMPLOYEE_CAPABILITIES.contains(request.capabilityKey())
                ? KioskAuthorization.allow()
                : KioskAuthorization.deny("Authenticated employee payable session is required.");
        }
        if (PayableKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())
                || PayableKioskCapabilities.PROVIDER_REGISTER.equals(request.capabilityKey())) {
            return KioskAuthorization.allow();
        }
        if (context.session() == null
                || !Set.of("PROVIDER", "EMPLOYEE").contains(context.session().identityType())) {
            return KioskAuthorization.deny("Personal kiosk authentication is required.");
        }
        return KioskAuthorization.allow();
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        if (PayableKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())
                && blank(request.payload(), "credential_payload", "pin", "credential")) {
            return KioskValidationResult.invalid("credential_payload is required.");
        }
        if (PayableKioskCapabilities.PROVIDER_REGISTER.equals(request.capabilityKey())
                && blank(request.payload(), "name")) {
            return KioskValidationResult.invalid("name is required.");
        }
        if (PayableKioskCapabilities.PAYABLE_CREATE.equals(request.capabilityKey())
                && blank(request.payload(), "concept")) {
            return KioskValidationResult.invalid("concept is required.");
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        var response = switch (request.capabilityKey()) {
            case PayableKioskCapabilities.IDENTITY_VERIFY ->
                service.publicAuthenticateCanonical(context.accessReference(), request.payload());
            case PayableKioskCapabilities.PROVIDER_REGISTER -> service.registerProvider(
                context.accessReference(), validated(request.payload(), PublicProviderRegistrationRequest.class));
            case PayableKioskCapabilities.PAYABLE_CREATE -> service.createPayableForIdentity(
                context.accessReference(), identityType(context), identityId(context),
                validated(request.payload(), PublicPayableRequest.class));
            case PayableKioskCapabilities.ATTACHMENT_PRESIGN -> map(service.presignPayableAttachmentForIdentity(
                context.accessReference(), identityType(context), identityId(context), resourceId(request),
                validated(request.payload(), ExpenseAttachmentUploadRequest.class)));
            case PayableKioskCapabilities.ATTACHMENT_REGISTER -> map(service.registerPayableAttachmentForIdentity(
                context.accessReference(), identityType(context), identityId(context), resourceId(request),
                validated(request.payload(), RegisterExpenseAttachmentRequest.class)));
            case PayableKioskCapabilities.FACE_ENROLLMENT_STATUS -> biometrics.status(context);
            case PayableKioskCapabilities.FACE_ENROLLMENT_BEGIN ->
                biometrics.beginEnrollment(context, request.payload());
            case PayableKioskCapabilities.FACE_ENROLLMENT_CAPTURE_PRESIGN ->
                biometrics.presignEnrollmentCapture(context, request.payload());
            case PayableKioskCapabilities.FACE_ENROLLMENT_COMPLETE ->
                biometrics.completeEnrollment(context, request.payload());
            case PayableKioskCapabilities.FACE_CONSENT_WITHDRAW -> biometrics.withdrawConsent(context);
            case PayableKioskCapabilities.FACE_VERIFICATION_BEGIN ->
                biometrics.beginVerification(context, request.payload());
            case PayableKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN ->
                biometrics.presignVerificationCapture(context, request.payload());
            case PayableKioskCapabilities.FACE_VERIFICATION_COMPLETE ->
                biometrics.completeVerification(context, request.payload());
            default -> throw new IllegalArgumentException("Unsupported payable kiosk capability.");
        };
        auditMutation(context, request, response);
        return response;
    }

    @Override
    public Map<String, Object> executeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        requireEmployeeContext(context);
        var response = employeeCenter.execute(
            context.definition(), context.session().identityId(), request);
        auditMutation(context, request, response);
        return response;
    }

    private void auditMutation(
            KioskExecutionContext context,
            KioskActionRequest request,
            Map<String, Object> response) {
        switch (request.capabilityKey()) {
            case PayableKioskCapabilities.PROVIDER_REGISTER -> moduleAudit.success(
                context, "PROVIDER_REGISTRATION_SUBMITTED", "PROVIDER",
                number(response.get("providerId")), Map.of("policy", "REVIEW_REQUIRED"));
            case PayableKioskCapabilities.PAYABLE_CREATE -> moduleAudit.success(
                context, "PAYABLE_SUBMITTED", "EXPENSE",
                number(response.get("expenseId")), Map.of("policy", "REVIEW_REQUIRED"));
            case PayableKioskCapabilities.ATTACHMENT_REGISTER -> moduleAudit.success(
                context, "PAYABLE_EVIDENCE_REGISTERED", "EXPENSE",
                request.resourceId(), Map.of("policy", "DIRECT"));
            default -> {
                // Identity and presign are fully captured by Engine audit.
            }
        }
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

    private long identityId(KioskExecutionContext context) {
        if (context.session() == null || context.session().identityId() <= 0) {
            throw new SecurityException("Personal kiosk authentication is required.");
        }
        return context.session().identityId();
    }

    private String identityType(KioskExecutionContext context) {
        if (context.session() == null
                || !Set.of("PROVIDER", "EMPLOYEE").contains(context.session().identityType())) {
            throw new SecurityException("Personal kiosk authentication is required.");
        }
        return context.session().identityType();
    }

    private long resourceId(KioskActionRequest request) {
        if (request.resourceId() == null || request.resourceId() <= 0) {
            throw new IllegalArgumentException("A valid resourceId is required.");
        }
        return request.resourceId();
    }

    private <T> T convert(Map<String, Object> payload, Class<T> type) {
        return objectMapper.convertValue(payload == null ? Map.of() : payload, type);
    }

    private <T> T validated(Map<String, Object> payload, Class<T> type) {
        var value = convert(payload, type);
        var violations = validator.validate(value);
        if (!violations.isEmpty()) {
            var first = violations.iterator().next();
            throw new IllegalArgumentException(first.getPropertyPath() + " " + first.getMessage());
        }
        return value;
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private boolean blank(Map<String, Object> payload, String... keys) {
        if (payload != null) {
            for (var key : keys) {
                var value = payload.get(key);
                if (value != null && !String.valueOf(value).isBlank()) {
                    return false;
                }
            }
        }
        return true;
    }

    private void requireContext(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule())) {
            throw new IllegalArgumentException("Kiosk context does not belong to Expenses.");
        }
    }

    private void requireEmployeeContext(KioskExecutionContext context) {
        requireContext(context);
        if (!KioskExecutionChannels.isEmployeeChannel(context.channel())
                || context.definition() == null || context.session() == null
                || !"USER".equals(context.session().identityType())
                || context.session().identityId() <= 0
                || context.session().companyId() != context.definition().companyId()
                || context.session().kioskDefinitionId() != context.definition().id()) {
            throw new SecurityException("Authenticated employee payable session is required.");
        }
    }
}
