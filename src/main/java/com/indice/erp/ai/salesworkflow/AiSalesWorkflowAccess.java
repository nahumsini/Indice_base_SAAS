package com.indice.erp.ai.salesworkflow;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.sales.SalesWorkflowService;
import org.springframework.stereotype.Service;
@Service
public class AiSalesWorkflowAccess {
    private final AiToolAuthorizationService authorization;
    public AiSalesWorkflowAccess(AiToolAuthorizationService authorization) {this.authorization=authorization;}
    public static String scope(String tool) {
        if(SalesWorkflowService.READS.contains(tool))return "sales.read";
        if(!SalesWorkflowService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown sales workflow action.");
        if(tool.contains("contract"))return "sales.contracts.manage";
        if(tool.contains("follow_up"))return "sales.followups.manage";
        if(tool.contains("commission_rule"))return "sales.commissions.manage";
        if(tool.equals("confirm_sale_collection"))return "sales.collections.confirm";
        if(tool.equals("cancel_commercial_sale"))return "sales.cancel";
        return "sales.manage";
    }
    public void require(StoredToken token,String tool) {
        if(!allowed(token,tool))throw new SecurityException("Current sales consent and permissions required.");
    }
    public boolean allowed(StoredToken token,String tool) {
        return token.scopes().contains(scope(tool))&&authorization.canUseSalesWorkflowTool(token.user(),tool)
            &&(!tool.equals("convert_quote_to_sale")||(token.scopes().contains("quotes.read")&&token.scopes().contains("quotes.update")&&authorization.canUseCommercialTool(token.user(),"update_quote")));
    }
}
