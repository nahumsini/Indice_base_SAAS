package com.indice.erp.ai.inventorycatalog;
import com.indice.erp.ai.access.*;
import com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantContracts.*;
import com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/inventory_catalog_workflows")
public class AiInventoryCatalogApiController {
    private final AiAccessTokenService tokens;private final AiInventoryCatalogAccess access;private final InventoryCatalogAssistantService owner;private final AiInventoryCatalogActionService actions;private final AiToolUsageAuditService audit;
    public AiInventoryCatalogApiController(AiAccessTokenService tokens,AiInventoryCatalogAccess access,InventoryCatalogAssistantService owner,AiInventoryCatalogActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)Query request){
        if(!InventoryCatalogAssistantService.READS.contains(tool))return ResponseEntity.notFound().build();
        return invoke(bearer,tool,t->owner.read(t.user(),tool,request),true);
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody Change request){if(!InventoryCatalogAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AiInventoryCatalogContracts.CommitRequest request){if(!InventoryCatalogAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> op,boolean read){
        var token=tokens.authenticate(bearer,AiInventoryCatalogAccess.scope(tool));if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated consent required."));
        try{access.require(token.get(),tool);var result=op.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok(result);}
        catch(com.indice.erp.pos.PosApiException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",e.status().value());return ResponseEntity.status(e.status()).body(error("procurement_owner_rejected",e.getMessage()));}
        catch(SecurityException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).body(error("inventory_catalog_permission_required","Current Inventory catalog access required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).body(error("inventory_catalog_not_found","Inventory catalog object not found."));}
        catch(AiInventoryCatalogContracts.Conflict e){return ResponseEntity.status(409).body(error(e.code(),e.getMessage()));}
        catch(IllegalStateException e){return ResponseEntity.status(409).body(error("inventory_catalog_changed","Prepare and confirm the current Inventory catalog again."));}
        catch(IllegalArgumentException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",400);return ResponseEntity.badRequest().body(error("invalid_request",e.getMessage()));}
    }
    private static long id(Long value){if(value==null||value<1)throw new IllegalArgumentException("Positive Inventory catalog ID required.");return value;}
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
