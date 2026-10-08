package com.indice.erp.meetings;

import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MeetingAccessService {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final ModuleAccessService modules;
    private final TabPermissionAccessService tabs;
    public MeetingAccessService(SessionAuthService auth,SessionCsrfService csrf,ModuleAccessService modules,TabPermissionAccessService tabs) {
        this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;
    }
    public AuthSessionUser require(HttpSession session,List<String> scopes,String token,boolean write) {
        var actor=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!modules.canAccess(actor,"control_minutas")||
            !tabs.canAccess(actor,new TabPermissionRequirement(scopes.stream().map(t->"control_minutas."+t).toList())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException invalid){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Invalid request authorization.");
        }
        return actor;
    }
    public static boolean administrator(AuthSessionUser actor) {
        return Set.of("root","superadmin","super admin","admin","owner","dueno").contains(actor.role().toLowerCase(Locale.ROOT));
    }
}
