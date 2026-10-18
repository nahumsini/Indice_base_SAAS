package com.indice.erp.sales.mailing;

import com.indice.erp.auth.*;
import com.indice.erp.access.module.*;
import com.indice.erp.access.tab.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.mailing.MailingContracts.*;
import static com.indice.erp.sales.mailing.MailingTemplateContracts.*;

@RestController
@RequestMapping("/api/v1/mailing")
@RequiresModuleAccess("crm")
public class MailingController {
    private final com.indice.erp.email.accounts.EmailAccountService emailAccounts;
    private final SessionAuthService auth;private final SessionCsrfService csrf;
    private final ModuleAccessService modules;private final TabPermissionAccessService tabs;private final MailingService service;private final MailingTemplateService templates;
    public MailingController(SessionAuthService auth,SessionCsrfService csrf,ModuleAccessService modules,TabPermissionAccessService tabs,MailingService service,MailingTemplateService templates,com.indice.erp.email.accounts.EmailAccountService emailAccounts){this.emailAccounts=emailAccounts;this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;this.service=service;this.templates=templates;}
    private AuthSessionUser actor(HttpSession session,String token,boolean write,boolean contacts) {
        var actor=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!modules.canAccess(actor,"crm")||!tabs.canAccess(actor,TabPermissionRequirement.one("crm.mailing"))
            ||contacts&&!tabs.canAccess(actor,TabPermissionRequirement.one("crm.contacts")))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write){
            try {csrf.requireCsrf(session,token);}catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        }
        return actor;
    }
    @GetMapping("/senders") public java.util.List<com.indice.erp.email.accounts.EmailAccountContracts.Sender> senders(HttpSession session) {return emailAccounts.senders(actor(session,null,false,false));}
    @GetMapping("/campaigns") public CampaignPage list(HttpSession session,@RequestParam(defaultValue="")String search,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize,@RequestParam(defaultValue="updatedAt")String sort,@RequestParam(defaultValue="desc")String direction){var actor=actor(session,null,false,false);var result=service.list(actor,search,page,pageSize,sort,direction);return new CampaignPage(result.items(),result.total(),result.page(),result.pageSize(),result.canEdit()&&tabs.canAccess(actor,TabPermissionRequirement.one("crm.contacts")),tabs.canAccess(actor,TabPermissionRequirement.one("crm.contacts")));}
    @GetMapping("/campaigns/{id}") public Campaign get(HttpSession session,@PathVariable String id){return service.get(actor(session,null,false,true),id);}
    @GetMapping("/contacts") public ContactPage contacts(HttpSession session,@RequestParam(defaultValue="")String search,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize){return service.contacts(actor(session,null,false,true),search,page,pageSize);}
    @PutMapping("/campaigns/{id}") public Campaign save(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false)String token,@PathVariable String id,@Valid @RequestBody DraftInput input){return service.save(actor(session,token,true,true),id,input);}

    @GetMapping("/templates")
    public TemplatePage templates(HttpSession session,@RequestParam(defaultValue="") String search,
        @RequestParam(defaultValue="ACTIVE") String status,@RequestParam(defaultValue="1") int page,
        @RequestParam(defaultValue="25") int pageSize,@RequestParam(defaultValue="updatedAt") String sort,
        @RequestParam(defaultValue="desc") String direction) {
        return templates.list(actor(session,null,false,false),search,status,page,pageSize,sort,direction);
    }
    @GetMapping("/templates/{id}")
    public Template template(HttpSession session,@PathVariable String id) {
        return templates.get(actor(session,null,false,false),id);
    }
    @PutMapping("/templates/{id}")
    public Template template(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,
        @PathVariable String id,@Valid @RequestBody TemplateInput input) {
        return templates.save(actor(session,token,true,false),id,input);
    }
    @PostMapping("/templates/{id}/status")
    public Template templateStatus(HttpSession session,@RequestHeader(name="X-CSRF-Token",required=false) String token,
        @PathVariable String id,@Valid @RequestBody TemplateStatus input) {
        return templates.status(actor(session,token,true,false),id,input);
    }
}
