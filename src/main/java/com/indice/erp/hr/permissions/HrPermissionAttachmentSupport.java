package com.indice.erp.hr.permissions;

import com.indice.erp.hr.shared.HrPayloadUtils;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class HrPermissionAttachmentSupport {

    private static final long MAX_ATTACHMENT_SIZE_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
    );

    private HrPermissionAttachmentSupport() {
    }

    public static AttachmentDraft attachmentDraft(Map<String, Object> payload) {
        var fileName = normalizeFileName(HrPayloadUtils.stringValue(payload, "file_name", "fileName", "original_filename"));
        var contentType = normalizeContentType(HrPayloadUtils.stringValue(payload, "content_type", "contentType", "mime_type"));
        var sizeBytes = requireSize(HrPayloadUtils.parseLong(payload, "size_bytes", "sizeBytes"));
        return new AttachmentDraft(fileName, contentType, sizeBytes);
    }

    public static String normalizeObjectKey(long companyId, long requestId, String objectKey) {
        var normalized = HrPayloadUtils.safe(objectKey).trim();
        var prefix = "hr/permissions/" + companyId + "/" + requestId + "/attachments/";
        if (normalized.isBlank() || !normalized.startsWith(prefix)) {
            throw new IllegalArgumentException("object_key is invalid.");
        }
        return normalized;
    }

    public static String buildObjectKey(long companyId, long requestId, String originalFileName, LocalDate today) {
        var extension = fileExtension(originalFileName);
        return "hr/permissions/%d/%d/attachments/%d/%02d/%02d/%s-%s%s".formatted(
            companyId,
            requestId,
            today.getYear(),
            today.getMonthValue(),
            today.getDayOfMonth(),
            UUID.randomUUID(),
            safeFileStem(originalFileName),
            extension
        );
    }

    private static String normalizeFileName(String value) {
        var normalized = HrPayloadUtils.safe(value).trim().replace("\\", "/");
        normalized = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("file_name is required.");
        }
        return normalized.length() <= 255 ? normalized : normalized.substring(0, 255);
    }

    private static String normalizeContentType(String value) {
        var normalized = HrPayloadUtils.safe(value).trim().toLowerCase(Locale.ROOT);
        normalized = "image/jpg".equals(normalized) ? "image/jpeg" : normalized;
        if (!ALLOWED_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("content_type is invalid.");
        }
        return normalized;
    }

    private static long requireSize(Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (value > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments must be 10MB or smaller.");
        }
        return value;
    }

    private static String safeFileStem(String originalFileName) {
        var dotIndex = originalFileName.lastIndexOf('.');
        var stem = dotIndex > 0 ? originalFileName.substring(0, dotIndex) : originalFileName;
        var normalized = Normalizer.normalize(stem, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9_-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "")
            .toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return "attachment";
        }
        var bytes = normalized.getBytes(StandardCharsets.UTF_8);
        return bytes.length <= 60 ? normalized : new String(bytes, 0, 60, StandardCharsets.UTF_8).replaceAll("-+$", "");
    }

    private static String fileExtension(String originalFileName) {
        var dotIndex = originalFileName.lastIndexOf('.');
        return dotIndex < 0 ? "" : originalFileName.substring(dotIndex).toLowerCase(Locale.ROOT);
    }

    public record AttachmentDraft(String fileName, String contentType, long sizeBytes) {
    }
}
