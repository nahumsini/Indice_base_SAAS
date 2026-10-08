package com.indice.erp.ai.financeworkflow;
import com.indice.erp.ai.access.*;
import com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.indice.erp.finance.assistant.FinanceAssistantService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/finance_workflows")
public class AiFinanceWorkflowApiController {
    private final AiAccessTokenService tokens;private final AiFinanceWorkflowAccess access;private final FinanceAssistantService owner;private final AiFinanceWorkflowActionService actions;private final AiToolUsageAuditService audit;
    public AiFinanceWorkflowApiController(AiAccessTokenService tokens,AiFinanceWorkflowAccess access,FinanceAssistantService owner,AiFinanceWorkflowActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)Query request){
        if(!com.indice.erp.finance.assistant.FinanceAssistantTools.READS.contains(tool))return ResponseEntity.notFound().build();
        return invoke(bearer,tool,t->owner.read(t.user(),tool,request),true);
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody Change request){if(!com.indice.erp.finance.assistant.FinanceAssistantTools.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody com.indice.erp.finance.assistant.FinanceAssistantContracts.CommitRequest request){if(!com.indice.erp.finance.assistant.FinanceAssistantTools.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> op,boolean read){
        var token=tokens.authenticate(bearer,AiFinanceWorkflowAccess.scope(tool));if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated consent required."));
        try{access.require(token.get(),tool);var result=op.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL,"no-store").body(result);}
        catch(SecurityException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).header(HttpHeaders.CACHE_CONTROL,"no-store").body(error("finance_permission_required","Current finance workflow access required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).header(HttpHeaders.CACHE_CONTROL,"no-store").body(error("finance_not_found","Finance workflow object not found."));}
        catch(com.indice.erp.finance.assistant.FinanceAssistantContracts.Conflict e){return ResponseEntity.status(409).header(HttpHeaders.CACHE_CONTROL,"no-store").body(error(e.code(),e.getMessage()));}
        catch(com.indice.erp.finance.FinanceApiException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",e.status().value());return ResponseEntity.status(e.status()).header(HttpHeaders.CACHE_CONTROL,"no-store").body(error("finance_owner_rejected","The finance owner rejected the requested operation. Review the current record and its permitted next action."));}
        catch(NullPointerException e){return ResponseEntity.badRequest().header(HttpHeaders.CACHE_CONTROL,"no-store").body(error("invalid_request","Required finance data is missing."));}
        catch(IllegalStateException e){return ResponseEntity.status(409).header(HttpHeaders.CACHE_CONTROL,"no-store").body(error("finance_changed","Prepare and confirm the current finance workflow again."));}
        catch(IllegalArgumentException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",400);return ResponseEntity.badRequest().header(HttpHeaders.CACHE_CONTROL,"no-store").body(error("invalid_request",e.getMessage()));}
    }
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
