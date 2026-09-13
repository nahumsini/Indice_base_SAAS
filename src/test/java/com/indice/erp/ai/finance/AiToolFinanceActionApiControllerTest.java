package com.indice.erp.ai.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class AiToolFinanceActionApiControllerTest {

    private static final String AUTHORIZATION = "Bearer idx_ai_abcdefghijklmnopqrstuvwxyz1234567890";
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Owner", "admin");
    private static final AiAccessTokenRepository.StoredToken TOKEN = new AiAccessTokenRepository.StoredToken(
        91L,
        USER,
        Set.of(
            AiAccessTokenService.EXPENSES_CREATE,
            AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE,
            AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE
        )
    );

    @Mock private AiAccessTokenService tokenService;
    @Mock private AiToolAuthorizationService authorizationService;
    @Mock private AiFinanceActionService actionService;

    private AiToolFinanceActionApiController controller;

    @BeforeEach
    void setUp() {
        controller = new AiToolFinanceActionApiController(tokenService, authorizationService, actionService);
    }

    @Test
    void expenseScopeCannotBypassTheCurrentExpensesTabPermission() {
        allowToken(AiAccessTokenService.EXPENSES_CREATE);
        when(authorizationService.canCreateExpenseDraft(USER)).thenReturn(false);

        var response = controller.preview(AUTHORIZATION, AiFinanceActionService.CREATE_EXPENSE_DRAFT, Map.of());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(authorizationService).canCreateExpenseDraft(USER);
        verifyNoInteractions(actionService);
    }

    @Test
    void pettyCashReadAccessCannotRegisterAFundExpenseWithoutControlPermission() {
        allowToken(AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE);
        when(authorizationService.canRegisterFundExpense(USER)).thenReturn(false);

        var response = controller.preview(AUTHORIZATION, AiFinanceActionService.REGISTER_FUND_EXPENSE, Map.of());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(authorizationService).canRegisterFundExpense(USER);
        verifyNoInteractions(actionService);
    }

    @Test
    void pettyCashReadAccessCannotAddMoneyWithoutControlPermission() {
        allowToken(AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE);
        when(authorizationService.canAddMoneyToFund(USER)).thenReturn(false);

        var response = controller.preview(AUTHORIZATION, AiFinanceActionService.ADD_MONEY_TO_FUND, Map.of());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(authorizationService).canAddMoneyToFund(USER);
        verifyNoInteractions(actionService);
    }

    private void allowToken(String scope) {
        when(tokenService.authenticate(AUTHORIZATION, scope)).thenReturn(Optional.of(TOKEN));
    }
}
