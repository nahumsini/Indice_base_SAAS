package com.indice.erp.sales.mailing;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.email.mailbox.CampaignEmailGateway;
import com.indice.erp.billing.BillingHashing;
import jakarta.mail.internet.InternetAddress;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.mailing.MailingDeliveryContracts.*;
import static com.indice.erp.sales.mailing.MailingDeliveryAccess.require;
import static org.springframework.http.HttpStatus.*;
@Service
public class MailingDeliveryService {
    private final MailingFileService files;
    private final MailingDeliveryAccess access;private final MailingService campaigns;private final MailingDeliveryRepository repository;private final CampaignEmailGateway email;private final MailingUnsubscribeService unsubscribe;private final TransactionTemplate tx;
    public MailingDeliveryService(MailingDeliveryAccess access,MailingService campaigns,MailingDeliveryRepository repository,CampaignEmailGateway email,MailingUnsubscribeService unsubscribe,PlatformTransactionManager manager,MailingFileService files){this.files=files;this.access=access;this.campaigns=campaigns;this.repository=repository;this.email=email;this.unsubscribe=unsubscribe;this.tx=new TransactionTemplate(manager);}
    static String content(MailingContracts.Campaign campaign){return (campaign.previewText().isBlank()?"":campaign.previewText()+"\n\n")+campaign.bodyText();}
    static String formatted(MailingContracts.Campaign campaign,String name,String footer){
        if(campaign.bodyHtml()==null)return null;
        String html=campaign.bodyHtml().replace("{{name}}",com.indice.erp.email.mailbox.SafeMailHtml.escape(name));
        if(!campaign.previewText().isBlank())html="<p>"+com.indice.erp.email.mailbox.SafeMailHtml.escape(personalize(campaign.previewText(),name))+"</p>"+html;
        return html+(footer==null?"":"<p>"+com.indice.erp.email.mailbox.SafeMailHtml.escape(footer).replace("\n","<br>")+"</p>");
    }
    static String personalize(String text,String name){return text.replace("{{name}}",name);}
    static boolean address(String value){try{var a=new InternetAddress(value,true);a.validate();return value.length()<=240&&!value.contains("\r")&&!value.contains("\n")&&a.getPersonal()==null&&!a.isGroup()&&a.getAddress().equals(value);}catch(Exception e){return false;}}
    public Review review(AuthSessionUser actor,String id){var a=access.read(actor);var c=campaigns.get(a,id);CampaignEmailGateway.Sender sender=null;
        if(c.senderAccountId()!=null)try{sender=email.sender(a,c.senderAccountId());if(!c.senderName().isBlank())sender=new CampaignEmailGateway.Sender(sender.id(),sender.email(),c.senderName(),sender.version(),sender.verified());}catch(ResponseStatusException ignored){ }
        var seen=new HashSet<String>();var audience=repository.audience(a.companyId(),id).stream().map(p->new Audience(p.contactId(),p.name(),p.email(),!address(p.email())?"INVALID":!seen.add(p.email())?"DUPLICATE":p.eligibility())).toList();
        String digest=BillingHashing.sha256(c.id()+":"+c.version()+":"+(sender==null?"":sender.id()+":"+sender.version())+":"+audience.stream().map(p->p.contactId()+":"+p.name()+":"+p.email()+":"+p.eligibility()).reduce("",(x,y)->x+"|"+y));
        return new Review(id,c.version(),c.status(),c.subject(),content(c),c.replyTo(),sender,audience,digest,access.canSend(a),unsubscribe.available(),c.attachments());
    }
    public void consent(AuthSessionUser actor,Consent input){tx.executeWithoutResult(s->{var a=access.write(actor);require(!input.consentedAt().isAfter(Instant.now().plusSeconds(60)),BAD_REQUEST,"mailing_consent_date_invalid");for(long id:new HashSet<>(input.contactIds())){var address=repository.contactEmail(a.companyId(),id);require(address(address),BAD_REQUEST,"mailing_contact_unavailable");repository.consent(a,address,input.evidence().trim(),input.consentedAt());}});}
    public Results launch(AuthSessionUser actor,String id,Launch input){return tx.execute(s->{var a=access.write(actor);var c=campaigns.get(a,id);
        // Replayed launch observes the same durable run, never creates another audience.
        if(!c.status().equals("DRAFT")){require(repository.run(a.companyId(),id)!=null,CONFLICT,"mailing_campaign_locked");return results(a,id);}
        var review=review(a,id);require(review.version()==input.version()&&review.digest().equals(input.digest()),CONFLICT,"mailing_review_changed");require(review.sender()!=null&&review.sender().version()==input.accountVersion()&&review.sender().verified(),CONFLICT,"mailing_sender_not_verified");require(review.publicLinkReady(),CONFLICT,"mailing_public_url_required");
        require(!c.subject().isBlank()&&!c.bodyText().isBlank()&&!c.subject().contains("\r")&&!c.subject().contains("\n")&&c.bodyText().length()<=18000,BAD_REQUEST,"mailing_content_required");
        require(!c.senderName().contains("\r")&&!c.senderName().contains("\n"),BAD_REQUEST,"mailing_sender_invalid");
        require(c.replyTo().isBlank()||address(c.replyTo()),BAD_REQUEST,"mailing_reply_to_invalid");
        var eligible=review.audience().stream().filter(p->p.eligibility().equals("READY")).toList();
        if(input.contactIds()!=null){
            require(input.contactIds().size()<=500&&input.contactIds().stream().allMatch(value->value!=null&&value>0),BAD_REQUEST,"mailing_selection_invalid");
            var selected=new HashSet<>(input.contactIds());
            eligible=eligible.stream().filter(person->selected.contains(person.contactId())).toList();
            require(eligible.size()==selected.size(),CONFLICT,"mailing_recipient_unavailable");
        }
        require(!eligible.isEmpty(),CONFLICT,"mailing_no_recipients");
        String sampleFooter=input.footer()+"\n\nUnsubscribe / Cancelar suscripción:\n"+unsubscribe.link("00000000-0000-0000-0000-000000000000");
        for(var person:eligible){String html=formatted(c,person.name(),sampleFooter);require(html==null||html.length()<=500000,BAD_REQUEST,"mailing_content_too_long");require(personalize(content(c),person.name()).length()+input.footer().length()+250<=20000&&personalize(c.subject(),person.name().replaceAll("[\\r\\n]"," ")).length()<=240,BAD_REQUEST,"mailing_content_too_long");}
        Instant when=input.scheduledAt()==null?Instant.now():input.scheduledAt();require(!when.isBefore(Instant.now().minusSeconds(60))&&!when.isAfter(Instant.now().plusSeconds(365*86400L)),BAD_REQUEST,"mailing_schedule_invalid");
        repository.launch(a,c,input.accountVersion(),when,input.footer().trim(),eligible);return results(a,id);
    });}
    public SendResult test(AuthSessionUser actor,String id,TestInput input){var a=access.current(actor);var c=tx.execute(s->{access.write(a);var campaign=campaigns.get(a,id);require(campaign.version()==input.version(),CONFLICT,"mailing_review_changed");require(campaign.senderAccountId()!=null&&!campaign.subject().isBlank()&&!campaign.bodyText().isBlank(),BAD_REQUEST,"mailing_content_required");return campaign;});
        require(address(input.to()),BAD_REQUEST,"mailing_recipient_invalid");var sender=email.sender(a,c.senderAccountId());require(sender.verified(),CONFLICT,"mailing_sender_not_verified");
        String key=UUID.nameUUIDFromBytes(("mailing-test:"+a.companyId()+":"+id+":"+input.version()+":"+input.to()+":"+input.requestId()).getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
        return new SendResult(email.send(a,sender.id(),sender.version(),key,input.to(),"[TEST] "+c.subject().substring(0,Math.min(c.subject().length(),230)),content(c),c.replyTo(),c.senderName(),formatted(c,"{{name}}",null),files.campaignSnapshot(a,id)));
    }
    public Results results(AuthSessionUser actor,String id){var a=access.read(actor);var c=campaigns.get(a,id);var run=repository.run(a.companyId(),id);return new Results(c.status(),c.version(),run==null?null:run.scheduled(),run==null?null:run.lastError(),repository.deliveries(a.companyId(),id),access.canSend(a));}
    public Results control(AuthSessionUser actor,String id,Control in){return tx.execute(s->{var a=access.write(actor);var c=campaigns.get(a,id);require(c.version()==in.version(),CONFLICT,"mailing_review_changed");var run=repository.run(a.companyId(),id);require(run!=null,CONFLICT,"mailing_campaign_locked");
        if(in.action().equals("PAUSE")){require(Set.of("SCHEDULED","RUNNING").contains(c.status()),CONFLICT,"mailing_campaign_locked");repository.state(a.companyId(),id,"PAUSED");}
        else if(in.action().equals("RESUME")){require(c.status().equals("PAUSED"),CONFLICT,"mailing_campaign_locked");var sender=email.sender(a,run.account());require(sender.version()==run.accountVersion()&&sender.verified(),CONFLICT,"mailing_sender_changed");repository.state(a.companyId(),id,"RUNNING");}
        else {require(Set.of("SCHEDULED","RUNNING","PAUSED").contains(c.status()),CONFLICT,"mailing_campaign_locked");repository.state(a.companyId(),id,"CANCELLED");repository.cancel(a.companyId(),id);}
        repository.audit(a,id,c.version()+1,in.action());return results(a,id);
    });}
    public void tick(){for(var run:repository.due())process(run);}
    private record Work(AuthSessionUser actor,MailingContracts.Campaign campaign,Delivery recipient,String lease){ }
    private void process(MailingDeliveryRepository.Run run){String token=UUID.randomUUID().toString();Work work;
        try{work=tx.execute(s->{var a=access.write(new AuthSessionUser(run.owner(),run.company(),"Campaign worker",""));var c=campaigns.get(a,run.campaign());if(!Set.of("SCHEDULED","RUNNING").contains(c.status())||!repository.lease(run,token))return null;
            var sender=email.sender(a,run.account());require(sender.version()==run.accountVersion()&&sender.verified(),CONFLICT,"mailing_sender_changed");var next=repository.next(run);
            if(next==null){repository.state(run.company(),run.campaign(),"COMPLETED");repository.release(run,token,null,60);return null;}
            if(c.status().equals("SCHEDULED"))repository.state(run.company(),run.campaign(),"RUNNING");
            if(next.state().equals("PENDING")&&!repository.eligible(run.company(),next.email())){repository.outcome(run,next.id(),"SUPPRESSED");repository.release(run,token,null,1);return null;}
            repository.outcome(run,next.id(),"SUBMITTING");return new Work(a,c,next,token);
        });}catch(RuntimeException failure){pauseUnavailable(run);return;}
        if(work==null)return;
        String state="UNKNOWN",error=null;int delay=2;
        try{
            String current=email.outcome(work.actor(),run.account(),work.recipient().id());
            if(Set.of("ACCEPTED","FAILED","UNKNOWN","SUBMITTING").contains(current))state=current.equals("SUBMITTING")?"UNKNOWN":current;
            else {
                // Last permission/suppression check is serialized against unsubscribe, immediately before authorizing transport.
                boolean eligible=tx.execute(s->{access.write(work.actor());return repository.eligible(run.company(),work.recipient().email());});
                if(!eligible)state="SUPPRESSED";
                else {String body=personalize(content(work.campaign()),work.recipient().name())+"\n\n"+run.footer()+"\n\nUnsubscribe / Cancelar suscripción:\n"+unsubscribe.link(work.recipient().id());state=email.send(work.actor(),run.account(),run.accountVersion(),work.recipient().id(),work.recipient().email(),personalize(work.campaign().subject(),work.recipient().name().replaceAll("[\\r\\n]"," ")),body,work.campaign().replyTo(),work.campaign().senderName(),formatted(work.campaign(),work.recipient().name(),run.footer()+"\n\nUnsubscribe / Cancelar suscripción:\n"+unsubscribe.link(work.recipient().id())),files.campaignSnapshot(work.actor(),run.campaign()));}
            }
        }catch(ResponseStatusException failure){
            error=failure.getReason()!=null&&failure.getReason().matches("(?:email|mailing)_[a-z_]+")?failure.getReason():"mailing_send_unavailable";
            // SMTP intent is authoritative. A preflight/limit failure may safely wait; ambiguous transport is never retried.
            try{String observed=email.outcome(work.actor(),run.account(),work.recipient().id());state=Set.of("ABSENT","DRAFT").contains(observed)?"PENDING":observed.equals("SUBMITTING")?"UNKNOWN":observed;}catch(RuntimeException denied){state="UNKNOWN";}
            delay=failure.getStatusCode().value()==429?300:60;
        }catch(RuntimeException failure){error="mailing_send_unavailable";}
        String result=state,reason=error;int wait=delay;
        tx.executeWithoutResult(s->{repository.outcome(run,work.recipient().id(),result);repository.release(run,token,reason,wait);});
    }
    private void pauseUnavailable(MailingDeliveryRepository.Run run){tx.executeWithoutResult(s->{repository.pauseUnavailable(run);});}
}
