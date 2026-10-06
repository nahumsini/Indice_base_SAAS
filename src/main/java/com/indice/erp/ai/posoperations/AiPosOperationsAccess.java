package com.indice.erp.ai.posoperations;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.pos.assistant.PosOperationsService;
import org.springframework.stereotype.Service;
@Service
public class AiPosOperationsAccess {
 private final AiToolAuthorizationService authorization;
 public AiPosOperationsAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
 public static String scope(String tool){if(PosOperationsService.READS.contains(tool))return "pos.read";if(!PosOperationsService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown POS operations action.");return tool.contains("settlement")?"pos.settlements.manage":"pos.orders.manage";}
 public void require(StoredToken token,String tool){if(!allowed(token,tool))throw new SecurityException("Current POS operations consent and permissions required.");}
 public boolean allowed(StoredToken token,String tool){return token.scopes().contains(scope(tool))&&authorization.canUsePosOperationsTool(token.user(),tool);}
}
