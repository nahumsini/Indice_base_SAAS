package com.indice.erp.finance.expenses.attachments;

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
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseAttachmentService {

    private final ExpenseAttachmentRepository repository;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public ExpenseAttachmentService(
            ExpenseAttachmentRepository repository,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties objectStorageProperties) {
        this.repository = repository;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    @Transactional(readOnly = true)
    public ExpenseAttachmentListResponse list(FinanceContext context, long expenseId) {
        requireExpense(context, expenseId);
        var items = repository.list(context.companyId(), expenseId).stream()
                .map(row -> row.toResponse(signedUrl(row.objectKey())))
                .toList();
        return new ExpenseAttachmentListResponse(items, items.size());
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
        var upload = objectStorageService.presignUpload(
                documentsBucket(),
                objectKey,
                mimeType,
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
        requireStorageEnabled();
        ExpenseAttachmentRules.validateAttachmentSize(request.sizeBytes());

        var objectKey = ExpenseAttachmentRules.normalizeObjectKey(context.companyId(), expenseId, request.objectKey());
        var mimeType = ExpenseAttachmentRules.normalizeContentType(request.mimeType());
        var fileName = ExpenseAttachmentRules.normalizeFileName(request.originalFilename());
        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw FinanceApiException.badRequest("objectKey does not reference an uploaded expense attachment.");
        }

        var row = repository.insert(context, expenseId, fileName, mimeType, request.sizeBytes(), objectKey);
        repository.refreshExpenseAttachmentCount(context, expenseId);
        return row.toResponse(signedUrl(row.objectKey()));
    }

    @Transactional
    public void delete(FinanceContext context, long expenseId, long attachmentId) {
        requireExpense(context, expenseId);
        var row = repository.findById(context.companyId(), expenseId, attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found."));
        if (!repository.softDelete(context, expenseId, attachmentId)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        deleteObjectQuietly(row.objectKey());
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
