package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class ProcessTaskKioskCapabilities {

    public static final String OWNER_MODULE = "PROCESS_TASKS";
    public static final String IDENTITY_VERIFY = "process-tasks.identity.verify";
    public static final String TASKS_READ = "process-tasks.tasks.read";
    public static final String TASK_CREATE = "process-tasks.task.create";
    public static final String TASK_COMPLETE = "process-tasks.task.complete";
    public static final String TASK_RESPONSIBLE_ASSIGN = "process-tasks.task.responsible.assign";
    public static final String TASK_ATTACHMENT_PRESIGN = "process-tasks.task.attachment.presign";
    public static final String TASK_ATTACHMENT_REGISTER = "process-tasks.task.attachment.register";

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        descriptor(IDENTITY_VERIFY, KioskOperationPolicy.DIRECT, false, true),
        descriptor(TASKS_READ, KioskOperationPolicy.INFORMATION_ONLY, false, false),
        descriptor(TASK_CREATE, KioskOperationPolicy.DIRECT, true, false),
        descriptor(TASK_COMPLETE, KioskOperationPolicy.DIRECT, true, false),
        descriptor(TASK_RESPONSIBLE_ASSIGN, KioskOperationPolicy.DIRECT, true, false),
        fileDescriptor(TASK_ATTACHMENT_PRESIGN, true),
        fileDescriptor(TASK_ATTACHMENT_REGISTER, true)
    );

    private static final Map<String, KioskCapabilityDescriptor> BY_KEY = indexDescriptors();

    private ProcessTaskKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    public static KioskCapabilityDescriptor require(String key) {
        var descriptor = BY_KEY.get(key);
        if (descriptor == null) {
            throw new IllegalArgumentException("Unsupported process-task kiosk capability: " + key);
        }
        return descriptor;
    }

    private static KioskCapabilityDescriptor descriptor(
            String key,
            KioskOperationPolicy policy,
            boolean mutation,
            boolean sensitive) {
        return new KioskCapabilityDescriptor(
            key,
            1,
            OWNER_MODULE,
            policy,
            KioskAccessLevel.CONTROLLED,
            mutation,
            sensitive
        );
    }

    private static KioskCapabilityDescriptor fileDescriptor(String key, boolean mutation) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            mutation, false,
            Map.of("required", java.util.List.of("resource_id", "file_name", "content_type", "size_bytes")),
            Map.of("type", "task-attachment"),
            Map.of(
                "mimeTypes", java.util.List.of(
                    "application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp",
                    "image/heic", "image/heif", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-excel",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "text/csv", "text/plain"),
                "extensions", java.util.List.of(
                    ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".heic", ".heif",
                    ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"),
                "maxSizeBytes", 10L * 1024L * 1024L,
                "maxFiles", 5,
                "purpose", "task-evidence",
                "functionalDestination", "process_task_attachments",
                "evidenceRequired", false,
                "retentionOwner", "PROCESS_TASKS"
            )
        );
    }

    private static Map<String, KioskCapabilityDescriptor> indexDescriptors() {
        var descriptors = new LinkedHashMap<String, KioskCapabilityDescriptor>();
        DESCRIPTORS.forEach(descriptor -> descriptors.put(descriptor.key(), descriptor));
        return Map.copyOf(descriptors);
    }
}
