package com.indice.erp.finance.expenses.attachments;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.attachments.dto.RegisterExpenseAttachmentRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExpenseAttachmentServiceTest {

    @Mock
    private ExpenseAttachmentRepository repository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private CompanyStorageMeter storageMeter;

    private ExpenseAttachmentService service;

    @BeforeEach
    void setUp() {
        var properties = new ObjectStorageProperties();
        properties.getMinio().setBucketDocuments("documents");
        service = new ExpenseAttachmentService(repository, objectStorageService, properties, storageMeter);
    }

    @Test
    void registerPersistsPaymentEvidenceContext() {
        var context = new FinanceContext(1L, 7L, "Finance User", "admin", true, FinanceScope.corporateOffice());
        var objectKey = "finance/expenses/7/99/attachments/payment.pdf";
        var amount = new BigDecimal("250.00");
        var paymentDate = LocalDate.of(2026, 8, 5);
        var row = new ExpenseAttachmentRow(
                15L,
                "payment.pdf",
                "application/pdf",
                2048L,
                objectKey,
                1L,
                "Finance User",
                amount,
                paymentDate,
                81L,
                "2026-08-05T18:00:00Z");
        when(repository.expenseExists(context, 99L)).thenReturn(true);
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(objectStorageService.objectExists("documents", objectKey)).thenReturn(true);
        when(repository.insert(
                context, 99L, "payment.pdf", "application/pdf", 2048L, objectKey,
                amount, paymentDate, 81L)).thenReturn(row);
        when(objectStorageService.presignDownload("documents", objectKey, 900))
                .thenReturn("https://storage.example/download");

        var response = service.register(
                context,
                99L,
                new RegisterExpenseAttachmentRequest(
                        objectKey, "payment.pdf", "application/pdf", 2048L,
                        amount, paymentDate, 81L));

        assertEquals(amount, response.paymentAmount());
        assertEquals(paymentDate, response.paymentDate());
        assertEquals(81L, response.paymentAccountId());
        verify(repository).insert(
                context, 99L, "payment.pdf", "application/pdf", 2048L, objectKey,
                amount, paymentDate, 81L);
    }

    @Test
    void registerRejectsIncompletePaymentEvidenceContext() {
        var context = new FinanceContext(1L, 7L, "Finance User", "admin", true, FinanceScope.corporateOffice());
        when(repository.expenseExists(context, 99L)).thenReturn(true);

        var exception = assertThrows(FinanceApiException.class, () -> service.register(
                context,
                99L,
                new RegisterExpenseAttachmentRequest(
                        "finance/expenses/7/99/attachments/payment.pdf",
                        "payment.pdf",
                        "application/pdf",
                        2048L,
                        new BigDecimal("250.00"),
                        null,
                        null)));

        assertEquals(
                "Payment evidence requires paymentAmount, paymentDate and paymentAccountId.",
                exception.getMessage());
    }
}
