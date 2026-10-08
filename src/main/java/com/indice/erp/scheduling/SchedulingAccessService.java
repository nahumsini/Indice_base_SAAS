package com.indice.erp.scheduling;

import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import jakarta.servlet.http.HttpSession;
import java.util.Set;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SchedulingAccessService {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    public SchedulingAccessService(SessionAuthService auth,SessionCsrfService csrf,
        ModuleAccessService modules,TabPermissionAccessService tabs) {
        this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;
    }
    public AuthSessionUser require(HttpSession session,String tab,String token,boolean write) {
        return requireAny(session,List.of(tab),token,write);
    }
    public AuthSessionUser requireAny(HttpSession session,List<String> allowedTabs,String token,boolean write) {
        var user=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!modules.canAccess(user,"scheduling")
            ||!tabs.canAccess(user,new TabPermissionRequirement(allowedTabs.stream().map(tab->"scheduling."+tab).toList())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write)try {csrf.requireCsrf(session,token);}catch(IllegalArgumentException invalid){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Invalid request authorization.");
        }
        return user;
    }
    public static boolean administrator(AuthSessionUser user) {
        return Set.of("root","superadmin","super admin","admin","owner","dueno")
            .contains(user.role().toLowerCase(java.util.Locale.ROOT));
    }
    public static void requireAdministrator(AuthSessionUser user) {
        if(!administrator(user))throw new SecurityException("Company administrator required.");
    }
}
