package com.indice.erp.ai.inventory;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.sales.InventoryAssistantService;
import org.springframework.stereotype.Service;

@Service
public class AiInventoryAccess {
    private final AiToolAuthorizationService authorization;
    public AiInventoryAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
    public static String scope(String tool) {
        if(InventoryAssistantService.READS.contains(tool))return "inventory.read";
        if(!InventoryAssistantService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown inventory action.");
        if(tool.endsWith("_product"))return "inventory.products.manage";
        if(tool.endsWith("_warehouse"))return "inventory.warehouses.manage";
        if(tool.equals("configure_inventory_stock"))return "inventory.stock.manage";
        if(tool.equals("cancel_inventory_movement"))return "inventory.movements.cancel";
        return "inventory.movements.create";
    }
    public void require(StoredToken token,String tool) {
        if(!token.scopes().contains(scope(tool))||!authorization.canUseInventoryTool(token.user(),tool))
            throw new SecurityException("Current inventory consent and permissions required.");
    }
}
