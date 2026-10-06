package com.indice.erp.ai.inventory;
import com.indice.erp.ai.access.*;
import com.indice.erp.sales.InventoryAssistantContracts.*;
import com.indice.erp.sales.InventoryAssistantService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/inventory_workflows")
public class AiInventoryApiController {
    private final AiAccessTokenService tokens;private final AiInventoryAccess access;private final InventoryAssistantService owner;private final AiInventoryActionService actions;private final AiToolUsageAuditService audit;
    public AiInventoryApiController(AiAccessTokenService tokens,AiInventoryAccess access,InventoryAssistantService owner,AiInventoryActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)Query request){
        if(!InventoryAssistantService.READS.contains(tool))return ResponseEntity.notFound().build();
        return invoke(bearer,tool,t->owner.read(t.user(),tool,request),true);
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody Change request){if(!InventoryAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AiInventoryContracts.CommitRequest request){if(!InventoryAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> op,boolean read){
        var token=tokens.authenticate(bearer,AiInventoryAccess.scope(tool));if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated consent required."));
        try{access.require(token.get(),tool);var result=op.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok(result);}
        catch(SecurityException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).body(error("inventory_permission_required","Current inventory workflow access required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).body(error("inventory_not_found","Inventory workflow object not found."));}
        catch(AiInventoryContracts.Conflict e){return ResponseEntity.status(409).body(error(e.code(),e.getMessage()));}
        catch(IllegalStateException e){return ResponseEntity.status(409).body(error("inventory_changed","Prepare and confirm the current inventory workflow again."));}
        catch(IllegalArgumentException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",400);return ResponseEntity.badRequest().body(error("invalid_request",e.getMessage()));}
    }
    private static long id(Long value){if(value==null||value<1)throw new IllegalArgumentException("Positive inventory workflow ID required.");return value;}
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
