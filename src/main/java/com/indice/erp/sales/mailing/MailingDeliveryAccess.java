package com.indice.erp.sales.mailing;
import com.indice.erp.auth.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.email.mailbox.MailOperationsRepository;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Component
public class MailingDeliveryAccess {
    private final ModuleAccessService modules;private final TabPermissionAccessService tabs;private final MailOperationsRepository identities;private final JdbcTemplate db;
    public MailingDeliveryAccess(ModuleAccessService modules,TabPermissionAccessService tabs,MailOperationsRepository identities,JdbcTemplate db){this.modules=modules;this.tabs=tabs;this.identities=identities;this.db=db;}
    public AuthSessionUser current(AuthSessionUser actor){return identities.current(actor.companyId(),actor.userId());}
    AuthSessionUser read(AuthSessionUser actor){var a=current(actor);require(modules.canAccess(a,"crm")&&tabs.canAccess(a,TabPermissionRequirement.one("crm.mailing"))&&tabs.canAccess(a,TabPermissionRequirement.one("crm.contacts")),HttpStatus.FORBIDDEN,"mailing_access_denied");return a;}
    boolean canSend(AuthSessionUser a){return MailingService.manager(a)&&tabs.canAccess(a,TabPermissionRequirement.one("crm.mailing_send"));}
    AuthSessionUser write(AuthSessionUser actor){db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,actor.companyId());var a=read(actor);require(canSend(a)&&modules.companyCanAccessForMutation(a.companyId(),"crm"),HttpStatus.FORBIDDEN,"mailing_send_forbidden");return a;}
    static void require(boolean ok,HttpStatus status,String code){if(!ok)throw new ResponseStatusException(status,code);}
}
