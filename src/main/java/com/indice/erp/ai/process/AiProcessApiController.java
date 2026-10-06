package com.indice.erp.ai.process;
import com.indice.erp.ai.access.*;
import com.indice.erp.processTasks.assistant.ProcessAssistantContracts.*;
import com.indice.erp.processTasks.assistant.ProcessAssistantService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/process_workflows")
public class AiProcessApiController {
    private final AiAccessTokenService tokens;private final AiProcessAccess access;private final ProcessAssistantService owner;private final AiProcessActionService actions;private final AiToolUsageAuditService audit;
    public AiProcessApiController(AiAccessTokenService tokens,AiProcessAccess access,ProcessAssistantService owner,AiProcessActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    public record ReadRequest(Long id,Integer version,PageRequest page){ }
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)ReadRequest request){
        if(!ProcessAssistantService.READS.contains(tool))return ResponseEntity.notFound().build();
        return invoke(bearer,tool,t->{var a=request==null?new ReadRequest(null,null,null):request;return switch(tool){
            case "list_projects"->owner.projects(t.user(),a.page());case "get_project"->owner.project(t.user(),id(a.id()));
            case "list_processes"->owner.processes(t.user(),a.page());case "get_process"->owner.process(t.user(),id(a.id()));
            case "list_process_collaborators"->owner.collaborators(t.user(),a.page());case "list_process_runs"->owner.runs(t.user(),id(a.id()),a.page());
            case "get_process_run"->owner.run(t.user(),id(a.id()));case "get_process_version"->{if(a.version()==null)throw new IllegalArgumentException("Published version required.");yield owner.version(t.user(),id(a.id()),a.version());}
            default->throw new IllegalArgumentException("Unsupported workflow read.");};},true);
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody Change request){if(!ProcessAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AiProcessContracts.CommitRequest request){if(!ProcessAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> op,boolean read){
        var token=tokens.authenticate(bearer,AiProcessAccess.scope(tool));if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated consent required."));
        try{access.require(token.get(),tool);var result=op.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok(result);}
        catch(SecurityException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).body(error("workflow_permission_required","Current workflow access required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).body(error("workflow_not_found","Workflow object not found."));}
        catch(AiProcessContracts.Conflict e){return ResponseEntity.status(409).body(error(e.code(),e.getMessage()));}
        catch(IllegalStateException e){return ResponseEntity.status(409).body(error("workflow_changed","Prepare and confirm the current workflow again."));}
        catch(IllegalArgumentException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",400);return ResponseEntity.badRequest().body(error("invalid_request",e.getMessage()));}
    }
    private static long id(Long value){if(value==null||value<1)throw new IllegalArgumentException("Positive workflow ID required.");return value;}
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
