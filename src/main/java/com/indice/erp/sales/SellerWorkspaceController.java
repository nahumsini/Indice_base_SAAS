package com.indice.erp.sales;

import static com.indice.erp.sales.SellerWorkspaceDtos.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Function;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Inherits the sales module and crm.leads classification of opportunity-flow. */
@RestController
@RequestMapping("/api/v1/sales/opportunity-flow/{flowId}/seller")
@RequiresCapability("sales")
public class SellerWorkspaceController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final SellerWorkspaceService service;
    public SellerWorkspaceController(SessionAuthService auth, SessionCsrfService csrf, SellerWorkspaceService service) {
        this.auth=auth; this.csrf=csrf; this.service=service;
    }
    @GetMapping("/scripts")
    public ResponseEntity<?> scripts(HttpSession session,@PathVariable long flowId) {
        return run(session,false,null,user -> service.scripts(user.companyId(),flowId));
    }
    @PostMapping("/scripts")
    public ResponseEntity<?> saveScript(HttpSession session,@PathVariable long flowId,
            @RequestHeader(name="X-CSRF-Token",required=false) String token,@RequestBody SaveScriptRequest request) {
        return run(session,true,token,user -> service.saveScript(user.companyId(),flowId,user.userId(),request));
    }
    @GetMapping("/summary")
    public ResponseEntity<?> summary(HttpSession session,@PathVariable long flowId) {
        return run(session,false,null,user -> service.summary(user.companyId(),flowId,user.userId()));
    }
    @GetMapping("/opportunities/{id}")
    public ResponseEntity<?> opportunity(HttpSession session,@PathVariable long flowId,@PathVariable long id) {
        return run(session,false,null,user -> service.opportunity(user.companyId(),flowId,id));
    }
    @GetMapping("/opportunities/{id}/interactions")
    public ResponseEntity<?> history(HttpSession session,@PathVariable long flowId,@PathVariable long id,
            @RequestParam(required=false) Long before) {
        return run(session,false,null,user -> service.history(user.companyId(),flowId,id,before));
    }
    @PostMapping("/opportunities/{id}/interactions")
    public ResponseEntity<?> record(HttpSession session,@PathVariable long flowId,@PathVariable long id,
            @RequestHeader(name="X-CSRF-Token",required=false) String token,@RequestBody InteractionRequest request) {
        return run(session,true,token,user -> service.record(user.companyId(),flowId,id,user.userId(),request));
    }
    private ResponseEntity<?> run(HttpSession session,boolean mutation,String token,Function<AuthSessionUser,Object> action) {
        var user=auth.currentUser(session);
        if (user.isEmpty() || user.get().companyId()==null || user.get().userId()==null) return error(401,"unauthorized");
        if (mutation) {
            try { csrf.requireCsrf(session,token); }
            catch (IllegalArgumentException ex) { return error(403,"csrf_required"); }
        }
        try { return ResponseEntity.ok(action.apply(user.get())); }
        catch (NoSuchElementException ex) { return error(404,"seller_record_not_found"); }
        catch (SellerWorkspaceService.Conflict | DuplicateKeyException ex) { return error(409,"seller_conflict"); }
        catch (IllegalArgumentException ex) { return error(422,"seller_validation_failed"); }
    }
    private ResponseEntity<?> error(int status,String code) { return ResponseEntity.status(status).body(Map.of("code",code,"message",code)); }
}
