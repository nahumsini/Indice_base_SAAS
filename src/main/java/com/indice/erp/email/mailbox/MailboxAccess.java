package com.indice.erp.email.mailbox;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.email.accounts.EmailAccountService;
import com.indice.erp.email.accounts.EmailAccountContracts.Account;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MailboxAccess {
    final EmailAccountService accounts;final MailboxRepository repository;final TransactionTemplate tx;
    private final ModuleAccessService modules;private final TabPermissionAccessService tabs;
    public MailboxAccess(EmailAccountService accounts,MailboxRepository repository,ModuleAccessService modules,TabPermissionAccessService tabs,PlatformTransactionManager manager){
        this.accounts=accounts;this.repository=repository;this.modules=modules;this.tabs=tabs;this.tx=new TransactionTemplate(manager);
    }
    static void require(boolean condition,HttpStatus status,String code){if(!condition)throw new ResponseStatusException(status,code);}
    void access(AuthSessionUser actor){require(modules.canAccess(actor,"correo")&&tabs.canAccess(actor,TabPermissionRequirement.one("correo.mail")),HttpStatus.FORBIDDEN,"email_access_denied");}
    Account read(AuthSessionUser actor,String id){access(actor);return accounts.get(actor,id);}
    Account mutation(AuthSessionUser actor,String id){
        access(actor);repository.lockCompany(actor);
        require(modules.companyCanAccessForMutation(actor.companyId(),"correo"),HttpStatus.FORBIDDEN,"email_access_denied");return accounts.get(actor,id);
    }
    String lease(AuthSessionUser actor,String account){
        String token=UUID.randomUUID().toString();
        boolean claimed=repository.lease(actor,account,token);
        require(claimed,HttpStatus.CONFLICT,"email_operation_in_progress");return token;
    }
    void release(AuthSessionUser actor,String account,String token){tx.executeWithoutResult(s->repository.release(actor,account,token));}
    void sameVersion(Account account,long version){require(account.version()==version,HttpStatus.CONFLICT,"email_account_changed");}
    MailboxContracts.Folder folder(AuthSessionUser actor,String account,long version,String id){return repository.folders(actor,account,version).stream().filter(f->f.id().equals(id)).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"email_folder_not_found"));}
    MailboxRepository.Row message(AuthSessionUser actor,String account,long version,String id){
        var row=repository.get(actor,account,id);require(row.uid()==null||row.accountVersion()==version,HttpStatus.NOT_FOUND,"email_message_not_found");
        if(row.uid()!=null)require(folder(actor,account,version,row.view().folderId()).uidValidity()==row.validity(),HttpStatus.CONFLICT,"email_folder_changed");
        return row;
    }
    static MailboxTransport.Cursor cursor(MailboxContracts.Folder folder){return new MailboxTransport.Cursor(folder.name(),folder.uidValidity(),folder.newestUid(),folder.oldestUid());}
}
