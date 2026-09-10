package com.indice.erp.finance.budgetlines;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.finance.FinanceRequestGuard;
import com.indice.erp.finance.budgetlines.dto.BudgetLineBulkActionRequest;
import com.indice.erp.finance.budgetlines.dto.BudgetLineListResponse;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class BudgetLineBulkActionsControllerTest {
    @Test void deniedSessionOrCsrfNeverCallsMutation() {
        var guard=mock(FinanceRequestGuard.class); var service=mock(BudgetLineBulkActionService.class); var session=mock(HttpSession.class);
        when(guard.requireWriteAccess(session,null)).thenReturn(new FinanceRequestGuard.Result(null,ResponseEntity.status(403).body(Map.of("error","Forbidden"))));
        var result=new BudgetLineBulkActionsController(guard,service).apply(session,null,request());
        assertThat(result.getStatusCode().value()).isEqualTo(403);verifyNoInteractions(service);
    }
    @Test void authorizedRequestUsesGuardDerivedTenantAndCsrf() {
        var guard=mock(FinanceRequestGuard.class); var service=mock(BudgetLineBulkActionService.class); var session=mock(HttpSession.class);
        var context=BudgetLineTestData.context(); var request=request();
        when(guard.requireWriteAccess(session,"test-csrf")).thenReturn(new FinanceRequestGuard.Result(context,null));
        when(service.apply(context,request)).thenReturn(new BudgetLineListResponse(List.of(),0));
        var result=new BudgetLineBulkActionsController(guard,service).apply(session,"test-csrf",request);
        assertThat(result.getStatusCode().value()).isEqualTo(200);verify(service).apply(context,request);
    }
    private BudgetLineBulkActionRequest request() { return new BudgetLineBulkActionRequest(BudgetLineBulkActionRequest.Action.DELETE,List.of(new BudgetLineBulkActionRequest.Selection(1,0L)),null,"Isolated controller test"); }
}
