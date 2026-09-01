package com.indice.erp.finance.pettycash;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/** Employee-center bridge that keeps the petty-cash public token inside its owner module. */
@Service
public class PettyCashEmployeeKioskService {

    private final PettyCashPublicKioskService kioskService;
    private final KioskRegistryService registry;

    public PettyCashEmployeeKioskService(
            PettyCashPublicKioskService kioskService,
            KioskRegistryService registry) {
        this.kioskService = kioskService;
        this.registry = registry;
    }

    public boolean supports(KioskResolvedDefinition definition) {
        return definition != null
            && PettyCashKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && PettyCashKioskCapabilities.KIOSK_TYPE.equals(definition.kioskType())
            && definition.legacyReferenceId() != null
            && definition.legacyReferenceId() > 0
            && registry.publicTokenRecoverable(definition.companyId(), definition.id());
    }

    public Map<String, Object> bootstrap(KioskResolvedDefinition definition, long userId) {
        requireSupported(definition);
        return kioskService.employeeBootstrap(
            recoverPublicToken(definition), definition.companyId(), userId);
    }

    public Map<String, Object> execute(
            KioskResolvedDefinition definition,
            long userId,
            KioskActionRequest request) {
        requireSupported(definition);
        if (PettyCashKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())) {
            throw new IllegalArgumentException(
                "Petty cash identity verification is already provided by the employee kiosk session.");
        }

        var fundToken = recoverPublicToken(definition);
        if (PettyCashKioskCapabilities.MOVEMENTS_READ.equals(request.capabilityKey())) {
            return kioskService.employeeMovements(
                fundToken, definition.companyId(), userId);
        }
        if (requiresOwnedReceipt(request.capabilityKey())) {
            kioskService.requireEmployeeOwnedReceipt(
                fundToken, definition.companyId(), userId, requireResourceId(request));
        }
        var payload = new LinkedHashMap<>(request.payload() == null ? Map.of() : request.payload());
        payload.remove("pin");
        payload.remove("credential_payload");
        payload.remove("credential");
        payload.put("identification_token", kioskService.employeeIdentificationToken(
            fundToken, definition.companyId(), userId));

        var response = switch (request.capabilityKey()) {
            case PettyCashKioskCapabilities.RECEIPT_CREATE ->
                kioskService.publicCreateReceipt(fundToken, payload);
            case PettyCashKioskCapabilities.RECEIPT_DELETE ->
                kioskService.publicDeleteReceipt(fundToken, requireResourceId(request), payload);
            case PettyCashKioskCapabilities.ATTACHMENTS_READ ->
                kioskService.publicListAttachments(fundToken, requireResourceId(request), payload);
            case PettyCashKioskCapabilities.ATTACHMENT_PRESIGN ->
                kioskService.publicCreateAttachmentUpload(fundToken, requireResourceId(request), payload);
            case PettyCashKioskCapabilities.ATTACHMENT_REGISTER ->
                kioskService.publicRegisterAttachment(fundToken, requireResourceId(request), payload);
            default -> throw new IllegalArgumentException(
                "Unsupported employee petty cash capability: " + request.capabilityKey());
        };
        return includesReceiptHistory(request.capabilityKey())
            ? replaceWithEmployeeHistory(
                response, fundToken, definition.companyId(), userId)
            : response;
    }

    private void requireSupported(KioskResolvedDefinition definition) {
        if (!supports(definition)) {
            throw new SecurityException("Petty cash kiosk is not available in the employee center.");
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

    private boolean requiresOwnedReceipt(String capabilityKey) {
        return Set.of(
            PettyCashKioskCapabilities.ATTACHMENTS_READ,
            PettyCashKioskCapabilities.ATTACHMENT_PRESIGN,
            PettyCashKioskCapabilities.ATTACHMENT_REGISTER
        ).contains(capabilityKey);
    }

    private boolean includesReceiptHistory(String capabilityKey) {
        return PettyCashKioskCapabilities.RECEIPT_CREATE.equals(capabilityKey)
            || PettyCashKioskCapabilities.RECEIPT_DELETE.equals(capabilityKey);
    }

    private Map<String, Object> replaceWithEmployeeHistory(
            Map<String, Object> response,
            String fundToken,
            long companyId,
            long userId) {
        var sanitized = new LinkedHashMap<String, Object>();
        if (response != null && response.get("settlement_line") != null) {
            sanitized.put("settlement_line", response.get("settlement_line"));
        }
        sanitized.putAll(kioskService.employeeMovements(fundToken, companyId, userId));
        return sanitized;
    }
}
