package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentAccountServiceTest {

    @Mock
    private PaymentAccountRepository repository;

    @Mock
    private FinanceAccessService accessService;

    @Mock
    private PaymentAccountReferenceValidator referenceValidator;

    @Test
    void getReturnsCompanyScopedAccountFromRepository() {
        var service = service();
        var context = PaymentAccountTestData.context();
        when(repository.findById(context, 99L))
            .thenReturn(Optional.of(PaymentAccountTestData.record(99L, "Operating Cash",
                PaymentAccountStatus.ACTIVE)));

        var response = service.get(context, 99L);

        assertEquals(99L, response.id());
        assertEquals(7L, response.companyId());
        assertEquals("Operating Cash", response.name());
    }

    @Test
    void createDerivesCurrentBalanceFromOpeningBalanceAndAuditActor() {
        var service = service();
        var context = PaymentAccountTestData.context();
        var command = ArgumentCaptor.forClass(PaymentAccountCommand.class);
        var openingBalance = new BigDecimal("125.50");
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.insert(eq(context), command.capture()))
            .thenReturn(PaymentAccountTestData.record(10L, "Operating Cash", PaymentAccountStatus.ACTIVE));

        var response = service.create(context, PaymentAccountTestData.createRequest(" Operating Cash ", openingBalance));

        assertEquals(10L, response.id());
        assertEquals(openingBalance, command.getValue().openingBalance());
        assertEquals(openingBalance, command.getValue().currentBalance());
        assertEquals("MXN", command.getValue().currencyCode());
        assertEquals(1L, command.getValue().createdByUserId());
    }

    @Test
    void createRejectsDuplicateNameBeforePersistence() {
        var service = service();
        var context = PaymentAccountTestData.context();
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByName(context, "Operating Cash", null)).thenReturn(true);

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.create(context,
                PaymentAccountTestData.createRequest("Operating Cash", new BigDecimal("100.00"))));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void createRejectsCurrentBalanceFromRequestBeforePersistence() {
        var service = service();
        var context = PaymentAccountTestData.context();
        var request = new com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest(
            null, null, "Operating Cash", PaymentAccountType.CASH, "MXN", new BigDecimal("100.00"),
            new BigDecimal("200.00"), null, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void updateDoesNotUpdateBalances() {
        var service = service();
        var context = PaymentAccountTestData.context();
        var command = ArgumentCaptor.forClass(PaymentAccountCommand.class);
        when(repository.findById(context, 11L))
            .thenReturn(Optional.of(PaymentAccountTestData.record(11L, "Operating Cash",
                PaymentAccountStatus.ACTIVE)), Optional.of(PaymentAccountTestData.record(11L, "Operating Bank",
                PaymentAccountStatus.INACTIVE)));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(11L), command.capture())).thenReturn(true);

        var response = service.update(context, 11L,
            PaymentAccountTestData.updateRequest("Operating Bank", PaymentAccountStatus.INACTIVE));

        assertEquals("Operating Bank", response.name());
        assertNull(command.getValue().openingBalance());
        assertNull(command.getValue().currentBalance());
        verify(repository).existsByName(context, "Operating Bank", 11L);
    }

    @Test
    void updateRejectsBalanceEditsBeforePersistence() {
        var service = service();
        var context = PaymentAccountTestData.context();
        when(repository.findById(context, 11L))
            .thenReturn(Optional.of(PaymentAccountTestData.record(11L, "Operating Cash",
                PaymentAccountStatus.ACTIVE)));
        var request = new com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest(
            null, null, "Operating Bank", PaymentAccountType.BANK, "USD", new BigDecimal("1.00"),
            null, PaymentAccountStatus.ACTIVE, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.update(context, 11L, request));

        assertEquals(HttpStatus.BAD_REQUEST, error.status());
        verify(repository, never()).update(any(), eq(11L), any());
    }

    @Test
    void deleteSoftDeletesExistingAccount() {
        var service = service();
        var context = PaymentAccountTestData.context();
        when(repository.findById(context, 12L))
            .thenReturn(Optional.of(PaymentAccountTestData.record(12L, "Operating Cash",
                PaymentAccountStatus.ACTIVE)));
        when(repository.softDelete(context, 12L)).thenReturn(true);

        assertTrue(service.delete(context, 12L).success());
        verify(repository).softDelete(context, 12L);
    }

    @Test
    void createRejectsOutOfScopeBusinessBeforePersistence() {
        var service = service();
        var context = new FinanceContext(1L, 7L, "Scoped User", "user", true, FinanceScope.businessOffice(5L, 9L));
        var request = new com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest(
            5L, 10L, "Operating Cash", PaymentAccountType.CASH, "MXN", new BigDecimal("100.00"),
            null, null, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    private PaymentAccountService service() {
        return new PaymentAccountService(
            repository,
            new PaymentAccountMapper(),
            new PaymentAccountValidator(accessService),
            referenceValidator
        );
    }
}
