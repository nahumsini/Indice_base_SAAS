package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
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
class AccountingAccountServiceTest {

    @Mock
    private AccountingAccountRepository repository;

    @Mock
    private FinanceAccessService accessService;

    @Mock
    private AccountingAccountReferenceValidator referenceValidator;

    @Test
    void getReturnsCompanyScopedAccountFromRepository() {
        var service = service();
        var context = AccountingAccountTestData.context();
        when(repository.findById(context, 99L))
            .thenReturn(Optional.of(AccountingAccountTestData.record(99L, "6200", "Software",
                AccountingAccountStatus.ACTIVE)));

        var response = service.get(context, 99L);

        assertEquals(99L, response.id());
        assertEquals(7L, response.companyId());
        assertEquals("6200", response.code());
    }

    @Test
    void createDefaultsActiveStatusAndAuditActor() {
        var service = service();
        var context = AccountingAccountTestData.context();
        var command = ArgumentCaptor.forClass(AccountingAccountCommand.class);
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.insert(eq(context), command.capture()))
            .thenReturn(AccountingAccountTestData.record(10L, "6200", "Software",
                AccountingAccountStatus.ACTIVE));

        var response = service.create(context, AccountingAccountTestData.createRequest(" 6200 ", " Software "));

        assertEquals(10L, response.id());
        assertEquals(AccountingAccountStatus.ACTIVE, command.getValue().status());
        assertEquals("6200", command.getValue().code());
        assertEquals("Software", command.getValue().name());
        assertEquals(1L, command.getValue().createdByUserId());
    }

    @Test
    void createRejectsDuplicateCodeBeforePersistence() {
        var service = service();
        var context = AccountingAccountTestData.context();
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByCode(context, "6200", null)).thenReturn(true);

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.create(context, AccountingAccountTestData.createRequest("6200", "Software")));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void createRejectsDuplicateNameBeforePersistence() {
        var service = service();
        var context = AccountingAccountTestData.context();
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.existsByName(context, "Software", null)).thenReturn(true);

        var error = assertThrows(
            FinanceApiException.class,
            () -> service.create(context, AccountingAccountTestData.createRequest("6200", "Software")));

        assertEquals(HttpStatus.CONFLICT, error.status());
        verify(repository, never()).insert(any(), any());
    }

    @Test
    void updateChecksDuplicatesAgainstOtherAccountsAndPersists() {
        var service = service();
        var context = AccountingAccountTestData.context();
        var updated = AccountingAccountTestData.record(11L, "6210", "Software Updated",
            AccountingAccountStatus.INACTIVE);
        when(repository.findById(context, 11L))
            .thenReturn(Optional.of(AccountingAccountTestData.record(11L, "6200", "Software",
                AccountingAccountStatus.ACTIVE)), Optional.of(updated));
        when(accessService.containsAssignment(context, null, null)).thenReturn(true);
        when(repository.update(eq(context), eq(11L), any())).thenReturn(true);

        var response = service.update(context, 11L,
            AccountingAccountTestData.updateRequest("6210", "Software Updated", AccountingAccountStatus.INACTIVE));

        assertEquals("6210", response.code());
        assertEquals(AccountingAccountStatus.INACTIVE, response.status());
        verify(repository).existsByCode(context, "6210", 11L);
        verify(repository).existsByName(context, "Software Updated", 11L);
    }

    @Test
    void deleteSoftDeletesExistingAccount() {
        var service = service();
        var context = AccountingAccountTestData.context();
        when(repository.findById(context, 12L))
            .thenReturn(Optional.of(AccountingAccountTestData.record(12L, "6200", "Software",
                AccountingAccountStatus.ACTIVE)));
        when(repository.softDelete(context, 12L)).thenReturn(true);

        assertTrue(service.delete(context, 12L).success());
        verify(repository).softDelete(context, 12L);
    }

    @Test
    void createRejectsOutOfScopeBusinessBeforePersistence() {
        var service = service();
        var context = new FinanceContext(1L, 7L, "Scoped User", "user", true, FinanceScope.businessOffice(5L, 9L));
        var request = new com.indice.erp.finance.accountingaccounts.dto.CreateAccountingAccountRequest(
            5L, 10L, "6200", "Software", AccountingAccountGroup.SOFTWARE, null, null, null, null);

        var error = assertThrows(FinanceApiException.class, () -> service.create(context, request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
        verifyNoInteractions(referenceValidator);
        verify(repository, never()).insert(any(), any());
    }

    private AccountingAccountService service() {
        return new AccountingAccountService(
            repository,
            new AccountingAccountMapper(),
            new AccountingAccountValidator(accessService),
            referenceValidator
        );
    }
}
