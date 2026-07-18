package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ProcessTaskKioskAdapter implements KioskModuleAdapter {

    private final ProcessTaskKioskService kioskService;

    public ProcessTaskKioskAdapter(ProcessTaskKioskService kioskService) {
        this.kioskService = kioskService;
    }

    @Override
    public String ownerModule() {
        return ProcessTaskKioskCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return ProcessTaskKioskCapabilities.descriptors();
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
        var payload = request.payload();
        if (request.capabilityKey().endsWith(".identity.verify")
                && blank(payload.get("credential_payload")) && blank(payload.get("pin"))) {
            return KioskValidationResult.invalid("credential_payload is required.");
        }
        if (ProcessTaskKioskCapabilities.TASK_CREATE.equals(request.capabilityKey())
                && blank(payload.get("title"))) {
            return KioskValidationResult.invalid("title is required.");
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        ProcessTaskKioskCapabilities.require(request.capabilityKey());
        var token = context.accessReference();

        return switch (request.capabilityKey()) {
            case ProcessTaskKioskCapabilities.IDENTITY_VERIFY -> kioskService.publicIdentify(token, request.payload());
            case ProcessTaskKioskCapabilities.TASKS_READ -> kioskService.publicTasks(token, request.payload());
            case ProcessTaskKioskCapabilities.TASK_CREATE -> kioskService.publicCreateTask(token, request.payload());
            case ProcessTaskKioskCapabilities.TASK_COMPLETE -> kioskService.publicCompleteTask(
                token, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN -> kioskService.publicAssignTaskResponsible(
                token, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN -> kioskService.publicCreateAttachmentUpload(
                token, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER -> kioskService.publicRegisterAttachment(
                token, requireResourceId(request), request.payload());
            default -> throw new IllegalArgumentException(
                "Unsupported process-task kiosk capability: " + request.capabilityKey());
        };
    }

    private void requireContext(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule())) {
            throw new IllegalArgumentException("Kiosk context does not belong to Processes and Tasks.");
        }
    }

    private long requireResourceId(KioskActionRequest request) {
        if (request.resourceId() == null || request.resourceId() <= 0) {
            throw new IllegalArgumentException("A valid resourceId is required for " + request.capabilityKey() + ".");
        }
        return request.resourceId();
    }

    private boolean blank(Object value) {
        return value == null || String.valueOf(value).isBlank();
    }
}
