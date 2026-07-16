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
public class BudgetLineAttachmentService {

    private final BudgetLineAttachmentRepository repository;
    private final ObjectStorageService objectStorageService;
    private final ObjectStorageProperties objectStorageProperties;

    public BudgetLineAttachmentService(
            BudgetLineAttachmentRepository repository,
            ObjectStorageService objectStorageService,
            ObjectStorageProperties objectStorageProperties) {
        this.repository = repository;
        this.objectStorageService = objectStorageService;
        this.objectStorageProperties = objectStorageProperties;
    }

    @Transactional(readOnly = true)
    public ExpenseAttachmentListResponse list(FinanceContext context, long budgetLineId) {
        requireBudgetLine(context, budgetLineId);
        var items = repository.list(context.companyId(), budgetLineId).stream()
                .map(row -> row.toResponse(signedUrl(row.objectKey())))
                .toList();
        return new ExpenseAttachmentListResponse(items, items.size());
    }

    @Transactional
    public PresignedExpenseAttachmentResponse presignUpload(
            FinanceContext context,
            long budgetLineId,
            ExpenseAttachmentUploadRequest request) {
        requireBudgetLine(context, budgetLineId);
        requireStorageEnabled();
        ExpenseAttachmentRules.validateAttachmentSize(request.sizeBytes());
        var mimeType = ExpenseAttachmentRules.normalizeContentType(request.contentType());
        var fileName = ExpenseAttachmentRules.normalizeFileName(request.fileName());
        var objectKey = ExpenseAttachmentRules.buildBudgetLineObjectKey(
                context.companyId(), budgetLineId, fileName, mimeType);
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
            long budgetLineId,
            RegisterExpenseAttachmentRequest request) {
        requireBudgetLine(context, budgetLineId);
        requireStorageEnabled();
        ExpenseAttachmentRules.validateAttachmentSize(request.sizeBytes());
        var objectKey = ExpenseAttachmentRules.normalizeBudgetLineObjectKey(
                context.companyId(), budgetLineId, request.objectKey());
        var mimeType = ExpenseAttachmentRules.normalizeContentType(request.mimeType());
        var fileName = ExpenseAttachmentRules.normalizeFileName(request.originalFilename());
        if (!objectStorageService.objectExists(documentsBucket(), objectKey)) {
            throw FinanceApiException.badRequest("objectKey does not reference an uploaded budget line attachment.");
        }
        var row = repository.insert(context, budgetLineId, fileName, mimeType, request.sizeBytes(), objectKey);
        return row.toResponse(signedUrl(row.objectKey()));
    }

    @Transactional
    public void delete(FinanceContext context, long budgetLineId, long attachmentId) {
        requireBudgetLine(context, budgetLineId);
        var row = repository.findById(context.companyId(), budgetLineId, attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found."));
        if (!repository.softDelete(context, budgetLineId, attachmentId)) {
            throw new NoSuchElementException("Attachment not found.");
        }
        deleteObjectQuietly(row.objectKey());
    }

    private void requireBudgetLine(FinanceContext context, long budgetLineId) {
        if (!repository.budgetLineExists(context, budgetLineId)) {
            throw new NoSuchElementException("Budget line not found.");
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
