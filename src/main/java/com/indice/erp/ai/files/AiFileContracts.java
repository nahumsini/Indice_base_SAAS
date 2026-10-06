package com.indice.erp.ai.files;

import java.time.Instant;
import java.util.List;

/** Binary content is never part of a confirmation, execution record or audit event. */
public final class AiFileContracts {
    private AiFileContracts() { }
    public enum Purpose {
        employee_document, announcement_attachment, asset_photo, hr_record_attachment,
        my_hr_permission_attachment, hr_permission_attachment, task_evidence,
        inventory_product_image, sale_payment_evidence, sales_contract_attachment,
        supplier_invoice_attachment, pos_receipt_attachment
    }
    public record StageRequest(Purpose purpose, Long targetId, String documentType, String fileName,
                               String mimeType, String contentBase64, String idempotencyKey) {
        @Override public String toString(){return "StageRequest[purpose="+purpose+", targetId="+targetId+", binary=REDACTED, retryKey=REDACTED]";}
    }
    public record Staged(String stagedFileId, Purpose purpose, long targetId, String documentType,
                         String fileName, String mimeType, long sizeBytes, String sha256, Instant expiresAt) { }
    public record AttachRequest(String stagedFileId) { }
    public record Prepared(String action, Staged file, String targetName, String previousFileName,
                           String targetVersion) { }
    public record Preview(String action, String confirmationToken, Instant expiresAt, boolean requiresConfirmation,
                          Staged file, String targetName, String previousFileName, List<String> effects) { }
    public record Attached(Purpose purpose, long targetId, long attachmentId, String fileName,
                           String mimeType, long sizeBytes, String sha256) { }
    public record Committed(String action, boolean replayed, String correlationId, Attached result) { }
    public record CommitRequest(String confirmationToken, String idempotencyKey) { }
    public record ReadRequest(Purpose purpose, Long targetId, Long attachmentId) { }
    public record ExportRequest(Long runId, String format) { }
    public record FileContent(String uri, String fileName, String mimeType, long sizeBytes,
                              String sha256, String contentBase64) {
        @Override public String toString(){return "FileContent[mimeType="+mimeType+", sizeBytes="+sizeBytes+", binary=REDACTED]";}
    }
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) { super("Prepare the current file operation again."); this.code=code; }
        public String code() { return code; }
    }
}
