package com.indice.erp.finance.budgets;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.BudgetStatus;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock
    private BudgetRepository repository;

    @Mock
    private FinanceAccessService accessService;

    @Test
    void getReturnsCompanyScopedBudgetFromRepository() {
        var service = service();
        var context = BudgetTestData.context();
        when(repository.findById(context, 99L)).thenReturn(Optional.of(BudgetTestData.record(99L, "FY 2026")));

        var response = service.get(context, 99L);

        assertEquals(99L, response.id());
        assertEquals(7L, response.companyId());
        assertEquals("FY 2026", response.name());
    }

    @Test
    void createDefaultsStatusAndNormalizesCurrency() {
        var service = service();
        var context = BudgetTestData.context();
        var command = ArgumentCaptor.forClass(BudgetCommand.class);
        var start = LocalDate.parse("2026-01-01");
        var end = LocalDate.parse("2026-12-31");
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.insert(eq(context), command.capture())).thenReturn(BudgetTestData.record(10L, "FY 2026"));

        var response = service.create(context, BudgetTestData.createRequest(" FY 2026 ", start, end));

        assertEquals(10L, response.id());
        assertEquals("FY 2026", command.getValue().name());
        assertEquals("MXN", command.getValue().currencyCode());
        assertEquals(BudgetStatus.ACTIVE, command.getValue().status());
        assertEquals(1L, command.getValue().createdByUserId());
        verify(repository).existsByNameAndPeriod(context, "FY 2026", start, end, null);
    }

    @Test
    void updatePersistsMutableBudgetFields() {
        var service = service();
        var context = BudgetTestData.context();
        var start = LocalDate.parse("2026-04-01");
        var end = LocalDate.parse("2026-06-30");
        var current = BudgetTestData.record(11L, "FY 2026");
        var command = ArgumentCaptor.forClass(BudgetCommand.class);
        when(repository.findById(context, 11L)).thenReturn(Optional.of(current), Optional.of(current));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(11L), command.capture())).thenReturn(true);

        service.update(context, 11L, BudgetTestData.updateRequest("Q2 2026", start, end, BudgetStatus.CLOSED));

        assertEquals("Q2 2026", command.getValue().name());
        assertEquals(BudgetStatus.CLOSED, command.getValue().status());
        assertEquals(1L, command.getValue().updatedByUserId());
        verify(repository).existsByNameAndPeriod(context, "Q2 2026", start, end, 11L);
    }

    @Test
    void createRejectsDuplicateNameAndPeriod() {
        var service = service();
        var context = BudgetTestData.context();
        var start = LocalDate.parse("2026-01-01");
        var end = LocalDate.parse("2026-12-31");
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByNameAndPeriod(context, "FY 2026", start, end, null)).thenReturn(true);

        var error = assertThrows(FinanceApiException.class, () ->
            service.create(context, BudgetTestData.createRequest("FY 2026", start, end)));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void deleteSoftDeletesExistingBudget() {
        var service = service();
        var context = BudgetTestData.context();
        when(repository.findById(context, 12L)).thenReturn(Optional.of(BudgetTestData.record(12L, "FY 2026")));
        when(repository.softDelete(context, 12L)).thenReturn(true);

        assertTrue(service.delete(context, 12L).success());
        verify(repository).softDelete(context, 12L);
    }

    @Test
    void createRejectsOutOfScopeBusinessBeforePersistence() {
        var service = service();
        var context = new FinanceContext(1L, 7L, "Scoped User", "user", true, FinanceScope.businessOffice(5L, 9L));
        var request = new com.indice.erp.finance.budgets.dto.CreateBudgetRequest(
            5L, 10L, "FY 2026", "Budget", LocalDate.parse("2026-01-01"),
            LocalDate.parse("2026-12-31"), "MXN", null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verify(repository, never()).insert(any(), any());
    }

    private BudgetService service() {
        return new BudgetService(repository, new BudgetMapper(), new BudgetValidator(accessService));
    }
}
