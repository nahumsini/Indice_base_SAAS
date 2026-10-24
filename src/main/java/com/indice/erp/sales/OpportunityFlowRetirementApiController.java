package com.indice.erp.sales;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales/opportunity-flow/{flowId}/retirement")
@RequiresCapability("sales")
public class OpportunityFlowRetirementApiController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final OpportunityFlowAccessService access;
    private final OpportunityFlowRetirementService service;
    public OpportunityFlowRetirementApiController(SessionAuthService auth,SessionCsrfService csrf,
        OpportunityFlowAccessService access,OpportunityFlowRetirementService service) {
        this.auth=auth;this.csrf=csrf;this.access=access;this.service=service;
    }
    @GetMapping
    public ResponseEntity<?> preview(HttpSession session,@PathVariable long flowId,@RequestParam long targetFlowId,
        @RequestHeader(name="X-Flow-Actor",required=false) String expectedActor) {
        return execute(session,null,expectedActor,false,user->service.preview(user.companyId(),flowId,targetFlowId));
    }
    @PostMapping
    public ResponseEntity<?> retire(HttpSession session,@PathVariable long flowId,
        @RequestHeader(name="X-CSRF-Token",required=false) String token,
        @RequestHeader(name="X-Flow-Actor",required=false) String expectedActor,
        @RequestBody(required=false) OpportunityFlowRetirementService.Command command) {
        return execute(session,token,expectedActor,true,user->service.retire(user.companyId(),user.userId(),flowId,command));
    }
    private ResponseEntity<?> execute(HttpSession session,String token,String actor,boolean write,
        java.util.function.Function<com.indice.erp.auth.AuthSessionUser,Object> action) {
        var current=auth.currentUser(session);
        if(current.isEmpty()) return ResponseEntity.status(401).body(Map.of("code","unauthorized"));
        var user=current.get();
        if(!access.canManage(user)) return ResponseEntity.status(403).body(Map.of("code","forbidden"));
        if(!(user.companyId()+":"+user.userId()).equals(actor)) return ResponseEntity.status(409).body(Map.of("code","flow_actor_changed"));
        if(write) try { csrf.requireCsrf(session,token); }
            catch(IllegalArgumentException ex) { return ResponseEntity.status(403).body(Map.of("code","invalid_csrf")); }
        try { return ResponseEntity.ok(action.apply(user)); }
        catch(OpportunityFlowRetirementService.Changed ex) { return ResponseEntity.status(409).body(Map.of("code","flow_changed")); }
        catch(java.util.NoSuchElementException ex) { return ResponseEntity.status(404).body(Map.of("code","flow_unavailable")); }
        catch(IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("code","flow_retirement_limit".equals(ex.getMessage())?"flow_retirement_limit":"flow_retirement_invalid")); }
    }
}
