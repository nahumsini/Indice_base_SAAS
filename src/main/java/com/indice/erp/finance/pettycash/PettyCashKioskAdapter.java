package com.indice.erp.finance.pettycash;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PettyCashKioskAdapter implements KioskModuleAdapter {

    private final PettyCashPublicKioskService kioskService;
    private final FinanceKioskModuleAuditService moduleAudit;

    public PettyCashKioskAdapter(
            PettyCashPublicKioskService kioskService,
            FinanceKioskModuleAuditService moduleAudit) {
        this.kioskService = kioskService;
        this.moduleAudit = moduleAudit;
    }

    @Override
    public String ownerModule() {
        return PettyCashKioskCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return PettyCashKioskCapabilities.descriptors();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        requireContext(context);
        return kioskService.publicBootstrap(context.accessReference());
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        if (context.definition() == null) {
            return KioskAuthorization.deny("Kiosk definition is not resolved.");
        }
        if (!request.capabilityKey().endsWith(".identity.verify") && context.session() == null) {
            return KioskAuthorization.deny("Kiosk authentication is required.");
        }
        return KioskAuthorization.allow();
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        if (request.capabilityKey().endsWith(".identity.verify")
                && blank(request.payload().get("credential_payload"))
                && blank(request.payload().get("pin"))) {
            return KioskValidationResult.invalid("credential_payload is required.");
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        var response = switch (request.capabilityKey()) {
            case PettyCashKioskCapabilities.IDENTITY_VERIFY ->
                kioskService.publicIdentify(context.accessReference(), request.payload());
            case PettyCashKioskCapabilities.MOVEMENTS_READ ->
                kioskService.publicMovements(context.accessReference(), request.payload());
            case PettyCashKioskCapabilities.RECEIPT_CREATE ->
                kioskService.publicCreateReceipt(context.accessReference(), request.payload());
            case PettyCashKioskCapabilities.RECEIPT_DELETE ->
                kioskService.publicDeleteReceipt(
                    context.accessReference(), resourceId(request), request.payload());
            case PettyCashKioskCapabilities.ATTACHMENTS_READ ->
                kioskService.publicListAttachments(
                    context.accessReference(), resourceId(request), request.payload());
            case PettyCashKioskCapabilities.ATTACHMENT_PRESIGN ->
                kioskService.publicCreateAttachmentUpload(
                    context.accessReference(), resourceId(request), request.payload());
            case PettyCashKioskCapabilities.ATTACHMENT_REGISTER ->
                kioskService.publicRegisterAttachment(
                    context.accessReference(), resourceId(request), request.payload());
            default -> throw new IllegalArgumentException("Unsupported petty cash kiosk capability.");
        };
        auditMutation(context, request, response);
        return response;
    }

    private void auditMutation(
            KioskExecutionContext context,
            KioskActionRequest request,
            Map<String, Object> response) {
        switch (request.capabilityKey()) {
            case PettyCashKioskCapabilities.RECEIPT_CREATE -> moduleAudit.success(
                context, "PETTY_CASH_RECEIPT_CREATED", "SETTLEMENT_LINE",
                nestedId(response.get("settlement_line")), Map.of("policy", "DIRECT"));
            case PettyCashKioskCapabilities.RECEIPT_DELETE -> moduleAudit.success(
                context, "PETTY_CASH_RECEIPT_DELETED", "SETTLEMENT_LINE",
                request.resourceId(), Map.of("policy", "DIRECT"));
            case PettyCashKioskCapabilities.ATTACHMENT_REGISTER -> moduleAudit.success(
                context, "PETTY_CASH_EVIDENCE_REGISTERED", "SETTLEMENT_LINE",
                request.resourceId(), Map.of("policy", "DIRECT"));
            default -> {
                // Queries, identity and presign intents are already covered by Engine audit.
            }
        }
    }

    private Long nestedId(Object value) {
        if (value instanceof Map<?, ?> map) {
            var id = map.get("id");
            if (id instanceof Number number) {
                return number.longValue();
            }
        }
        try {
            var method = value == null ? null : value.getClass().getMethod("id");
            var id = method == null ? null : method.invoke(value);
            return id instanceof Number number ? number.longValue() : null;
        } catch (ReflectiveOperationException ignored) {
            return null;
        }
    }

    private long resourceId(KioskActionRequest request) {
        if (request.resourceId() == null || request.resourceId() <= 0) {
            throw new IllegalArgumentException("A valid resourceId is required.");
        }
        return request.resourceId();
    }

    private void requireContext(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule())) {
            throw new IllegalArgumentException("Kiosk context does not belong to Petty Cash.");
        }
    }

    private boolean blank(Object value) {
        return value == null || String.valueOf(value).isBlank();
    }
}
