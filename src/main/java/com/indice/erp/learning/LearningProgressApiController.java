package com.indice.erp.learning;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/learning")
public class LearningProgressApiController {
    private final SessionAuthService sessions;
    private final SessionCsrfService csrf;
    private final LearningProgressService learning;
    public LearningProgressApiController(SessionAuthService sessions,SessionCsrfService csrf,LearningProgressService learning) {
        this.sessions=sessions;this.csrf=csrf;this.learning=learning;
    }
    @GetMapping("/progress")
    public ResponseEntity<?> get(HttpSession session,@RequestHeader(value="X-Learning-Actor",required=false)String expectedActor,@RequestParam(defaultValue="es-MX")String locale) { return invoke(session,expectedActor,null,null,locale,false); }
    @PostMapping("/progress")
    public ResponseEntity<?> update(HttpSession session,@RequestHeader(value="X-Learning-Actor",required=false)String expectedActor,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestBody LearningProgressContracts.Change change,@RequestParam(defaultValue="es-MX")String locale) {
        return invoke(session,expectedActor,token,change,locale,true);
    }
    private ResponseEntity<?> invoke(HttpSession session,String expectedActor,String token,LearningProgressContracts.Change change,String locale,boolean write) {
        var actor=sessions.currentUser(session);
        if(actor.isEmpty()) return ResponseEntity.status(401).body(Map.of("code","unauthorized"));
        // A precondition only: authority always comes from the authenticated session.
        if(!(actor.get().companyId()+":"+actor.get().userId()).equals(expectedActor))return ResponseEntity.status(409).body(Map.of("code","learning_actor_changed"));
        if(write)try {csrf.requireCsrf(session,token);}
        catch(IllegalArgumentException e) {return ResponseEntity.status(403).body(Map.of("code","invalid_csrf","message","Invalid CSRF token."));}
        try { return ResponseEntity.ok(write?learning.update(actor.get(),change,locale):learning.get(actor.get(),locale)); }
        catch(SecurityException e) { return ResponseEntity.status(403).body(Map.of("code","learning_permission_required")); }
        catch(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("code","invalid_request","message",e.getMessage())); }
    }
}
