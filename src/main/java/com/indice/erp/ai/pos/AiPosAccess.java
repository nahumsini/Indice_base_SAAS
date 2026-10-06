package com.indice.erp.ai.pos;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.pos.assistant.PosAssistantService;
import org.springframework.stereotype.Service;
@Service
public class AiPosAccess {
    private final AiToolAuthorizationService authorization;
    public AiPosAccess(AiToolAuthorizationService authorization) {this.authorization=authorization;}
    public static String scope(String tool) {
        if(PosAssistantService.READS.contains(tool))return "pos.read";
        if(!PosAssistantService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown POS workflow action.");
        if(tool.endsWith("_register"))return "pos.registers.manage";
        if(tool.contains("return"))return "pos.returns.manage";
        if(tool.equals("receive_pos_inventory")||tool.equals("reverse_pos_inventory_receipt"))return "pos.inventory.receive";
        if(tool.equals("complete_pos_checkout"))return "pos.checkout";
        if(tool.equals("record_pos_cash_movement"))return "pos.cash.manage";
        return "pos.shifts.manage";
    }
    public void require(StoredToken token,String tool) {if(!allowed(token,tool))throw new SecurityException("Current POS consent and permissions required.");}
    public boolean allowed(StoredToken token,String tool) {return token.scopes().contains(scope(tool))&&authorization.canUsePosWorkflowTool(token.user(),tool);}
}
