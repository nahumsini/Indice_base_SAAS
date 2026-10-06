package com.indice.erp.ai.terminal;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.pos.assistant.PosTerminalPreparation;
import org.springframework.stereotype.Service;
import java.util.Set;
@Service
public class AiTerminalAccess {
 private final AiToolAuthorizationService authorization;
 public AiTerminalAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
 public static String scope(String tool){if(com.indice.erp.pos.assistant.PosTerminalReadService.READS.contains(tool))return "pos.read";if(!PosTerminalPreparation.ACTIONS.contains(tool))throw new IllegalArgumentException("Unknown Terminal operations action.");return Set.of("refund_pos_card_payment","recheck_pos_card_refund","confirm_pos_card_return").contains(tool)?"pos.returns.manage":"pos.terminal.manage";}
 public void require(StoredToken token,String tool){if(!allowed(token,tool))throw new SecurityException("Current Terminal operations consent and permissions required.");}
 public boolean allowed(StoredToken token,String tool){return token.scopes().contains(scope(tool))&&authorization.canUseTerminalTool(token.user(),tool);}
}
