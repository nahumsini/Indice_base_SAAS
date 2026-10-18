package com.indice.erp.email.mailbox;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.email.accounts.EmailAccountContracts;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
import static com.indice.erp.email.mailbox.MailboxAccess.*;
import static org.springframework.http.HttpStatus.*;
/** Explicit Sales -> Email port. Credentials and mailbox content never leave the Email owner. */
@Service
public class CampaignEmailGateway {
    private final MailboxAccess access;private final MailDraftService drafts;
    public CampaignEmailGateway(MailboxAccess access,MailDraftService drafts){this.access=access;this.drafts=drafts;}
    public record Sender(String id,String email,String name,long version,boolean verified) { }
    public Sender sender(AuthSessionUser actor,String account){var a=access.read(actor,account);access.accounts.requireSender(actor,account);return new Sender(a.id(),a.email(),a.displayName(),a.version(),a.smtpStatus().equals("VERIFIED"));}
    public String outcome(AuthSessionUser actor,String account,String id){access.read(actor,account);return access.repository.draftCandidate(actor,account,id).map(r->r.view().state()).orElse("ABSENT");}
    public String send(AuthSessionUser actor,String account,long version,String id,String to,String subject,String body,String replyTo,String displayName){
        var message=access.tx.execute(s->{var a=access.mutation(actor,account);access.accounts.requireSender(actor,account);access.sameVersion(a,version);
            var old=access.repository.draftCandidate(actor,account,id);if(old.isPresent())return old.get().view();
            var saved=drafts.save(actor,account,id,new DraftInput(0,version,List.of(to),List.of(),List.of(),subject,body,null));
            if(replyTo!=null&&!replyTo.isBlank()){try{var address=new jakarta.mail.internet.InternetAddress(replyTo,true);address.validate();require(!replyTo.contains("\r")&&!replyTo.contains("\n")&&address.getPersonal()==null&&!address.isGroup(),BAD_REQUEST,"email_recipient_invalid");}catch(jakarta.mail.internet.AddressException invalid){throw new org.springframework.web.server.ResponseStatusException(BAD_REQUEST,"email_recipient_invalid");}}
            require(displayName!=null&&!displayName.contains("\r")&&!displayName.contains("\n")&&displayName.length()<=160,BAD_REQUEST,"email_header_invalid");access.repository.campaignReplyTo(actor,account,id,replyTo,displayName.isBlank()?a.displayName():displayName);return saved;
        });
        return drafts.send(actor,account,id,new Version(message.version(),version)).state();
    }
}
