package com.indice.erp.ai.procurement;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService;
import org.springframework.stereotype.Service;
@Service
public class AiProcurementAccess {
    private final AiToolAuthorizationService authorization;
    public AiProcurementAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
    public static String scope(String tool){if(ProcurementAssistantService.READS.contains(tool))return "inventory.read";if(!ProcurementAssistantService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown procurement tool.");if(tool.contains("supplier_invoice"))return "inventory.invoices.manage";if(tool.equals("approve_purchase_order")||tool.startsWith("review_")||tool.equals("convert_supplier_submission"))return "inventory.procurement.approve";if(tool.equals("receive_purchase_order"))return "inventory.procurement.receive";return "inventory.procurement.manage";}
    public void require(StoredToken token,String tool){if(!allowed(token,tool))throw new SecurityException("Current procurement consent and permissions required.");}
    public boolean allowed(StoredToken token,String tool){return token.scopes().contains(scope(tool))&&authorization.canUseProcurementTool(token.user(),tool);}
}
