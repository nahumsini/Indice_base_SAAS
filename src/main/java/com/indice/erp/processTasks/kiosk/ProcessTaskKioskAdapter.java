package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskEmployeeToolCatalogService;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ProcessTaskKioskAdapter implements KioskModuleAdapter {

    private static final Set<String> EMPLOYEE_TAB_PERMISSIONS = Set.of("processes.calendar");
    private static final Set<String> PROCESS_TAB_PERMISSIONS = Set.of("processes.processes");
    private static final Set<String> LEGACY_CAPABILITY_KEYS = Set.of(
        ProcessTaskKioskCapabilities.IDENTITY_VERIFY,
        ProcessTaskKioskCapabilities.TASKS_READ,
        ProcessTaskKioskCapabilities.TASK_CREATE,
        ProcessTaskKioskCapabilities.TASK_COMPLETE,
        ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN,
        ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN,
        ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER
    );
    private static final Set<String> NATIVE_CAPABILITY_KEYS = Set.of(
        ProcessTaskKioskCapabilities.TASKS_READ,
        ProcessTaskKioskCapabilities.TASK_CREATE,
        ProcessTaskKioskCapabilities.TASK_COMPLETE,
        ProcessTaskKioskCapabilities.TASK_AGENDA_UPDATE,
        ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN,
        ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER,
        ProcessTaskKioskCapabilities.OCCASIONAL_PROCESSES_READ,
        ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_PREVIEW,
        ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_CREATE
    );
    private static final Set<String> OCCASIONAL_PROCESS_CAPABILITY_KEYS = Set.of(
        ProcessTaskKioskCapabilities.OCCASIONAL_PROCESSES_READ,
        ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_PREVIEW,
        ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_CREATE
    );

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
    public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        var allowedKeys = isNativeEmployeeTasksTool(definition)
            ? NATIVE_CAPABILITY_KEYS : LEGACY_CAPABILITY_KEYS;
        return capabilities().stream()
            .filter(capability -> allowedKeys.contains(capability.key()))
            .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        requireContext(context);
        return kioskService.publicBootstrap(context.accessReference());
    }

    @Override
    public boolean supportsEmployeeCenter(KioskResolvedDefinition definition) {
        return isNativeEmployeeTasksTool(definition)
            || (definition != null && definition.legacyReferenceId() != null
                && definition.legacyReferenceId() > 0);
    }

    @Override
    public Set<String> employeeCenterTabPermissionKeys(
            KioskResolvedDefinition definition) {
        return EMPLOYEE_TAB_PERMISSIONS;
    }

    @Override
    public Set<String> employeeCapabilityTabPermissionKeys(
            KioskResolvedDefinition definition,
            KioskCapabilityDescriptor capability) {
        if (ProcessTaskKioskCapabilities.IDENTITY_VERIFY.equals(capability.key())) {
            return Set.of();
        }
        return OCCASIONAL_PROCESS_CAPABILITY_KEYS.contains(capability.key())
            ? PROCESS_TAB_PERMISSIONS : EMPLOYEE_TAB_PERMISSIONS;
    }

    @Override
    public Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
        requireEmployeeContext(context);
        requireGrantedEmployeeCapability(context, ProcessTaskKioskCapabilities.TASKS_READ);
        var body = new LinkedHashMap<>(
            kioskService.employeeBootstrap(context.definition(), context.session().identityId()));
        if (isNativeEmployeeTasksTool(context.definition())
                && hasGrantedEmployeeCapability(
                    context, ProcessTaskKioskCapabilities.OCCASIONAL_PROCESSES_READ)) {
            body.put("occasional_processes", kioskService.employeeOccasionalProcesses(
                context.definition(), context.session().identityId()));
        }
        return body;
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
        if (Set.of(
                ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_PREVIEW,
                ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_CREATE
            ).contains(request.capabilityKey()) && blank(payload.get("process_id"))) {
            return KioskValidationResult.invalid("process_id is required.");
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

    @Override
    public Map<String, Object> executeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        requireEmployeeContext(context);
        ProcessTaskKioskCapabilities.require(request.capabilityKey());
        if (isNativeEmployeeTasksTool(context.definition())
                && !NATIVE_CAPABILITY_KEYS.contains(request.capabilityKey())) {
            throw new SecurityException(
                "Process capability is not available for this employee tool.");
        }
        requireGrantedEmployeeCapability(context, request.capabilityKey());
        var userId = context.session().identityId();
        return switch (request.capabilityKey()) {
            case ProcessTaskKioskCapabilities.TASKS_READ -> Map.of(
                "items", kioskService.employeeBootstrap(context.definition(), userId).get("tasks"));
            case ProcessTaskKioskCapabilities.TASK_CREATE ->
                kioskService.employeeCreateTask(context.definition(), userId, request.payload());
            case ProcessTaskKioskCapabilities.TASK_COMPLETE ->
                kioskService.employeeCompleteTask(
                    context.definition(), userId, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_AGENDA_UPDATE ->
                kioskService.employeeUpdateTaskAgenda(
                    context.definition(), userId, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_RESPONSIBLE_ASSIGN ->
                kioskService.employeeAssignTaskResponsible(
                    context.definition(), userId, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_ATTACHMENT_PRESIGN ->
                kioskService.employeeCreateAttachmentUpload(
                    context.definition(), userId, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.TASK_ATTACHMENT_REGISTER ->
                kioskService.employeeRegisterAttachment(
                    context.definition(), userId, requireResourceId(request), request.payload());
            case ProcessTaskKioskCapabilities.OCCASIONAL_PROCESSES_READ ->
                kioskService.employeeOccasionalProcesses(context.definition(), userId);
            case ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_PREVIEW ->
                kioskService.employeePreviewOccasionalProcess(
                    context.definition(), userId, request.payload());
            case ProcessTaskKioskCapabilities.OCCASIONAL_PROCESS_CREATE ->
                kioskService.employeeCreateOccasionalProcess(
                    context.definition(), userId, request.payload());
            default -> throw new IllegalArgumentException(
                "Unsupported employee process-task capability: " + request.capabilityKey());
        };
    }

    private void requireEmployeeContext(KioskExecutionContext context) {
        requireContext(context);
        if (!KioskExecutionChannels.isEmployeeChannel(context.channel())
                || context.definition() == null || context.session() == null
                || !"USER".equals(context.session().identityType())) {
            throw new SecurityException("Authenticated employee kiosk session is required.");
        }
    }

    private boolean isNativeEmployeeTasksTool(KioskResolvedDefinition definition) {
        return definition != null
            && ProcessTaskKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && KioskEmployeeToolCatalogService.MY_TASKS_KIOSK_TYPE.equals(definition.kioskType())
            && KioskEmployeeToolCatalogService.MY_TASKS_RESERVED_CODE.equals(definition.code())
            && definition.legacyReferenceId() == null;
    }

    private void requireGrantedEmployeeCapability(KioskExecutionContext context, String capabilityKey) {
        var versionedCapability = ProcessTaskKioskCapabilities.require(capabilityKey).versionedKey();
        var grantedCapabilities = context.session().grantedCapabilities();
        if (grantedCapabilities == null || !grantedCapabilities.contains(versionedCapability)) {
            throw new SecurityException("Kiosk capability is not granted: " + versionedCapability + ".");
        }
    }

    private boolean hasGrantedEmployeeCapability(KioskExecutionContext context, String capabilityKey) {
        var grantedCapabilities = context.session().grantedCapabilities();
        return grantedCapabilities != null
            && grantedCapabilities.contains(ProcessTaskKioskCapabilities.require(capabilityKey).versionedKey());
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
