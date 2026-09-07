package com.indice.erp.finance.receivables;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReceivableReceiptService {
    private final JdbcTemplate jdbc;
    private final ReceivablesRepository receivables;
    private final ObjectStorageService storage;
    private final ObjectStorageProperties properties;
    private final CompanyStorageMeter meter;

    public ReceivableReceiptService(JdbcTemplate jdbc, ReceivablesRepository receivables,
            ObjectStorageService storage, ObjectStorageProperties properties, CompanyStorageMeter meter) {
        this.jdbc = jdbc; this.receivables = receivables; this.storage = storage; this.properties = properties; this.meter = meter;
    }

    @Transactional
    public UploadResponse presign(FinanceContext context, UploadRequest request) {
        receivables.findReceivableAccount(context, request.receivableId(), LocalDate.now())
            .orElseThrow(() -> FinanceApiException.notFound("Receivable account not found."));
        validate(request.fileName(), request.contentType(), request.sizeBytes());
        String key = prefix(context.companyId(), request.receivableId()) + UUID.randomUUID();
        var upload = meter.presign(context.companyId(), "RECEIVABLES", bucket(), key, request.contentType(),
            request.sizeBytes(), properties.getMinio().getPresignExpirySeconds());
        return new UploadResponse(upload.objectKey(), upload.uploadUrl(), upload.expiresAt(), upload.uploadHeaders());
    }

    void register(FinanceContext context, long receivableId, long paymentId, ReceiptInput receipt) {
        if (receipt == null) return;
        validate(receipt.fileName(), receipt.contentType(), receipt.sizeBytes());
        if (receipt.objectKey() == null || !receipt.objectKey().matches(java.util.regex.Pattern.quote(prefix(context.companyId(), receivableId)) + "[0-9a-fA-F-]{36}")) {
            throw FinanceApiException.badRequest("Receipt upload does not belong to this receivable.");
        }
        var metadata = storage.objectMetadata(bucket(), receipt.objectKey());
        if (metadata.sizeBytes() != receipt.sizeBytes() || !receipt.contentType().equals(metadata.contentType())) {
            throw FinanceApiException.badRequest("Receipt size or content type differs from the uploaded object.");
        }
        if (!validSignature(receipt.contentType(), storage.readObjectPrefix(bucket(), receipt.objectKey(), 16))) {
            throw FinanceApiException.badRequest("Receipt content does not match its declared file type.");
        }
        meter.commit(context.companyId(), bucket(), receipt.objectKey(), receipt.sizeBytes());
        int changed = jdbc.update("""
            UPDATE finance_receivable_payments SET receipt_object_key = ?, receipt_file_name = ?, receipt_mime_type = ?, receipt_size_bytes = ?
            WHERE company_id = ? AND receivable_id = ? AND id = ? AND receipt_object_key IS NULL
            """, receipt.objectKey(), receipt.fileName().trim(), receipt.contentType(), receipt.sizeBytes(), context.companyId(), receivableId, paymentId);
        if (changed != 1) throw FinanceApiException.conflict("The payment receipt is already registered.");
    }

    @Transactional(readOnly = true)
    public String download(FinanceContext context, long paymentId) {
        var args = new ArrayList<Object>(); args.add(context.companyId()); args.add(paymentId);
        if (!context.scope().isCorporateOffice()) args.add(context.scope().businessId() != null ? context.scope().businessId() : context.scope().unitId());
        String key = jdbc.query("""
            SELECT payment.receipt_object_key FROM finance_receivable_payments payment
            JOIN finance_receivable_accounts account ON account.company_id = payment.company_id AND account.id = payment.receivable_id
            WHERE payment.company_id = ? AND payment.id = ? AND account.deleted_at IS NULL AND
            """ + FinanceSqlSupport.scopePredicate("account", context.scope()), (rs, row) -> rs.getString(1), args.toArray())
            .stream().filter(java.util.Objects::nonNull).findFirst().orElseThrow(() -> FinanceApiException.notFound("Payment receipt not found."));
        return storage.presignDownload(bucket(), key, properties.getMinio().getPresignExpirySeconds());
    }

    private static void validate(String fileName, String contentType, long size) {
        if (fileName == null || fileName.isBlank() || fileName.length() > 255 || fileName.chars().anyMatch(c -> c < 32)
                || contentType == null || !Set.of("application/pdf", "image/jpeg", "image/png", "image/webp").contains(contentType)
                || size < 1 || size > 10485760) throw FinanceApiException.badRequest("Select a PDF, JPEG, PNG or WebP receipt up to 10 MB.");
    }
    static boolean validSignature(String type, byte[] bytes) {
        if (bytes == null || bytes.length < 4) return false;
        return switch (type) {
            case "application/pdf" -> starts(bytes, new byte[]{37, 80, 68, 70, 45});
            case "image/jpeg" -> starts(bytes, new byte[]{(byte)255, (byte)216, (byte)255});
            case "image/png" -> starts(bytes, new byte[]{(byte)137, 80, 78, 71, 13, 10, 26, 10});
            case "image/webp" -> bytes.length >= 12 && starts(bytes, new byte[]{82, 73, 70, 70})
                && bytes[8] == 87 && bytes[9] == 69 && bytes[10] == 66 && bytes[11] == 80;
            default -> false;
        };
    }
    private static boolean starts(byte[] value, byte[] prefix) {
        if (value.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) if (value[i] != prefix[i]) return false;
        return true;
    }
    private static String prefix(long company, long receivable) { return "companies/" + company + "/receivables/" + receivable + "/payment-receipts/"; }
    private String bucket() { return properties.getMinio().getBucketDocuments(); }
    public record UploadRequest(long receivableId, String fileName, String contentType, long sizeBytes) {}
    public record UploadResponse(String objectKey, String uploadUrl, Instant expiresAt, Map<String, String> uploadHeaders) {}
    public record ReceiptInput(String objectKey, String fileName, String contentType, long sizeBytes) {}
}
