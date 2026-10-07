package com.indice.erp.ai.financeworkflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.indice.erp.finance.assistant.FinanceAssistantService;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;

@ExtendWith(MockitoExtension.class)
class AiFinanceWorkflowApiControllerTest {
    @Mock AiAccessTokenService tokens;
    @Mock AiFinanceWorkflowAccess access;
    @Mock FinanceAssistantService owner;
    @Mock AiFinanceWorkflowActionService actions;
    @Mock AiToolUsageAuditService audit;
    AiFinanceWorkflowApiController controller;
    final StoredToken token=new StoredToken(1,new AuthSessionUser(2L,3L,4L,"Synthetic operator","admin"),Set.of("expenses.pay","expenses.read"));

    @BeforeEach void setup(){controller=new AiFinanceWorkflowApiController(tokens,access,owner,actions,audit);}

    @Test void missingTokenCannotReachTheOwner(){
        when(tokens.authenticate(null,"expenses.pay")).thenReturn(Optional.empty());
        assertThat(controller.preview(null,"settle_expense_payment",null).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(access,owner,actions);
    }

    @Test void currentPermissionIsRepeatedBeforeReading(){
        when(tokens.authenticate("Bearer synthetic","expenses.read")).thenReturn(Optional.of(token));
        doThrow(new SecurityException("Synthetic private permission detail")).when(access).require(token,"get_finance_expense");
        var response=controller.read("Bearer synthetic","get_finance_expense",new Query());
        assertThat(response.getStatusCode().value()).isEqualTo(403);assertThat(response.getBody().toString()).doesNotContain("private permission detail");verifyNoInteractions(owner,actions);
        verify(audit).recordRead(token,"get_finance_expense","FAILURE",403);
    }

    @Test void ownerErrorsAreSanitizedAndFinancialResponsesAreNotCached(){
        when(tokens.authenticate("Bearer synthetic","expenses.pay")).thenReturn(Optional.of(token));
        when(actions.preview(token,"settle_expense_payment",null)).thenThrow(FinanceApiException.badRequest("Synthetic raw storage URL / secret / personal detail"));
        var response=controller.preview("Bearer synthetic","settle_expense_payment",null);
        assertThat(response.getStatusCode().value()).isEqualTo(400);assertThat(response.getBody().toString()).doesNotContain("storage URL","secret","personal detail");assertThat(response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
    }

    @Test void aChangedReviewReturnsConflictWithoutCallingAnotherOwnerAction(){
        when(tokens.authenticate("Bearer synthetic","expenses.pay")).thenReturn(Optional.of(token));
        var request=new CommitRequest("idx_confirm_"+"a".repeat(43),"synthetic-commit");
        when(actions.commit(token,"settle_expense_payment",request)).thenThrow(new Conflict("finance_preview_changed"));
        assertThat(controller.commit("Bearer synthetic","settle_expense_payment",request).getStatusCode().value()).isEqualTo(409);verifyNoInteractions(owner);
    }

    @Test void unknownToolsNeverBecomeAnArbitraryApiDispatcher(){
        assertThat(controller.read(null,"raw_sql",null).getStatusCode().value()).isEqualTo(404);
        assertThat(controller.preview(null,"raw_transfer",null).getStatusCode().value()).isEqualTo(404);
        verifyNoInteractions(tokens,access,owner,actions);
    }

    @Test void typedConfirmationRejectsResentFinancialAuthority(){
        org.assertj.core.api.Assertions.assertThatThrownBy(()->new ObjectMapper().readValue(
            "{\"confirmationToken\":\"synthetic\",\"idempotencyKey\":\"synthetic\",\"companyId\":99,\"amount\":100}",CommitRequest.class))
            .hasMessageContaining("Unknown finance confirmation field");
    }
}
