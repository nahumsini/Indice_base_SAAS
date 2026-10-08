package com.indice.erp.ai.learning;
import com.indice.erp.ai.access.*;
import com.indice.erp.learning.*;
import java.util.Map;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/tools/learning/progress")
public class AiLearningProgressApiController {
    private final AiAccessTokenService tokens;
    private final LearningProgressService progress;
    private final AiLearningProgressActionService actions;
    private final AiToolUsageAuditService audit;
    public AiLearningProgressApiController(AiAccessTokenService tokens,LearningProgressService progress,AiLearningProgressActionService actions,AiToolUsageAuditService audit) {
        this.tokens=tokens;this.progress=progress;this.actions=actions;this.audit=audit;
    }
    @PostMapping
    public ResponseEntity<?> get(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody(required=false)AiLearningContracts.Request request) {
        var locale=request==null||request.locale()==null?"es-MX":request.locale();
        return invoke(bearer,AiAccessTokenService.LEARNING_READ,t->progress.get(t.user(),locale),"READ");
    }
    @PostMapping("/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody LearningProgressContracts.Change change) {
        return invoke(bearer,AiAccessTokenService.LEARNING_MANAGE,t->actions.preview(t,change),"PREVIEW");
    }
    @PostMapping("/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody AiLearningProgressActionService.Commit request) {
        return invoke(bearer,AiAccessTokenService.LEARNING_MANAGE,t->actions.commit(t,request),"COMMIT");
    }
    private ResponseEntity<?> invoke(String bearer,String scope,Function<AiAccessTokenRepository.StoredToken,Object> operation,String event) {
        var token=tokens.authenticate(bearer,scope);
        if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(Map.of("code","invalid_token"));
        try {var result=operation.apply(token.get());if(event.equals("READ"))audit.recordRead(token.get(),"get_learning_progress","SUCCESS",200);return ResponseEntity.ok(result);}
        catch(SecurityException e){failure(token.get(),event,403);return ResponseEntity.status(403).body(Map.of("code","learning_permission_required"));}
        catch(IllegalArgumentException e){failure(token.get(),event,400);return ResponseEntity.badRequest().body(Map.of("code","invalid_request","message",e.getMessage()));}
        catch(IllegalStateException e){failure(token.get(),event,409);return ResponseEntity.status(409).body(Map.of("code","learning_confirmation_conflict","message","Review the current chapter and prepare the change again."));}
    }
    private void failure(AiAccessTokenRepository.StoredToken token,String event,int status) {
        if(event.equals("READ"))audit.recordRead(token,"get_learning_progress","DENIED",status);
        else actions.recordFailure(token,event,status);
    }
}
