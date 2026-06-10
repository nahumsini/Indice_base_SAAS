package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountListResponse;
import com.indice.erp.finance.accountingaccounts.dto.DeleteAccountingAccountResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountingAccountControllerTest {

    @Mock
    private FinanceRequestGuard guard;

    @Mock
    private AccountingAccountService accountService;

    @Mock
    private HttpSession session;

    @Test
    void listUsesReadGuardAndReturnsAccounts() {
        var controller = controller();
        var context = AccountingAccountTestData.context();
        var body = new AccountingAccountListResponse(List.of(AccountingAccountTestData.response(99L)), 1);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(accountService.list(context)).thenReturn(body);

        var response = controller.list(session);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireReadAccess(session);
    }

    @Test
    void getUsesReadGuardAndReturnsAccount() {
        var controller = controller();
        var context = AccountingAccountTestData.context();
        var body = AccountingAccountTestData.response(55L);
        when(guard.requireReadAccess(session)).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(accountService.get(context, 55L)).thenReturn(body);

        var response = controller.get(session, 55L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
    }

    @Test
    void createUsesWriteGuardWithCsrfAndReturnsCreated() {
        var controller = controller();
        var context = AccountingAccountTestData.context();
        var request = AccountingAccountTestData.createRequest("6200", "Software");
        var body = AccountingAccountTestData.response(88L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(accountService.create(context, request)).thenReturn(body);

        var response = controller.create(session, "csrf-token", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void updateUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = AccountingAccountTestData.context();
        var request = AccountingAccountTestData.updateRequest("6210", "Software Updated",
            AccountingAccountStatus.INACTIVE);
        var body = AccountingAccountTestData.response(89L);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(accountService.update(context, 89L, request)).thenReturn(body);

        var response = controller.update(session, "csrf-token", 89L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void deleteUsesWriteGuardWithCsrf() {
        var controller = controller();
        var context = AccountingAccountTestData.context();
        var body = new DeleteAccountingAccountResponse(true);
        when(guard.requireWriteAccess(session, "csrf-token")).thenReturn(new FinanceRequestGuard.Result(context, null));
        when(accountService.delete(context, 90L)).thenReturn(body);

        var response = controller.delete(session, "csrf-token", 90L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(body, response.getBody());
        verify(guard).requireWriteAccess(session, "csrf-token");
    }

    @Test
    void createReturnsGuardErrorWithoutCallingService() {
        var controller = controller();
        var error = ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Invalid CSRF token."));
        when(guard.requireWriteAccess(session, null)).thenReturn(new FinanceRequestGuard.Result(null, error));

        var response = controller.create(session, null, AccountingAccountTestData.createRequest("6200", "Software"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(error.getBody(), response.getBody());
        verifyNoInteractions(accountService);
    }

    private FinanceAccountingAccountsController controller() {
        return new FinanceAccountingAccountsController(guard, accountService);
    }
}
