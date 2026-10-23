package com.indice.erp.sales.funneling.brand;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.*;
import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Component
public class BrandAccess {
    private final SessionAuthService auth;private final SessionCsrfService csrf;
    private final ModuleAccessService modules;private final TabPermissionAccessService tabs;private final JdbcTemplate db;
    public BrandAccess(SessionAuthService auth,SessionCsrfService csrf,ModuleAccessService modules,TabPermissionAccessService tabs,JdbcTemplate db){this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;this.db=db;}
    public AuthSessionUser actor(HttpSession session,String csrfToken,boolean write){
        var a=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(UNAUTHORIZED));
        require(!auth.isPublicDemoSession(session),FORBIDDEN,"brand_access_denied");read(a);
        if(write)try{csrf.requireCsrf(session,csrfToken);}catch(IllegalArgumentException e){throw new ResponseStatusException(FORBIDDEN);}
        return a;
    }
    public void read(AuthSessionUser a){require(modules.canAccess(a,"crm")&&tabs.canAccess(a,TabPermissionRequirement.one("crm.funneling")),FORBIDDEN,"brand_access_denied");}
    public void mutation(AuthSessionUser a,String expected){
        read(a);require(key(a).equals(expected),CONFLICT,"brand_actor_changed");
        require(!db.queryForList("SELECT id FROM user_companies WHERE company_id=? AND user_id=? AND status='active' FOR UPDATE",a.companyId(),a.userId()).isEmpty(),FORBIDDEN,"brand_access_denied");
        db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,a.companyId());
        require(modules.companyCanAccessForMutation(a.companyId(),"crm"),FORBIDDEN,"brand_access_denied");
    }
    public static String key(AuthSessionUser a){return "funneling-brand:"+a.companyId()+":"+a.userId();}
    public static void uuid(String id){try{require(UUID.fromString(id).toString().equals(id),BAD_REQUEST,"brand_id_invalid");}catch(IllegalArgumentException|NullPointerException e){throw new ResponseStatusException(BAD_REQUEST,"brand_id_invalid");}}
    public static void require(boolean ok,org.springframework.http.HttpStatus status,String code){if(!ok)throw new ResponseStatusException(status,code);}
}
