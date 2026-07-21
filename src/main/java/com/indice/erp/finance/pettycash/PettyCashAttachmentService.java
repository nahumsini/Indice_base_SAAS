package com.indice.erp.finance.pettycash;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PettyCashAttachmentService {

    private static final long MAX_ATTACHMENT_SIZE_BYTES = 10L * 1024L * 1024L;

    private final JdbcTemplate jdbcTemplate;
    private final PettyCashRepository repository;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final CompanyStorageMeter storageMeter;

    public PettyCashAttachmentService(
            JdbcTemplate jdbcTemplate,
            PettyCashRepository repository,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties objectStorageProperties,
            CompanyStorageMeter storageMeter) {
        this.jdbcTemplate = jdbcTemplate;
        this.repository = repository;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
        this.storageMeter = storageMeter;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listAttachments(FinanceContext context, long fundId, long settlementLineId) {
        requireSettlementLine(context, fundId, settlementLineId);
        var rows = loadAttachments(context.companyId(), fundId, settlementLineId);
        var body = new LinkedHashMap<String, Object>();
        body.put("items", rows);
        body.put("count", rows.size());
        return body;
    }

    @Transactional
    public Map<String, Object> createAttachmentUpload(
            FinanceContext context,
            long fundId,
            long settlementLineId,
            Map<String, Object> payload) {
        requireSettlementLine(context, fundId, settlementLineId);
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var fileName = normalizeOriginalFileName(stringValue(payload, "file_name", "fileName"));
        var contentType = normalizeAttachmentContentType(
                stringValue(payload, "content_type", "contentType", "mime_type", "mimeType"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        validateAttachmentSize(sizeBytes);

        var objectKey = buildAttachmentObjectKey(context.companyId(), fundId, settlementLineId, fileName, contentType);
        var upload = storageMeter.presign(
                context.companyId(),
                "PETTY_CASH",
                documentsBucket(),
                objectKey,
                contentType,
                sizeBytes,
                objectStorageProperties.getMinio().getPresignExpirySeconds());

        var body = new LinkedHashMap<String, Object>();
        body.put("object_key", upload.objectKey());
        body.put("upload_url", upload.uploadUrl());
        body.put("expires_at", upload.expiresAt());
        body.put("upload_headers", upload.uploadHeaders());
        return body;
    }

    @Transactional
    public Map<String, Object> registerAttachment(
            FinanceContext context,
            long fundId,
            long settlementLineId,
            Map<String, Object> payload) {
        var line = requireSettlementLine(context, fundId, settlementLineId);
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }

        var objectKey = normalizeAttachmentObjectKey(
                context.companyId(),
                fundId,
                settlementLineId,
                stringValue(payload, "object_key", "objectKey"));
        var fileName = normalizeOriginalFileName(
                stringValue(payload, "original_filename", "originalFileName", "file_name", "fileName"));
        var mimeType = normalizeAttachmentContentType(
                stringValue(payload, "mime_type", "mimeType", "content_type", "contentType"));
        var sizeBytes = parseLong(payload, "size_bytes", "sizeBytes");
        validateAttachmentSize(sizeBytes);

        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw new IllegalArgumentException("object_key does not reference an existing uploaded attachment.");
        }
        storageMeter.commit(context.companyId(), documentsBucket(), objectKey, sizeBytes);

        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO finance_petty_cash_settlement_line_attachments
                    (company_id, petty_cash_fund_id, petty_cash_statement_id, settlement_line_id, expense_id,
                     original_filename, mime_type, size_bytes, object_key, uploaded_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    new String[] { "id" });
            statement.setLong(1, context.companyId());
            statement.setLong(2, fundId);
            statement.setLong(3, line.pettyCashStatementId());
            statement.setLong(4, settlementLineId);
            statement.setObject(5, line.expenseId());
            statement.setString(6, fileName);
            statement.setString(7, mimeType);
            statement.setLong(8, sizeBytes);
            statement.setString(9, objectKey);
            statement.setLong(10, context.userId());
            return statement;
        }, keyHolder);

        var attachmentId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (attachmentId <= 0) {
            throw new IllegalArgumentException("Unable to register attachment.");
        }

        refreshAttachmentCounts(context, line);
        return loadAttachment(context.companyId(), fundId, settlementLineId, attachmentId);
    }

    @Transactional
    public void deleteAttachment(FinanceContext context, long fundId, long settlementLineId, long attachmentId) {
        var line = requireSettlementLine(context, fundId, settlementLineId);
        var rows = jdbcTemplate.query(
                """
                SELECT id,
                       object_key,
                       original_filename
                FROM finance_petty_cash_settlement_line_attachments
                WHERE company_id = ?
                  AND petty_cash_fund_id = ?
                  AND settlement_line_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
                (rs, rowNum) -> new AttachmentRef(
                        rs.getLong("id"),
                        safe(rs.getString("object_key")),
                        safe(rs.getString("original_filename"))),
                context.companyId(),
                fundId,
                settlementLineId,
                attachmentId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attachment not found.");
        }

        jdbcTemplate.update(
                """
                UPDATE finance_petty_cash_settlement_line_attachments
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                  AND petty_cash_fund_id = ?
                  AND settlement_line_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
                context.companyId(),
                fundId,
                settlementLineId,
                attachmentId);

        deleteAttachmentObjectQuietly(rows.getFirst().objectKey());
        storageMeter.release(context.companyId(), rows.getFirst().objectKey(), "petty_cash_attachment_deleted");
        refreshAttachmentCounts(context, line);
    }

    private PettyCashSettlementLineRecord requireSettlementLine(
            FinanceContext context,
            long fundId,
            long settlementLineId) {
        var fund = repository.findFundById(context, fundId)
            .orElseThrow(() -> new NoSuchElementException("Petty cash fund not found."));
        var line = repository.findSettlementLineById(context, settlementLineId)
            .orElseThrow(() -> new NoSuchElementException("Petty cash settlement line not found."));
        if (!line.pettyCashFundId().equals(fund.id())) {
            throw FinanceApiException.badRequest("settlementLineId does not belong to this fund.");
        }
        return line;
    }

    private void refreshAttachmentCounts(FinanceContext context, PettyCashSettlementLineRecord line) {
        var lineCount = countLineAttachments(context.companyId(), line.pettyCashFundId(), line.id());
        jdbcTemplate.update(
            """
            UPDATE finance_petty_cash_settlement_lines
            SET attachment_count = ?,
                status = CASE
                  WHEN status = 'EXPENSE_CREATED' THEN status
                  WHEN status = 'VALIDATED' AND ? > 0 THEN status
                  WHEN ? > 0 THEN 'RECEIPT_ATTACHED'
                  ELSE 'DRAFT'
                END,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            lineCount,
            lineCount,
            lineCount,
            context.userId(),
            context.companyId(),
            line.id());

        var statementCount = countStatementAttachments(context.companyId(), line.pettyCashStatementId());
        jdbcTemplate.update(
                """
                UPDATE finance_petty_cash_statements
                SET attachment_count = ?,
                    updated_by_user_id = ?,
                    version = version + 1
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
                statementCount,
                context.userId(),
                context.companyId(),
                line.pettyCashStatementId());

        if (line.expenseId() != null) {
            jdbcTemplate.update(
                    """
                    UPDATE finance_expenses
                    SET attachment_count = ?,
                        updated_by_user_id = ?,
                        version = version + 1
                    WHERE company_id = ?
                      AND id = ?
                      AND deleted_at IS NULL
                    """,
                    lineCount,
                    context.userId(),
                    context.companyId(),
                    line.expenseId());
        }
    }

    private int countLineAttachments(long companyId, long fundId, long settlementLineId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_petty_cash_settlement_line_attachments
                WHERE company_id = ?
                  AND petty_cash_fund_id = ?
                  AND settlement_line_id = ?
                  AND deleted_at IS NULL
                """,
                Integer.class,
                companyId,
                fundId,
                settlementLineId);
        return count == null ? 0 : count;
    }

    private int countStatementAttachments(long companyId, long statementId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_petty_cash_settlement_line_attachments
                WHERE company_id = ?
                  AND petty_cash_statement_id = ?
                  AND deleted_at IS NULL
                """,
                Integer.class,
                companyId,
                statementId);
        return count == null ? 0 : count;
    }

    private java.util.List<Map<String, Object>> loadAttachments(long companyId, long fundId, long settlementLineId) {
        return jdbcTemplate.query(
                """
                SELECT attachment.id,
                       attachment.original_filename,
                       attachment.mime_type,
                       attachment.size_bytes,
                       attachment.object_key,
                       attachment.uploaded_by_user_id,
                       COALESCE(
                           NULLIF(TRIM(uploaded_user.full_name), ''),
                           NULLIF(TRIM(uploaded_user.email), ''),
                           NULL
                       ) AS resolved_uploaded_by_name,
                       attachment.created_at
                FROM finance_petty_cash_settlement_line_attachments attachment
                LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                WHERE attachment.company_id = ?
                  AND attachment.petty_cash_fund_id = ?
                  AND attachment.settlement_line_id = ?
                  AND attachment.deleted_at IS NULL
                ORDER BY attachment.id ASC
                """,
                (rs, rowNum) -> mapAttachmentRow(rs),
                companyId,
                fundId,
                settlementLineId);
    }

    private Map<String, Object> loadAttachment(long companyId, long fundId, long settlementLineId, long attachmentId) {
        var rows = jdbcTemplate.query(
                """
                SELECT attachment.id,
                       attachment.original_filename,
                       attachment.mime_type,
                       attachment.size_bytes,
                       attachment.object_key,
                       attachment.uploaded_by_user_id,
                       COALESCE(
                           NULLIF(TRIM(uploaded_user.full_name), ''),
                           NULLIF(TRIM(uploaded_user.email), ''),
                           NULL
                       ) AS resolved_uploaded_by_name,
                       attachment.created_at
                FROM finance_petty_cash_settlement_line_attachments attachment
                LEFT JOIN users uploaded_user ON uploaded_user.id = attachment.uploaded_by_user_id
                WHERE attachment.company_id = ?
                  AND attachment.petty_cash_fund_id = ?
                  AND attachment.settlement_line_id = ?
                  AND attachment.id = ?
                  AND attachment.deleted_at IS NULL
                """,
                (rs, rowNum) -> mapAttachmentRow(rs),
                companyId,
                fundId,
                settlementLineId,
                attachmentId);

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Attachment not found.");
        }
        return rows.getFirst();
    }

    private Map<String, Object> mapAttachmentRow(ResultSet rs) throws SQLException {
        var attachment = new LinkedHashMap<String, Object>();
        var objectKey = safe(rs.getString("object_key"));
        attachment.put("id", rs.getLong("id"));
        attachment.put("original_filename", safe(rs.getString("original_filename")));
        attachment.put("mime_type", safe(rs.getString("mime_type")));
        attachment.put("size_bytes", rs.getLong("size_bytes"));
        attachment.put("object_key", objectKey);
        attachment.put("uploaded_by_user_id", rs.getObject("uploaded_by_user_id", Long.class));
        attachment.put("uploaded_by_name", rs.getString("resolved_uploaded_by_name"));
        attachment.put("download_url", signedAttachmentUrl(objectKey));
        var createdAt = rs.getTimestamp("created_at");
        attachment.put("created_at", createdAt == null ? null : createdAt.toInstant().toString());
        return attachment;
    }

    private void validateAttachmentSize(Long sizeBytes) {
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new IllegalArgumentException("size_bytes is required.");
        }
        if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments must be 10MB or smaller.");
        }
    }

    private String normalizeAttachmentContentType(String value) {
        var normalized = safe(value).trim().toLowerCase(Locale.ROOT);
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
            default -> throw new IllegalArgumentException("Unsupported attachment type.");
        };
    }

    private String normalizeOriginalFileName(String value) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("file_name is required.");
        }
        return normalized.length() > 255 ? normalized.substring(0, 255) : normalized;
    }

    private String buildAttachmentObjectKey(
            long companyId,
            long fundId,
            long settlementLineId,
            String originalFileName,
            String contentType) {
        return "finance/petty-cash/"
                + companyId
                + "/funds/"
                + fundId
                + "/settlement-lines/"
                + settlementLineId
                + "/attachments/"
                + UUID.randomUUID().toString().replace("-", "")
                + "-"
                + sanitizeFileNameStem(originalFileName)
                + extensionForAttachmentContentType(contentType);
    }

    private String normalizeAttachmentObjectKey(
            long companyId,
            long fundId,
            long settlementLineId,
            String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("object_key is required.");
        }

        var normalized = objectKey.trim();
        var expectedPrefix = "finance/petty-cash/"
                + companyId
                + "/funds/"
                + fundId
                + "/settlement-lines/"
                + settlementLineId
                + "/attachments/";
        if (!normalized.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("object_key must match the expected petty cash attachment upload prefix.");
        }
        return normalized;
    }

    private String extensionForAttachmentContentType(String contentType) {
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

    private String sanitizeFileNameStem(String originalFileName) {
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

    private String signedAttachmentUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }
        return objectStorageService.presignDownload(
                documentsBucket(),
                objectKey,
                objectStorageProperties.getMinio().getPresignExpirySeconds());
    }

    private void deleteAttachmentObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }
        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Attachment metadata deletion should not fail because the object is already missing.
        }
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }

    private String stringValue(Map<String, Object> payload, String key, String... aliases) {
        var value = payload == null ? null : payload.get(key);
        if (value == null && aliases != null) {
            for (var alias : aliases) {
                if (payload != null && payload.containsKey(alias)) {
                    value = payload.get(alias);
                    break;
                }
            }
        }
        if (value == null) {
            throw new IllegalArgumentException(key + " is required.");
        }
        return String.valueOf(value);
    }

    private Long parseLong(Map<String, Object> payload, String key, String... aliases) {
        Object value = payload == null ? null : payload.get(key);
        if (value == null && aliases != null) {
            for (var alias : aliases) {
                if (payload != null && payload.containsKey(alias)) {
                    value = payload.get(alias);
                    break;
                }
            }
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(key + " must be numeric.");
            }
        }
        return null;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private record AttachmentRef(long id, String objectKey, String fileName) {
    }
}
