package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.BudgetHealthStatus;
import com.indice.erp.finance.status.BudgetStatus;
import java.math.BigDecimal;
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
class BudgetLineServiceTest {

    @Mock
    private BudgetLineRepository repository;

    @Mock
    private FinanceAccessService accessService;

    @Mock
    private BudgetLineReferenceValidator referenceValidator;

    @Test
    void getReturnsCompanyScopedBudgetLineFromRepository() {
        var service = service();
        var context = BudgetLineTestData.context();
        when(repository.findById(context, 99L))
            .thenReturn(Optional.of(BudgetLineTestData.record(99L, "Software", new BigDecimal("1000.00"))));

        var response = service.get(context, 99L);

        assertEquals(99L, response.id());
        assertEquals(7L, response.companyId());
        assertEquals("Software", response.name());
        assertEquals(0, response.attachmentCount());
    }

    @Test
    void createDerivesAvailableAmountAndHealthStatus() {
        var service = service();
        var context = BudgetLineTestData.context();
        var command = ArgumentCaptor.forClass(BudgetLineCommand.class);
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.insert(eq(context), command.capture()))
            .thenReturn(BudgetLineTestData.record(10L, "Software", new BigDecimal("1000.00")));

        var response = service.create(context,
            BudgetLineTestData.createRequest(" Software ", new BigDecimal("1000.00")));

        assertEquals(10L, response.id());
        assertEquals(new BigDecimal("1000.00"), command.getValue().availableAmount());
        assertEquals(BudgetHealthStatus.ON_TRACK, command.getValue().healthStatus());
        assertEquals("MXN", command.getValue().currencyCode());
        assertEquals(1L, command.getValue().createdByUserId());
    }

    @Test
    void updateRecalculatesDerivedFieldsFromExistingConsumption() {
        var service = service();
        var context = BudgetLineTestData.context();
        var command = ArgumentCaptor.forClass(BudgetLineCommand.class);
        var current = BudgetLineTestData.record(11L, "Software", new BigDecimal("1000.00"),
            new BigDecimal("850.00"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        when(repository.findById(context, 11L)).thenReturn(Optional.of(current), Optional.of(current));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(11L), command.capture())).thenReturn(true);

        service.update(context, 11L,
            BudgetLineTestData.updateRequest("Software", new BigDecimal("1000.00"), BudgetStatus.ACTIVE));

        assertEquals(new BigDecimal("150.00"), command.getValue().availableAmount());
        assertEquals(BudgetHealthStatus.WARNING, command.getValue().healthStatus());
        verify(repository).existsByName(context, "Software", 11L);
    }

    @Test
    void custodyTransfersDoNotConsumeBudgetTwice() {
        var available = BudgetLineAmounts.availableAmount(new BigDecimal("1000.00"), new BigDecimal("300.00"),
            new BigDecimal("100.00"), new BigDecimal("200.00"), new BigDecimal("50.00"));

        assertEquals(new BigDecimal("600.00"), available);
        assertEquals(BudgetHealthStatus.ON_TRACK,
            BudgetLineAmounts.healthStatus(new BigDecimal("1000.00"), available));
        assertEquals(BudgetHealthStatus.EXCEEDED,
            BudgetLineAmounts.healthStatus(new BigDecimal("1000.00"), new BigDecimal("-1.00")));
    }

    @Test
    void createRejectsDuplicateNameBeforePersistence() {
        var service = service();
        var context = BudgetLineTestData.context();
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByName(context, "Software", null)).thenReturn(true);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context,
            BudgetLineTestData.createRequest("Software", new BigDecimal("1000.00"))));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void createRejectsDerivedFieldsBeforePersistence() {
        var service = service();
        var context = BudgetLineTestData.context();
        var request = new com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest(
            null, null, 20L, "Software", "SOFTWARE", new BigDecimal("1000.00"),
            BigDecimal.ONE, null, null, null, null, null, "MXN", null, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void deleteSoftDeletesExistingBudgetLine() {
        var service = service();
        var context = BudgetLineTestData.context();
        when(repository.findById(context, 12L))
            .thenReturn(Optional.of(BudgetLineTestData.record(12L, "Software", new BigDecimal("1000.00"))));
        when(repository.softDelete(context, 12L)).thenReturn(true);

        assertTrue(service.delete(context, 12L).success());
        verify(repository).softDelete(context, 12L);
    }

    @Test
    void createRejectsOutOfScopeBusinessBeforePersistence() {
        var service = service();
        var context = new FinanceContext(1L, 7L, "Scoped User", "user", true, FinanceScope.businessOffice(5L, 9L));
        var request = new com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest(
            5L, 10L, 20L, "Software", "SOFTWARE", new BigDecimal("1000.00"),
            null, null, null, null, null, null, "MXN", null, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    private BudgetLineService service() {
        return new BudgetLineService(
            repository,
            new BudgetLineMapper(),
            new BudgetLineValidator(accessService),
            referenceValidator
        );
    }
}
