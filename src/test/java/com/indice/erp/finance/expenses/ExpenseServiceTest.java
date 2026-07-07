package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.BudgetLineRollupService;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseStatusRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock
    private ExpenseRepository repository;

    @Mock
    private ExpenseWorkflowRepository workflowRepository;

    @Mock
    private BudgetLineRollupService budgetLineRollupService;

    @Mock
    private FinanceAccessService accessService;

    @Mock
    private ExpenseReferenceValidator referenceValidator;

    @Test
    void getReturnsCompanyScopedExpenseFromRepository() {
        var service = service();
        var context = context();
        when(repository.findById(context, 99L)).thenReturn(Optional.of(record(99L, ExpenseStatus.DRAFT, "Rent")));

        var response = service.get(context, 99L);

        assertEquals(99L, response.id());
        assertEquals(7L, response.companyId());
        assertEquals("Rent", response.concept());
    }

    @Test
    void createDraftDerivesPaymentFieldsAndAuditActors() {
        var service = service();
        var context = context();
        var request = createRequest(null, null, "EXP-001");
        var command = ArgumentCaptor.forClass(ExpenseDraftCommand.class);

        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.insert(eq(context), command.capture()))
            .thenReturn(record(10L, ExpenseStatus.DRAFT, "Office supplies"));

        var response = service.createDraft(context, request);

        assertEquals(10L, response.id());
        assertEquals(ExpenseStatus.DRAFT, response.status());
        assertEquals(PaymentStatus.UNPAID, response.paymentStatus());
        assertEquals(BigDecimal.ZERO, command.getValue().paidAmount());
        assertEquals(new BigDecimal("116.00"), command.getValue().balanceAmount());
        assertEquals(1L, command.getValue().requestedByUserId());
        assertEquals(1L, command.getValue().createdByUserId());
        verify(referenceValidator).validateCreate(eq(context), any(ExpenseScopedAssignment.class), eq(request));
    }

    @Test
    void createDraftRejectsOutOfScopeBusinessAssignmentBeforePersistence() {
        var service = service();
        var context = new FinanceContext(
            1L, 7L, "Scoped User", "user", true, FinanceScope.businessOffice(5L, 9L));
        var request = createRequest(5L, 10L, "EXP-002");

        var error = assertThrows(FinanceApiException.class, () -> service.createDraft(context, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void updateDraftRejectsTerminalRecords() {
        var service = service();
        var context = context();
        var request = updateRequest(null, null, "EXP-003");
        when(repository.findById(context, 11L))
            .thenReturn(Optional.of(record(11L, ExpenseStatus.CANCELLED, "Cancelled expense")));

        var error = assertThrows(FinanceApiException.class, () -> service.updateDraft(context, 11L, request));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).update(any(), eq(11L), any());
    }

    @Test
    void updateDraftPersistsValidatedApprovedChanges() {
        var service = service();
        var context = context();
        var request = updateRequest(null, null, "EXP-003");
        var command = ArgumentCaptor.forClass(ExpenseDraftCommand.class);
        var existing = recordWithPayment(11L, ExpenseStatus.APPROVED, "Approved expense",
            new BigDecimal("25.00"), new BigDecimal("91.00"));
        var updated = recordWithPayment(11L, ExpenseStatus.APPROVED, "Updated supplies",
            new BigDecimal("25.00"), new BigDecimal("91.00"));

        when(repository.findById(context, 11L)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(11L), command.capture())).thenReturn(true);

        var response = service.updateDraft(context, 11L, request);

        assertEquals("Updated supplies", response.concept());
        assertEquals(new BigDecimal("25.00"), command.getValue().paidAmount());
        assertEquals(new BigDecimal("91.00"), command.getValue().balanceAmount());
        verify(referenceValidator).validateUpdate(eq(context), any(ExpenseScopedAssignment.class), eq(request));
        verify(repository).update(eq(context), eq(11L), any());
    }

    @Test
    void updateDraftPersistsValidatedDraftChanges() {
        var service = service();
        var context = context();
        var request = updateRequest(null, null, "EXP-004");
        var command = ArgumentCaptor.forClass(ExpenseDraftCommand.class);
        var updated = record(12L, ExpenseStatus.DRAFT, "Updated supplies");

        when(repository.findById(context, 12L))
            .thenReturn(Optional.of(record(12L, ExpenseStatus.DRAFT, "Old supplies")), Optional.of(updated));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(12L), command.capture())).thenReturn(true);

        var response = service.updateDraft(context, 12L, request);

        assertEquals("Updated supplies", response.concept());
        assertEquals(1L, command.getValue().requestedByUserId());
        assertEquals(2L, command.getValue().approvedByUserId());
        assertEquals(3L, command.getValue().performedByUserId());
        verify(referenceValidator).validateUpdate(eq(context), any(ExpenseScopedAssignment.class), eq(request));
        verify(repository).update(eq(context), eq(12L), any());
    }

    @Test
    void deleteDraftSoftDeletesDraftRecordsOnly() {
        var service = service();
        var context = context();
        when(repository.findById(context, 13L)).thenReturn(Optional.of(record(13L, ExpenseStatus.DRAFT, "Draft")));
        when(repository.softDelete(context, 13L)).thenReturn(true);

        var response = service.deleteDraft(context, 13L);

        assertTrue(response.success());
        verify(repository).softDelete(context, 13L);
    }

    @Test
    void approveMovesPendingExpenseToApprovedWithApprover() {
        var service = service();
        var context = context();
        when(repository.findById(context, 20L))
            .thenReturn(Optional.of(record(20L, ExpenseStatus.PENDING_APPROVAL, "Pending")))
            .thenReturn(Optional.of(record(20L, ExpenseStatus.APPROVED, "Pending")));
        when(workflowRepository.transitionStatus(
            eq(context),
            eq(20L),
            eq(java.util.List.of(ExpenseStatus.PENDING_APPROVAL)),
            eq(ExpenseStatus.APPROVED),
            eq(PaymentStatus.UNPAID),
            eq(1L),
            eq(null),
            eq(null)
        )).thenReturn(true);

        var response = service.approve(context, 20L);

        assertEquals(ExpenseStatus.APPROVED, response.status());
        verify(budgetLineRollupService).refreshExpenseImpact(context, 44L);
        verify(workflowRepository).transitionStatus(
            eq(context),
            eq(20L),
            eq(java.util.List.of(ExpenseStatus.PENDING_APPROVAL)),
            eq(ExpenseStatus.APPROVED),
            eq(PaymentStatus.UNPAID),
            eq(1L),
            eq(null),
            eq(null)
        );
    }

    @Test
    void recordPaymentDerivesPartialPaymentAmounts() {
        var service = service();
        var context = context();
        when(repository.findById(context, 21L))
            .thenReturn(Optional.of(record(21L, ExpenseStatus.APPROVED, "Approved")))
            .thenReturn(Optional.of(recordWithPayment(21L, ExpenseStatus.PARTIALLY_PAID, "Approved",
                new BigDecimal("50.00"), new BigDecimal("66.00"))));
        when(workflowRepository.recordPayment(
            context,
            21L,
            new BigDecimal("50.00"),
            new BigDecimal("66.00"),
            ExpenseStatus.PARTIALLY_PAID,
            PaymentStatus.PARTIALLY_PAID,
            81L,
            LocalDate.of(2026, 6, 15)
        )).thenReturn(true);
        when(workflowRepository.adjustPaymentAccountBalance(context, 81L, new BigDecimal("-50.00"))).thenReturn(true);

        var response = service.recordPayment(context, 21L,
            new RecordExpensePaymentRequest(new BigDecimal("50.00"), 81L, LocalDate.of(2026, 6, 15)));

        assertEquals(ExpenseStatus.PARTIALLY_PAID, response.status());
        assertEquals(new BigDecimal("50.00"), response.paidAmount());
        assertEquals(new BigDecimal("66.00"), response.balanceAmount());
        verify(referenceValidator).validatePaymentAccountForPayment(context, 81L, "MXN");
        verify(workflowRepository).adjustPaymentAccountBalance(context, 81L, new BigDecimal("-50.00"));
        verify(budgetLineRollupService).refreshExpenseImpact(context, 44L);
    }

    @Test
    void recordPaymentDerivesFullPaymentAmounts() {
        var service = service();
        var context = context();
        when(repository.findById(context, 22L))
            .thenReturn(Optional.of(record(22L, ExpenseStatus.APPROVED, "Approved")))
            .thenReturn(Optional.of(recordWithPaymentStatus(22L, ExpenseStatus.PAID, PaymentStatus.PAID, "Approved",
                new BigDecimal("116.00"), new BigDecimal("0.00"))));
        when(workflowRepository.recordPayment(
            context,
            22L,
            new BigDecimal("116.00"),
            new BigDecimal("0.00"),
            ExpenseStatus.PAID,
            PaymentStatus.PAID,
            81L,
            LocalDate.of(2026, 6, 16)
        )).thenReturn(true);
        when(workflowRepository.adjustPaymentAccountBalance(context, 81L, new BigDecimal("-116.00"))).thenReturn(true);

        var response = service.recordPayment(context, 22L,
            new RecordExpensePaymentRequest(new BigDecimal("116.00"), 81L, LocalDate.of(2026, 6, 16)));

        assertEquals(ExpenseStatus.PAID, response.status());
        assertEquals(PaymentStatus.PAID, response.paymentStatus());
        assertEquals(new BigDecimal("116.00"), response.paidAmount());
        assertEquals(new BigDecimal("0.00"), response.balanceAmount());
        verify(workflowRepository).adjustPaymentAccountBalance(context, 81L, new BigDecimal("-116.00"));
    }

    @Test
    void recordPaymentRejectsAmountsAboveBalance() {
        var service = service();
        var context = context();
        when(repository.findById(context, 23L))
            .thenReturn(Optional.of(recordWithPayment(23L, ExpenseStatus.PARTIALLY_PAID, "Partial",
                new BigDecimal("50.00"), new BigDecimal("66.00"))));

        var error = assertThrows(FinanceApiException.class, () -> service.recordPayment(context, 23L,
            new RecordExpensePaymentRequest(new BigDecimal("70.00"), 81L, LocalDate.of(2026, 6, 17))));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verify(workflowRepository, never()).recordPayment(any(), eq(23L), any(), any(), any(), any(), any(), any());
        verify(workflowRepository, never()).adjustPaymentAccountBalance(any(), eq(81L), any());
    }

    @Test
    void updateStatusToOverduePreservesExistingPaymentAmounts() {
        var service = service();
        var context = context();
        var existing = recordWithPayment(24L, ExpenseStatus.PARTIALLY_PAID, "Partial",
            new BigDecimal("30.00"), new BigDecimal("86.00"));
        var updated = recordWithPaymentStatus(24L, ExpenseStatus.PARTIALLY_PAID, PaymentStatus.OVERDUE, "Partial",
            new BigDecimal("30.00"), new BigDecimal("86.00"));

        when(repository.findById(context, 24L)).thenReturn(Optional.of(existing), Optional.of(updated));
        when(workflowRepository.applyManualStatus(
            context,
            24L,
            new BigDecimal("30.00"),
            new BigDecimal("86.00"),
            ExpenseStatus.PARTIALLY_PAID,
            PaymentStatus.OVERDUE,
            null,
            null,
            null
        )).thenReturn(true);

        var response = service.updateStatus(context, 24L,
            new UpdateExpenseStatusRequest("overdue", null, LocalDate.of(2026, 6, 18)));

        assertEquals(ExpenseStatus.PARTIALLY_PAID, response.status());
        assertEquals(PaymentStatus.OVERDUE, response.paymentStatus());
        assertEquals(new BigDecimal("30.00"), response.paidAmount());
        assertEquals(new BigDecimal("86.00"), response.balanceAmount());
    }

    @Test
    void listNormalizesOverduePaymentsBeforeReturningRows() {
        var service = service();
        var context = context();
        when(repository.findAll(context)).thenReturn(java.util.List.of(record(25L, ExpenseStatus.APPROVED, "Due expense")));

        var response = service.list(context);

        assertEquals(1, response.count());
        verify(workflowRepository).markOverduePayments(eq(context), any(LocalDate.class));
        verify(repository).findAll(context);
    }

    private ExpenseService service() {
        return new ExpenseService(
            repository,
            workflowRepository,
            budgetLineRollupService,
            new ExpenseMapper(),
            new ExpenseValidator(accessService),
            referenceValidator
        );
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }

    private CreateExpenseRequest createRequest(Long unitId, Long businessId, String folio) {
        return new CreateExpenseRequest(
            unitId,
            businessId,
            null,
            44L,
            null,
            null,
            null,
            folio,
            "Office supplies",
            "Monthly office supplies",
            ExpenseType.VARIABLE,
            new BigDecimal("100.00"),
            new BigDecimal("16.00"),
            new BigDecimal("116.00"),
            "mxn",
            LocalDate.of(2026, 6, 8),
            LocalDate.of(2026, 6, 30),
            null,
            null,
            null,
            null,
            null
        );
    }

    private UpdateExpenseRequest updateRequest(Long unitId, Long businessId, String folio) {
        return new UpdateExpenseRequest(
            unitId,
            businessId,
            null,
            null,
            null,
            null,
            null,
            folio,
            "Updated supplies",
            "Updated office supplies",
            ExpenseType.VARIABLE,
            new BigDecimal("100.00"),
            new BigDecimal("16.00"),
            new BigDecimal("116.00"),
            "MXN",
            LocalDate.of(2026, 6, 9),
            LocalDate.of(2026, 6, 30),
            null,
            2L,
            3L,
            null,
            null
        );
    }

    private ExpenseRecord record(long id, ExpenseStatus status, String concept) {
        return recordWithPayment(id, status, concept, BigDecimal.ZERO, new BigDecimal("116.00"));
    }

    private ExpenseRecord recordWithPayment(
            long id,
            ExpenseStatus status,
            String concept,
            BigDecimal paidAmount,
            BigDecimal balanceAmount) {
        var paymentStatus = paidAmount.compareTo(BigDecimal.ZERO) > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.UNPAID;
        return recordWithPaymentStatus(id, status, paymentStatus, concept, paidAmount, balanceAmount);
    }

    private ExpenseRecord recordWithPaymentStatus(
            long id,
            ExpenseStatus status,
            PaymentStatus paymentStatus,
            String concept,
            BigDecimal paidAmount,
            BigDecimal balanceAmount) {
        return new ExpenseRecord(
            id,
            7L,
            null,
            null,
            null,
            44L,
            null,
            null,
            null,
            "EXP-" + id,
            concept,
            "Description",
            ExpenseType.VARIABLE,
            new BigDecimal("100.00"),
            new BigDecimal("16.00"),
            new BigDecimal("116.00"),
            paidAmount,
            balanceAmount,
            "MXN",
            LocalDate.of(2026, 6, 8),
            LocalDate.of(2026, 6, 30),
            null,
            null,
            1L,
            null,
            null,
            status,
            paymentStatus,
            null,
            0,
            1L,
            null,
            Instant.parse("2026-06-08T23:00:00Z"),
            null,
            null,
            0L,
            null,
            null
        );
    }
}
