package com.indice.erp.ai.commission;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.sales.SalesCommissionAssistantService;
import org.springframework.stereotype.Service;
@Service
public class AiCommissionAccess {
 private final AiToolAuthorizationService authorization;
 public AiCommissionAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
 public static String scope(String tool){if(SalesCommissionAssistantService.READS.contains(tool))return "sales.read";if(!SalesCommissionAssistantService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown sales commissions action.");return tool.equals("create_sales_commission_cut")?"sales.commissions.cut":"sales.commissions.schedule";}
 public void require(StoredToken token,String tool){if(!allowed(token,tool))throw new SecurityException("Current sales commissions consent and permissions required.");}
 public boolean allowed(StoredToken token,String tool){return token.scopes().contains(scope(tool))&&authorization.canUseCommissionTool(token.user(),tool)&&(!SalesCommissionAssistantService.ACTIONS.contains(tool)||token.scopes().contains("hr.incentives.manage")&&authorization.canReadGuideTab(token.user(),"human_resources","incentives"));}
}
