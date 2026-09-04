package com.indice.erp.finance.pettycash;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Employee-center bridge that keeps the petty-cash public token inside its owner module. */
@Service
public class PettyCashEmployeeKioskService {

    private final PettyCashPublicKioskService kioskService;
    private final KioskRegistryService registry;
    private final JdbcTemplate jdbcTemplate;

    public PettyCashEmployeeKioskService(
            PettyCashPublicKioskService kioskService,
            KioskRegistryService registry,
            JdbcTemplate jdbcTemplate) {
        this.kioskService = kioskService;
        this.registry = registry;
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean supports(KioskResolvedDefinition definition) {
        if (definition == null
                || !PettyCashKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || !PettyCashKioskCapabilities.KIOSK_TYPE.equals(definition.kioskType())
                || definition.legacyReferenceId() == null
                || definition.legacyReferenceId() <= 0) {
            return false;
        }
        if (registry.publicTokenRecoverable(definition.companyId(), definition.id())) {
            return true;
        }
        return repairLegacyRecoveryMaterial(definition)
            && registry.publicTokenRecoverable(definition.companyId(), definition.id());
    }

    /**
     * Older petty-cash kiosks kept their token only in the owner table. Seal that exact token in
     * the registry after the registry verifies its stored hash; never rotate or accept client
     * material during catalog discovery.
     */
    private boolean repairLegacyRecoveryMaterial(KioskResolvedDefinition definition) {
        var tokens = jdbcTemplate.query(
            """
                SELECT kiosk_public_token
                FROM finance_petty_cash_funds
                WHERE id = ? AND company_id = ?
                  AND deleted_at IS NULL
                  AND kiosk_enabled = TRUE
                  AND status <> 'CLOSED'
                  AND kiosk_public_token IS NOT NULL
                  AND kiosk_public_token <> ''
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("kiosk_public_token"),
            definition.legacyReferenceId(), definition.companyId()
        );
        if (tokens.isEmpty()) {
            return false;
        }
        return registry.repairLegacyPublicTokenRecoveryMaterial(
            definition.companyId(), definition.id(), definition.ownerModule(),
            definition.kioskType(), definition.legacyReferenceId(), tokens.getFirst());
    }

    /**
     * A named fund owner is an exact object assignment and may operate that fund even when the
     * employee's primary work profile belongs to another unit. Unassigned funds continue to use
     * the normal organizational scope; assigning the fund to someone else always fails closed.
     */
    public boolean accessAllows(
            KioskResolvedDefinition definition,
            long userId,
            boolean organizationScopeAllows) {
        if (definition == null
                || userId <= 0
                || !PettyCashKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || !PettyCashKioskCapabilities.KIOSK_TYPE.equals(definition.kioskType())
                || definition.legacyReferenceId() == null
                || definition.legacyReferenceId() <= 0) {
            return false;
        }
        var responsibleUsers = jdbcTemplate.query(
            """
                SELECT responsible_user_id
                FROM finance_petty_cash_funds
                WHERE id = ? AND company_id = ?
                  AND deleted_at IS NULL
                  AND kiosk_enabled = TRUE
                  AND status <> 'CLOSED'
                """,
            (rs, rowNum) -> rs.getObject("responsible_user_id", Long.class),
            definition.legacyReferenceId(), definition.companyId()
        );
        if (responsibleUsers.isEmpty()) return false;
        var responsibleUserId = responsibleUsers.getFirst();
        return responsibleUserId == null
            ? organizationScopeAllows
            : responsibleUserId == userId;
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
