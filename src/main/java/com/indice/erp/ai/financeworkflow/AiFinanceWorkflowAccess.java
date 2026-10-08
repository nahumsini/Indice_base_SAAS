package com.indice.erp.ai.financeworkflow;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.finance.assistant.FinanceAssistantTools;
import com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class AiFinanceWorkflowAccess {
    private final AiToolAuthorizationService authorization;
    public AiFinanceWorkflowAccess(AiToolAuthorizationService authorization) { this.authorization=authorization; }
    public static String scope(String tool) { return FinanceAssistantTools.require(tool).scope(); }
    public boolean allowed(StoredToken token,String tool) {
        var spec=FinanceAssistantTools.ALL.get(tool);
        return spec!=null&&token.scopes().contains(spec.scope())&&authorization.canUseFinanceWorkflowTool(token.user(),tool)
            &&(!tool.equals("update_finance_expense_due_status")||token.scopes().contains("expenses.approve"))
            &&(!spec.operation().equals("remove_attachment")||token.scopes().contains("files.attach"));
    }
    public void require(StoredToken token,String tool) { if(!allowed(token,tool))throw new SecurityException("Current finance consent, module and tab access required."); }
    public void requireRequest(StoredToken token,String tool,Change change) {
        require(token,tool);if(change==null)throw new IllegalArgumentException("Finance action data required.");
        if(tool.equals("import_finance_expenses")&&change.expenses()!=null&&change.expenses().stream().anyMatch(e->e!=null&&Boolean.TRUE.equals(e.paid()))&&!token.scopes().contains("expenses.pay"))throw new SecurityException("Explicit payment consent is required for paid imports.");
        if(tool.equals("update_finance_expense_due_status")&&!token.scopes().contains("expenses.approve"))throw new SecurityException("The existing due-status owner also approves open records; approval consent is required.");
    }
    public Result project(StoredToken token,Result result) { return new Result(result.action(),result.records(),result.effects(),result.nextActions().stream().filter(tool->allowed(token,tool)).toList()); }
}
