package com.indice.erp.ai.salesworkflow;
import com.indice.erp.ai.access.*;
import com.indice.erp.sales.SalesWorkflowContracts.*;
import com.indice.erp.sales.SalesWorkflowService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/sales_workflows")
public class AiSalesWorkflowApiController {
    private final AiAccessTokenService tokens;private final AiSalesWorkflowAccess access;private final SalesWorkflowService owner;private final AiSalesWorkflowActionService actions;private final AiToolUsageAuditService audit;
    public AiSalesWorkflowApiController(AiAccessTokenService tokens,AiSalesWorkflowAccess access,SalesWorkflowService owner,AiSalesWorkflowActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)Query request){
        if(!SalesWorkflowService.READS.contains(tool))return ResponseEntity.notFound().build();
        return invoke(bearer,tool,t->owner.read(t.user(),tool,request),true);
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody Change request){if(!SalesWorkflowService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AiSalesWorkflowContracts.CommitRequest request){if(!SalesWorkflowService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> op,boolean read){
        var token=tokens.authenticate(bearer,AiSalesWorkflowAccess.scope(tool));if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated consent required."));
        try{access.require(token.get(),tool);var result=op.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok(result);}
        catch(SecurityException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).body(error("salesworkflow_permission_required","Current Sales workflow access required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).body(error("salesworkflow_not_found","Sales workflow object not found."));}
        catch(AiSalesWorkflowContracts.Conflict e){return ResponseEntity.status(409).body(error(e.code(),e.getMessage()));}
        catch(IllegalStateException e){return ResponseEntity.status(409).body(error("salesworkflow_changed","Prepare and confirm the current Sales workflow again."));}
        catch(IllegalArgumentException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",400);return ResponseEntity.badRequest().body(error("invalid_request",e.getMessage()));}
    }
    private static long id(Long value){if(value==null||value<1)throw new IllegalArgumentException("Positive Sales workflow ID required.");return value;}
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
