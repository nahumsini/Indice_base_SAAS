package com.indice.erp.ai.procurement;
import com.indice.erp.ai.access.*;
import com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantContracts.*;
import com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/procurement_workflows")
public class AiProcurementApiController {
    private final AiAccessTokenService tokens;private final AiProcurementAccess access;private final ProcurementAssistantService owner;private final AiProcurementActionService actions;private final AiToolUsageAuditService audit;
    public AiProcurementApiController(AiAccessTokenService tokens,AiProcurementAccess access,ProcurementAssistantService owner,AiProcurementActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)Query request){
        if(!ProcurementAssistantService.READS.contains(tool))return ResponseEntity.notFound().build();
        return invoke(bearer,tool,t->owner.read(t.user(),tool,request),true);
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody Change request){if(!ProcurementAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AiProcurementContracts.CommitRequest request){if(!ProcurementAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> op,boolean read){
        var token=tokens.authenticate(bearer,AiProcurementAccess.scope(tool));if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated consent required."));
        try{access.require(token.get(),tool);var result=op.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok(result);}
        catch(com.indice.erp.pos.PosApiException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",e.status().value());return ResponseEntity.status(e.status()).body(error("procurement_owner_rejected",e.getMessage()));}
        catch(SecurityException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).body(error("procurement_permission_required","Current Procurement workflow access required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).body(error("procurement_not_found","Procurement workflow object not found."));}
        catch(AiProcurementContracts.Conflict e){return ResponseEntity.status(409).body(error(e.code(),e.getMessage()));}
        catch(IllegalStateException e){return ResponseEntity.status(409).body(error("procurement_changed","Prepare and confirm the current Procurement workflow again."));}
        catch(IllegalArgumentException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",400);return ResponseEntity.badRequest().body(error("invalid_request",e.getMessage()));}
    }
    private static long id(Long value){if(value==null||value<1)throw new IllegalArgumentException("Positive Procurement workflow ID required.");return value;}
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
