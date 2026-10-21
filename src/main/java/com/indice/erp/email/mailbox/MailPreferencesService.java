package com.indice.erp.email.mailbox;
import com.indice.erp.auth.AuthSessionUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
import static com.indice.erp.email.mailbox.MailboxAccess.*;
@Service
public class MailPreferencesService {
    private final MailboxAccess access;private final MailOperationsRepository operations;private final MailboxTransport transport;
    public MailPreferencesService(MailboxAccess access,MailOperationsRepository operations,MailboxTransport transport){this.access=access;this.operations=operations;this.transport=transport;}
    public Preferences get(AuthSessionUser actor,String account){access.read(actor,account);return operations.preferences(actor,account);}
    public Preferences save(AuthSessionUser actor,String account,PreferencesInput input){
        require(input.signature()==null||input.signature().length()<=2000&&!input.signature().contains("\u0000"),HttpStatus.BAD_REQUEST,"email_signature_invalid");
        var a=access.read(actor,account);access.sameVersion(a,input.accountVersion());
        require(!input.backgroundEnabled()||a.receiveProtocol().equals("IMAP"),HttpStatus.BAD_REQUEST,"email_imap_required");
        if(input.sentFolder()!=null)require(access.repository.folders(actor,account,a.version()).stream().anyMatch(f->f.name().equals(input.sentFolder())),HttpStatus.BAD_REQUEST,"email_folder_invalid");
        return access.tx.execute(s->{access.sameVersion(access.mutation(actor,account),input.accountVersion());require(operations.preferences(actor,account,input),HttpStatus.CONFLICT,"email_preferences_changed");access.repository.audit(actor,account,a.version(),"PREFERENCES_SAVED");return operations.preferences(actor,account);});
    }
}
