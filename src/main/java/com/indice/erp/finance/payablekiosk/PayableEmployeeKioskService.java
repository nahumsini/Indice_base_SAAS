package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import jakarta.validation.Validator;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

/** Internal employee bridge that never returns the module-owned public token to the browser. */
@Service
public class PayableEmployeeKioskService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };
    private final PayableKioskService service;
    private final PayableKioskRepository repository;
    private final KioskRegistryService registry;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public PayableEmployeeKioskService(
            PayableKioskService service,
            PayableKioskRepository repository,
            KioskRegistryService registry,
            ObjectMapper objectMapper,
            Validator validator) {
        this.service = service;
        this.repository = repository;
        this.registry = registry;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    public boolean supports(KioskResolvedDefinition definition) {
        if (definition == null
                || !PayableKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || !PayableKioskCapabilities.KIOSK_TYPE.equals(definition.kioskType())
                || definition.legacyReferenceId() == null
                || definition.legacyReferenceId() <= 0) {
            return false;
        }
        try {
            if (registry.publicTokenRecoverable(definition.companyId(), definition.id())) {
                return service.supportsEmployeeAccess(
                    recoverPublicToken(definition), definition.companyId());
            }
            var legacy = repository.getById(
                definition.companyId(), definition.legacyReferenceId());
            if (legacy.publicAccessToken() == null || legacy.publicAccessToken().isBlank()
                    || !service.supportsEmployeeAccess(
                        legacy.publicAccessToken(), definition.companyId())) {
                return false;
            }
            return registry.repairLegacyPublicTokenRecoveryMaterial(
                definition.companyId(), definition.id(), definition.ownerModule(),
                definition.kioskType(), definition.legacyReferenceId(),
                legacy.publicAccessToken());
        } catch (NoSuchElementException | IllegalArgumentException
                | IllegalStateException | SecurityException unavailable) {
            return false;
        }
    }

    public Map<String, Object> bootstrap(KioskResolvedDefinition definition, long userId) {
        requireSupported(definition);
        return service.employeeBootstrap(
            recoverPublicToken(definition), definition.companyId(), userId);
    }

    public Map<String, Object> execute(
            KioskResolvedDefinition definition,
            long userId,
            KioskActionRequest request) {
        requireSupported(definition);
        var token = recoverPublicToken(definition);
        return switch (request.capabilityKey()) {
            case PayableKioskCapabilities.PAYABLE_CREATE -> service.createPayableForEmployee(
                token, definition.companyId(), userId,
                convertValidated(request.payload(), PublicPayableRequest.class));
            case PayableKioskCapabilities.ATTACHMENT_PRESIGN -> mapResult(
                service.presignPayableAttachmentForEmployee(
                    token, definition.companyId(), userId, requireResourceId(request),
                    convertValidated(request.payload(), ExpenseAttachmentUploadRequest.class)));
            case PayableKioskCapabilities.ATTACHMENT_REGISTER -> mapResult(
                service.registerPayableAttachmentForEmployee(
                    token, definition.companyId(), userId, requireResourceId(request),
                    convertValidated(request.payload(), RegisterExpenseAttachmentRequest.class)));
            default -> throw new IllegalArgumentException(
                "Unsupported employee payable capability: " + request.capabilityKey());
        };
    }

    private void requireSupported(KioskResolvedDefinition definition) {
        if (!supports(definition)) {
            throw new SecurityException("Payable kiosk is not available in the employee center.");
        }
    }

    private String recoverPublicToken(KioskResolvedDefinition definition) {
        return registry.recoverPublicToken(
            definition.companyId(), definition.ownerModule(), definition.kioskType(),
            definition.legacyReferenceId());
    }

    private long requireResourceId(KioskActionRequest request) {
        if (request.resourceId() == null || request.resourceId() <= 0) {
            throw new IllegalArgumentException("A valid resourceId is required.");
        }
        return request.resourceId();
    }

    private Map<String, Object> mapResult(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private <T> T convertValidated(Map<String, Object> payload, Class<T> type) {
        var value = objectMapper.convertValue(payload == null ? Map.of() : payload, type);
        var violations = validator.validate(value);
        if (!violations.isEmpty()) {
            var first = violations.iterator().next();
            throw new IllegalArgumentException(first.getPropertyPath() + " " + first.getMessage());
        }
        return value;
    }
}
