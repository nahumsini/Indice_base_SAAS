package com.indice.erp.ai.inventorycatalog;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService;
import org.springframework.stereotype.Service;
@Service
public class AiInventoryCatalogAccess {
 private final AiToolAuthorizationService authorization;
 public AiInventoryCatalogAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
 public static String scope(String tool){if(InventoryCatalogAssistantService.READS.contains(tool))return "inventory.read";if(!InventoryCatalogAssistantService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown inventory catalog action.");return tool.contains("provider")?"inventory.providers.manage":"inventory.discounts.manage";}
 public void require(StoredToken token,String tool){if(!allowed(token,tool))throw new SecurityException("Current inventory catalog consent and permissions required.");}
 public boolean allowed(StoredToken token,String tool){return token.scopes().contains(scope(tool))&&authorization.canUseInventoryCatalogTool(token.user(),tool);}
}
