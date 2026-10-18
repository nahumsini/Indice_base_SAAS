package com.indice.erp.email.accounts;

import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.email.accounts.EmailAccountContracts.*;

@RestController
@RequestMapping("/api/v1/email/accounts")
@RequiresModuleAccess("correo")
public class EmailAccountController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;
    private final TabPermissionAccessService tabs;private final EmailAccountService accounts;
    public EmailAccountController(SessionAuthService auth,SessionCsrfService csrf,TabPermissionAccessService tabs,EmailAccountService accounts) {
        this.auth=auth;this.csrf=csrf;this.tabs=tabs;this.accounts=accounts;
    }
    private AuthSessionUser actor(HttpSession session,String token,boolean mutation) {
        var actor=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!tabs.canAccess(actor,TabPermissionRequirement.one("correo.accounts")))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(mutation)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        return actor;
    }
    @GetMapping public Accounts list(HttpSession session){return accounts.list(actor(session,null,false));}
    @PutMapping("/{id}") public Account save(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String id,@Valid @RequestBody AccountInput input) {
        return accounts.save(actor(session,token,true),id,input);
    }
    @PostMapping("/{id}/test") public Account test(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String id,@Valid @RequestBody ConnectionTest input) {
        return accounts.test(actor(session,token,true),id,input);
    }
    @PostMapping("/{id}/disconnect") public void disconnect(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,@PathVariable String id,@Valid @RequestBody Version input) {
        accounts.disconnect(actor(session,token,true),id,input.version());
    }
}
