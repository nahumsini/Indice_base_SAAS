package com.indice.erp.ai.meetings;
import com.indice.erp.ai.access.*;
import com.indice.erp.meetings.MeetingAssistantService;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/meetings")
public class AiMeetingApiController {
    private final AiAccessTokenService tokens;private final AiMeetingAccess access;private final MeetingAssistantService owner;private final AiMeetingActionService actions;private final AiToolUsageAuditService audit;
    public AiMeetingApiController(AiAccessTokenService tokens,AiMeetingAccess access,MeetingAssistantService owner,AiMeetingActionService actions,AiToolUsageAuditService audit){this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;}
    @PostMapping("/{tool}") public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String tool,@RequestBody(required=false)MeetingAssistantService.Query query){
        if(!MeetingAssistantService.READS.contains(tool))return ResponseEntity.notFound().build();return invoke(bearer,tool,t->owner.read(t.user(),tool,query),true);
    }
    @PostMapping("/{action}/preview") public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody MeetingAssistantService.Change change){
        if(!MeetingAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.preview(t,action,change),false);
    }
    @PostMapping("/{action}/commit") public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AiMeetingActionService.Commit request){
        if(!MeetingAssistantService.ACTIONS.contains(action))return ResponseEntity.notFound().build();return invoke(bearer,action,t->actions.commit(t,action,request),false);
    }
    private ResponseEntity<?> invoke(String bearer,String tool,Function<AiAccessTokenRepository.StoredToken,Object> operation,boolean read){
        var token=tokens.authenticate(bearer,AiMeetingAccess.scope(tool));
        if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(Map.of("code","invalid_token"));
        try{access.require(token.get(),tool);var result=operation.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok(result);}
        catch(SecurityException e){return failure(token.get(),tool,403,"meeting_permission_required");}
        catch(NoSuchElementException e){return failure(token.get(),tool,404,"meeting_not_found");}
        catch(IllegalArgumentException e){return failure(token.get(),tool,400,"invalid_request");}
        catch(IllegalStateException e){return failure(token.get(),tool,409,"meeting_changed_review_again");}
    }
    private ResponseEntity<?> failure(AiAccessTokenRepository.StoredToken token,String tool,int status,String code){audit.recordRead(token,tool,"FAILURE",status);return ResponseEntity.status(status).body(Map.of("code",code));}
}
