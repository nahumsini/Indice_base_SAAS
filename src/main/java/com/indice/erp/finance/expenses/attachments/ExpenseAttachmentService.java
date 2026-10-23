package com.indice.erp.finance.expenses.attachments;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentListResponse;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentResponse;
import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.PresignedExpenseAttachmentResponse;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseAttachmentService {

    private final ExpenseAttachmentRepository repository;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;
    private final CompanyStorageMeter storageMeter;
    private final com.indice.erp.finance.attachments.FinanceAttachmentSealer sealer;

    public ExpenseAttachmentService(
            ExpenseAttachmentRepository repository,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties objectStorageProperties,
            CompanyStorageMeter storageMeter, com.indice.erp.finance.attachments.FinanceAttachmentSealer sealer) {
        this.repository = repository;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
        this.storageMeter = storageMeter;
        this.sealer = sealer;
    }

    @Transactional(readOnly = true)
    public java.util.List<com.indice.erp.storage.OperationalFileReference> references(FinanceContext context,long id) {
        requireExpense(context,id);
        return repository.list(context.companyId(),id).stream().map(row->new com.indice.erp.storage.OperationalFileReference(row.id(),row.originalFilename(),row.mimeType(),row.sizeBytes(),row.objectKey())).toList();
    }

    @Transactional(readOnly = true)
    public ExpenseAttachmentListResponse list(FinanceContext context, long expenseId) {
        requireExpense(context, expenseId);
        var items = repository.list(context.companyId(), expenseId).stream()
                .map(row -> row.toResponse(signedUrl(row.objectKey())))
                .toList();
        return new ExpenseAttachmentListResponse(items, items.size());
    }

    /** Provider-safe payment evidence projection; never exposes object keys, accounts or actors. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> providerPaymentEvidence(
            long companyId, long providerId, long expenseId) {
        if (!repository.providerOwnsExpense(companyId, providerId, expenseId)) {
            throw new SecurityException("Payment evidence is unavailable for this provider.");
        }
        return repository.list(companyId, expenseId).stream()
            .filter(row -> row.paymentAmount() != null && row.paymentDate() != null)
            .map(row -> {
                var result = new LinkedHashMap<String, Object>();
                result.put("attachment_id", row.id());
                result.put("file_name", row.originalFilename());
                result.put("mime_type", row.mimeType());
                result.put("size_bytes", row.sizeBytes());
                result.put("payment_amount", row.paymentAmount());
                result.put("payment_date", row.paymentDate().toString());
                var downloadUrl = signedUrl(row.objectKey());
                result.put("download_available", downloadUrl != null);
                if (downloadUrl != null) result.put("download_url", downloadUrl);
                return Collections.unmodifiableMap(result);
            })
            .toList();
    }

    @Transactional
    public PresignedExpenseAttachmentResponse presignUpload(
            FinanceContext context,
            long expenseId,
            ExpenseAttachmentUploadRequest request) {
        requireExpense(context, expenseId);
        requireStorageEnabled();
        ExpenseAttachmentRules.validateAttachmentSize(request.sizeBytes());

        var mimeType = ExpenseAttachmentRules.normalizeContentType(request.contentType());
        var fileName = ExpenseAttachmentRules.normalizeFileName(request.fileName());
        var objectKey = ExpenseAttachmentRules.buildObjectKey(context.companyId(), expenseId, fileName, mimeType);
        var upload = sealer.presign(
                context.companyId(), "EXPENSE", expenseId,
                documentsBucket(),
                objectKey,
                mimeType,
                request.sizeBytes(),
                objectStorageProperties.getMinio().getPresignExpirySeconds());

        return new PresignedExpenseAttachmentResponse(
                upload.objectKey(),
                upload.uploadUrl(),
                upload.expiresAt(),
                upload.uploadHeaders());
    }

    @Transactional
    public ExpenseAttachmentResponse register(
            FinanceContext context,
            long expenseId,
            RegisterExpenseAttachmentRequest request) {
        requireExpense(context, expenseId);
        validatePaymentContext(request);
        requireStorageEnabled();
        ExpenseAttachmentRules.validateAttachmentSize(request.sizeBytes());

        var objectKey = ExpenseAttachmentRules.normalizeObjectKey(context.companyId(), expenseId, request.objectKey());
        var mimeType = ExpenseAttachmentRules.normalizeContentType(request.mimeType());
        var fileName = ExpenseAttachmentRules.normalizeFileName(request.originalFilename());
        var sealed = sealer.seal(context.companyId(), "EXPENSE", expenseId, documentsBucket(),
                objectKey, mimeType, request.sizeBytes());
        var existing = repository.findByObjectKey(context.companyId(), expenseId, sealed.key());
        if (existing.isPresent()) {
            var previous = existing.get();
            if (!previous.originalFilename().equals(fileName) || !java.util.Objects.equals(previous.paymentAmount(), request.paymentAmount())
                    || !java.util.Objects.equals(previous.paymentDate(), request.paymentDate())
                    || !java.util.Objects.equals(previous.paymentAccountId(), request.paymentAccountId())) {
                throw FinanceApiException.badRequest("Attachment upload has already been registered with different metadata.");
            }
            return previous.toResponse(signedUrl(previous.objectKey()));
        }

        var row = repository.insert(context, expenseId, fileName, mimeType, request.sizeBytes(), sealed.key(),
                request.paymentAmount(), request.paymentDate(), request.paymentAccountId());
        repository.storeDigest(context.companyId(), row.id(), sealed.sha256());
        repository.refreshExpenseAttachmentCount(context, expenseId);
        return row.toResponse(signedUrl(row.objectKey()));
    }

    private void validatePaymentContext(RegisterExpenseAttachmentRequest request) {
        var hasAnyPaymentContext = request.paymentAmount() != null
                || request.paymentDate() != null
                || request.paymentAccountId() != null;
        var hasCompletePaymentContext = request.paymentAmount() != null
                && request.paymentDate() != null
                && request.paymentAccountId() != null;
        if (hasAnyPaymentContext && !hasCompletePaymentContext) {
            throw FinanceApiException.badRequest(
                    "Payment evidence requires paymentAmount, paymentDate and paymentAccountId.");
        }
    }

    @Transactional
    public void delete(FinanceContext context, long expenseId, long attachmentId) {
        requireExpense(context, expenseId);
        var row = repository.findById(context.companyId(), expenseId, attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found."));
        if (!repository.softDelete(context, expenseId, attachmentId)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        if (!repository.objectKeyIsReferencedByPettyCash(context.companyId(), row.objectKey())) {
            deleteObjectQuietly(row.objectKey());
            storageMeter.release(context.companyId(), row.objectKey(), "expense_attachment_deleted");
        }
        repository.refreshExpenseAttachmentCount(context, expenseId);
    }

    private void requireExpense(FinanceContext context, long expenseId) {
        if (!repository.expenseExists(context, expenseId)) {
            throw new NoSuchElementException("Expense not found.");
        }
    }

    private void requireStorageEnabled() {
        if (!objectStorageService.isEnabled()) {
            throw new ObjectStorageDisabledException("Object storage is not enabled.");
        }
    }

    private String signedUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return null;
        }
        return objectStorageService.presignDownload(
                documentsBucket(),
                objectKey,
                objectStorageProperties.getMinio().getPresignExpirySeconds());
    }

    private void deleteObjectQuietly(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || !objectStorageService.isEnabled()) {
            return;
        }
        try {
            objectStorageService.deleteObject(documentsBucket(), objectKey);
        } catch (RuntimeException ignored) {
            // Metadata deletion should not fail because the storage object is already missing.
        }
    }

    private String documentsBucket() {
        return objectStorageProperties.getMinio().getBucketDocuments();
    }
}
