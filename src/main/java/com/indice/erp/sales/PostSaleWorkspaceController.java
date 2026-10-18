package com.indice.erp.sales;

import static com.indice.erp.sales.PostSaleWorkspaceDtos.*;
import com.indice.erp.auth.*;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.access.tab.TabPermissionRequirement;
import com.indice.erp.entitlement.RequiresCapability;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales/post-sales/workspace")
@RequiresCapability("sales")
@com.indice.erp.access.module.RequiresModuleAccess("sales")
public class PostSaleWorkspaceController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PostSaleWorkspaceService service;
    private final TabPermissionAccessService tabs;
    public PostSaleWorkspaceController(SessionAuthService auth,SessionCsrfService csrf,PostSaleWorkspaceService service,TabPermissionAccessService tabs) {
        this.auth=auth;this.csrf=csrf;this.service=service;this.tabs=tabs;
    }
    private boolean canReactivate(AuthSessionUser user) { return tabs.canAccess(user,TabPermissionRequirement.one("crm.leads")); }
    @GetMapping
    public ResponseEntity<?> workspace(HttpSession session,@RequestParam(defaultValue="won") String kind,@RequestParam(required=false) String search,
            @RequestParam(required=false) Long owner,@RequestParam(required=false) Long flow,@RequestParam(required=false) String stage,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="50") int pageSize) {
        return run(session,false,null,false,user->service.workspace(user.companyId(),kind,search,owner,flow,stage,page,pageSize,canReactivate(user)));
    }
    @GetMapping("/items/{kind}/{id}")
    public ResponseEntity<?> detail(HttpSession session,@PathVariable String kind,@PathVariable long id) {
        return run(session,false,null,false,user->service.detail(user.companyId(),kind,id));
    }
    @PutMapping("/items/{kind}/{id}")
    public ResponseEntity<?> save(HttpSession session,@PathVariable String kind,@PathVariable long id,
            @RequestHeader(name="X-CSRF-Token",required=false) String token,@RequestBody SaveWork request) {
        return run(session,true,token,false,user->service.save(user.companyId(),user.userId(),kind,id,request));
    }
    @PostMapping("/items/lost/{id}/reactivate")
    public ResponseEntity<?> reactivate(HttpSession session,@PathVariable long id,
            @RequestHeader(name="X-CSRF-Token",required=false) String token,@RequestBody Reactivate request) {
        return run(session,true,token,true,user->service.reactivate(user.companyId(),user.userId(),id,request));
    }
    @PostMapping("/flows")
    public ResponseEntity<?> createFlow(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@RequestBody SaveFlow request) {
        return run(session,true,token,false,user->service.saveFlow(user.companyId(),user.userId(),null,request));
    }
    @PutMapping("/flows/{id}")
    public ResponseEntity<?> updateFlow(HttpSession session,@PathVariable long id,@RequestHeader(name="X-CSRF-Token",required=false) String token,@RequestBody SaveFlow request) {
        return run(session,true,token,false,user->service.saveFlow(user.companyId(),user.userId(),id,request));
    }
    private ResponseEntity<?> run(HttpSession session,boolean mutation,String token,boolean leads,Function<AuthSessionUser,Object> action) {
        var user=auth.currentUser(session);
        if(user.isEmpty()||user.get().companyId()==null||user.get().userId()==null)return error(401,"unauthorized");
        if(!tabs.canAccess(user.get(),TabPermissionRequirement.one("crm.contracts"))||leads&&!canReactivate(user.get()))return error(403,"post_sale_forbidden");
        if(mutation) {try {csrf.requireCsrf(session,token);}catch(IllegalArgumentException ex){return error(403,"csrf_required");}}
        try{return ResponseEntity.ok(action.apply(user.get()));}
        catch(NoSuchElementException ex){return error(404,"post_sale_not_found");}
        catch(PostSaleWorkspaceService.Conflict ex){return error(409,"post_sale_conflict");}
        catch(IllegalArgumentException ex){return error(422,"post_sale_validation");}
    }
    private ResponseEntity<?> error(int status,String code){return ResponseEntity.status(status).body(Map.of("code",code,"message",code));}
}
