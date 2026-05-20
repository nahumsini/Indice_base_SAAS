package com.indice.erp.hr.announcements;

import com.indice.erp.hr.shared.HrPayloadUtils;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class AnnFileSupport {

    private static final long MAX_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png"
    );

    private AnnFileSupport() {
    }

    public static FileDraft draft(Map<String, Object> payload) {
        var fileName = fileName(HrPayloadUtils.stringValue(payload, "file_name", "fileName", "original_filename"));
        var contentType = contentType(HrPayloadUtils.stringValue(payload, "content_type", "contentType", "mime_type"));
        var sizeBytes = size(HrPayloadUtils.parseLong(payload, "size_bytes", "sizeBytes"));
        return new FileDraft(fileName, contentType, sizeBytes);
    }

    public static String objectKey(long companyId, long announcementId, String fileName, LocalDate today) {
        return "hr/announcements/%d/%d/attachments/%d/%02d/%02d/%s-%s%s".formatted(
            companyId,
            announcementId,
            today.getYear(),
            today.getMonthValue(),
            today.getDayOfMonth(),
            UUID.randomUUID(),
            safeStem(fileName),
            extension(fileName)
        );
    }

    public static String normalizeKey(long companyId, long announcementId, String objectKey) {
        var normalized = HrPayloadUtils.safe(objectKey).trim();
        var prefix = "hr/announcements/" + companyId + "/" + announcementId + "/attachments/";
        if (normalized.isBlank() || !normalized.startsWith(prefix)) {
            throw new IllegalArgumentException("object_key is invalid.");
        }
        return normalized;
    }

    private static String fileName(String value) {
        var normalized = HrPayloadUtils.safe(value).trim().replace("\\", "/");
        normalized = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("file_name is required.");
        }
        return normalized.length() <= 255 ? normalized : normalized.substring(0, 255);
    }

    private static String contentType(String value) {
        var normalized = HrPayloadUtils.safe(value).trim().toLowerCase(Locale.ROOT);
        normalized = "image/jpg".equals(normalized) ? "image/jpeg" : normalized;
        if (!ALLOWED_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("content_type is invalid.");
        }
        return normalized;
    }

    private static long size(Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (value > MAX_BYTES) {
            throw new IllegalArgumentException("Attachments must be 10MB or smaller.");
        }
        return value;
    }

    private static String safeStem(String fileName) {
        var dot = fileName.lastIndexOf('.');
        var stem = dot > 0 ? fileName.substring(0, dot) : fileName;
        var safe = Normalizer.normalize(stem, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^A-Za-z0-9_-]+", "-")
            .replaceAll("-{2,}", "-")
            .replaceAll("^-|-$", "");
        return safe.isBlank() ? "attachment" : safe;
    }

    private static String extension(String fileName) {
        var dot = fileName.lastIndexOf('.');
        return dot > -1 && dot < fileName.length() - 1 ? fileName.substring(dot).toLowerCase(Locale.ROOT) : ".bin";
    }

    public record FileDraft(String fileName, String contentType, long sizeBytes) {
    }
}
