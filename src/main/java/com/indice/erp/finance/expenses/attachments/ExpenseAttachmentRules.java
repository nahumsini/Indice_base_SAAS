package com.indice.erp.finance.expenses.attachments;

import com.indice.erp.finance.FinanceApiException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

final class ExpenseAttachmentRules {

    private static final long MAX_ATTACHMENT_SIZE_BYTES = 10L * 1024L * 1024L;

    private ExpenseAttachmentRules() {
    }

    static void validateAttachmentSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw FinanceApiException.badRequest("sizeBytes is required.");
        }
        if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            throw FinanceApiException.badRequest("Attachments must be 10MB or smaller.");
        }
    }

    static String normalizeContentType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "application/pdf" -> "application/pdf";
            case "image/png" -> "image/png";
            case "image/jpeg", "image/jpg" -> "image/jpeg";
            case "image/gif" -> "image/gif";
            case "image/webp" -> "image/webp";
            case "image/heic" -> "image/heic";
            case "image/heif" -> "image/heif";
            case "application/msword" -> "application/msword";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ->
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "application/vnd.ms-excel" -> "application/vnd.ms-excel";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ->
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "text/csv" -> "text/csv";
            case "text/plain" -> "text/plain";
            default -> throw FinanceApiException.badRequest("Unsupported attachment type.");
        };
    }

    static String normalizeFileName(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw FinanceApiException.badRequest("fileName is required.");
        }
        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    static String buildObjectKey(long companyId, long expenseId, String fileName, String mimeType) {
        return "finance/expenses/"
                + companyId
                + "/"
                + expenseId
                + "/attachments/"
                + UUID.randomUUID().toString().replace("-", "")
                + "-"
                + sanitizeFileNameStem(fileName)
                + extensionFor(mimeType);
    }

    static String normalizeObjectKey(long companyId, long expenseId, String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw FinanceApiException.badRequest("objectKey is required.");
        }
        var normalized = objectKey.trim();
        var expectedPrefix = "finance/expenses/" + companyId + "/" + expenseId + "/attachments/";
        if (!normalized.startsWith(expectedPrefix)) {
            throw FinanceApiException.badRequest("objectKey does not match the expected expense attachment prefix.");
        }
        return normalized;
    }

    private static String extensionFor(String contentType) {
        return switch (contentType) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "image/heic" -> ".heic";
            case "image/heif" -> ".heif";
            case "application/msword" -> ".doc";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            case "application/vnd.ms-excel" -> ".xls";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> ".xlsx";
            case "text/csv" -> ".csv";
            case "text/plain" -> ".txt";
            default -> ".bin";
        };
    }

    private static String sanitizeFileNameStem(String originalFileName) {
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
        if (bytes.length <= 60) {
            return normalized;
        }
        return new String(bytes, 0, 60, StandardCharsets.UTF_8).replaceAll("-+$", "");
    }
}
