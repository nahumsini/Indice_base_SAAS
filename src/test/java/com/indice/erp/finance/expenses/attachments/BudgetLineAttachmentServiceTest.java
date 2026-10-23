package com.indice.erp.finance.expenses.attachments;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.finance.expenses.attachments.dto.ExpenseAttachmentUploadRequest;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BudgetLineAttachmentServiceTest {

    @Mock
    private BudgetLineAttachmentRepository repository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private CompanyStorageMeter storageMeter;

    @Mock
    private com.indice.erp.finance.attachments.FinanceAttachmentSealer sealer;

    private BudgetLineAttachmentService service;
    private ObjectStorageProperties properties;

    @BeforeEach
    void setUp() {
        properties = new ObjectStorageProperties();
        properties.getMinio().setBucketDocuments("documents");
        service = new BudgetLineAttachmentService(
                repository,
                objectStorageService,
                properties,
                storageMeter, sealer);
    }

    @Test
    void presignUploadUsesBudgetLineStoragePrefix() {
        var context = context();
        when(repository.budgetLineExists(context, 99L)).thenReturn(true);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(sealer.presign(
                eq(7L), eq("BUDGET_LINE"), eq(99L), eq("documents"), anyString(),
                eq("application/pdf"), eq(1024L), eq(900)))
                .thenAnswer(invocation -> new PresignedUpload(
                        invocation.getArgument(4),
                        "https://storage.example/upload",
                        Instant.parse("2026-07-16T18:00:00Z"),
                        Map.of("Content-Type", "application/pdf")));

        var response = service.presignUpload(
                context,
                99L,
                new ExpenseAttachmentUploadRequest("Renta julio.pdf", "application/pdf", 1024L));

        assertTrue(response.objectKey().startsWith("finance/budget-lines/7/99/attachments/"));
        assertTrue(response.objectKey().endsWith("-renta-julio.pdf"));
        assertEquals("https://storage.example/upload", response.uploadUrl());
    }

    @Test
    void registerPersistsUploadedBudgetLineAttachment() {
        var context = context();
        var objectKey = "finance/budget-lines/7/99/attachments/file-renta.pdf";
        var sealedKey = objectKey + "/sealed/final";
        var row = new ExpenseAttachmentRow(
                15L,
                "Renta.pdf",
                "application/pdf",
                2048L,
                sealedKey,
                1L,
                "Finance User",
                "2026-07-16T18:00:00Z");
        when(repository.budgetLineExists(context, 99L)).thenReturn(true);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(sealer.seal(7L, "BUDGET_LINE", 99L, "documents", objectKey, "application/pdf", 2048L))
            .thenReturn(new com.indice.erp.finance.attachments.FinanceAttachmentSealer.Sealed(sealedKey, "a".repeat(64)));
        when(repository.insert(context, 99L, "Renta.pdf", "application/pdf", 2048L, sealedKey)).thenReturn(row);
        when(objectStorageService.presignDownload("documents", sealedKey, 900))
                .thenReturn("https://storage.example/download");

        var response = service.register(
                context,
                99L,
                new RegisterExpenseAttachmentRequest(objectKey, "Renta.pdf", "application/pdf", 2048L));

        assertEquals(15L, response.id());
        assertEquals("https://storage.example/download", response.downloadUrl());
        verify(repository).insert(context, 99L, "Renta.pdf", "application/pdf", 2048L, sealedKey);
        assertEquals(sealedKey, response.objectKey());
        verify(repository).storeDigest(7L, 15L, "a".repeat(64));
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "admin", true, FinanceScope.corporateOffice());
    }
}
