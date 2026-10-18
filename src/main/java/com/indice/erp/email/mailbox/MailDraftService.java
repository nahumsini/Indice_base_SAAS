package com.indice.erp.email.mailbox;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.email.accounts.EmailAccountService.ConnectionMaterial;
import jakarta.mail.internet.InternetAddress;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import static com.indice.erp.email.mailbox.MailboxContracts.*;
import static com.indice.erp.email.mailbox.MailboxAccess.*;

@Service
public class MailDraftService {
    private final MailboxAccess access;private final MailboxRepository repository;private final MailboxTransport transport;private final MailAttachmentService attachments;
    public MailDraftService(MailboxAccess access,MailboxRepository repository,MailboxTransport transport,MailAttachmentService attachments){this.access=access;this.repository=repository;this.transport=transport;this.attachments=attachments;}
    public Message save(AuthSessionUser actor,String account,String id,DraftInput input){return access.tx.execute(s->{
        var a=access.mutation(actor,account);access.sameVersion(a,input.accountVersion());
        try{require(UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"email_id_invalid");}catch(IllegalArgumentException e){throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"email_id_invalid");}
        validate(input);var existing=repository.draftCandidate(actor,account,id);
        String inReplyTo=null,references=null;
        if(existing.isEmpty()){
            require(input.version()==0,HttpStatus.CONFLICT,"email_message_changed");
            require(repository.draftCount(actor,account)<100,HttpStatus.CONFLICT,"email_draft_limit");
            if(input.replyToMessageId()!=null){var source=access.message(actor,account,a.version(),input.replyToMessageId());inReplyTo=source.messageId();references=threadReferences(source.references(),source.messageId());}
            repository.insertDraft(actor,a,id,input,inReplyTo,references);
        }else{
            var old=existing.orElseThrow();require(old.view().state().equals("DRAFT")&&old.view().version()==input.version(),HttpStatus.CONFLICT,"email_message_changed");
            repository.updateDraft(actor,a,id,input);
        }
        repository.audit(actor,account,a.version(),"DRAFT_SAVED");return repository.get(actor,account,id).view();
    });}
    private void validate(DraftInput input){
        require(input.to().size()+input.cc().size()+input.bcc().size()<=20,HttpStatus.BAD_REQUEST,"email_recipient_limit");
        require(!input.subject().contains("\r")&&!input.subject().contains("\n"),HttpStatus.BAD_REQUEST,"email_header_invalid");
        var unique=new HashSet<String>();
        for(var list:List.of(input.to(),input.cc(),input.bcc()))for(String value:list){
            require(!value.contains("\r")&&!value.contains("\n")&&unique.add(value.toLowerCase(Locale.ROOT)),HttpStatus.BAD_REQUEST,"email_recipient_invalid");
            try{var address=new InternetAddress(value,true);address.validate();require(address.getPersonal()==null&&address.getAddress().equals(value)&&!address.isGroup(),HttpStatus.BAD_REQUEST,"email_recipient_invalid");}
            catch(jakarta.mail.internet.AddressException e){throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST,"email_recipient_invalid");}
        }
    }
    private static String threadReferences(String previous,String messageId){
        if(messageId==null)return null;String refs=(previous==null?"":previous+" ")+messageId;
        if(refs.length()>4000)refs=messageId;return refs.replaceAll("[\\r\\n]"," ");
    }
    public void discard(AuthSessionUser actor,String account,String id,Version input){access.tx.executeWithoutResult(s->{
        var a=access.mutation(actor,account);access.sameVersion(a,input.accountVersion());var row=repository.get(actor,account,id);
        require(row.view().state().equals("DRAFT")&&row.view().version()==input.version(),HttpStatus.CONFLICT,"email_message_changed");
        repository.discard(actor,account,id);repository.audit(actor,account,a.version(),"DRAFT_DISCARDED");
    });}
    private record Submission(ConnectionMaterial material,MailboxRepository.Row row,String lease,String attempt,MailboxTransport.Outgoing outgoing){@Override public String toString(){return "Submission[redacted]";}}
    public Message send(AuthSessionUser actor,String account,String id,Version input){
        var submission=access.tx.execute(s->{
            var a=access.mutation(actor,account);var row=repository.get(actor,account,id);
            if(Set.of("ACCEPTED","SUBMITTING","UNKNOWN","FAILED").contains(row.view().state()))return new Submission(null,row,null,null,null);
            access.sameVersion(a,input.accountVersion());require(row.accountVersion()==a.version(),HttpStatus.CONFLICT,"email_account_changed");
            require(row.view().state().equals("DRAFT")&&row.view().version()==input.version(),HttpStatus.CONFLICT,"email_message_changed");var m=row.view();
            require(!m.to().isEmpty()||!m.cc().isEmpty()||!m.bcc().isEmpty(),HttpStatus.BAD_REQUEST,"email_recipient_required");
            require(!m.subject().isBlank()&&m.bodyText()!=null&&!m.bodyText().isBlank(),HttpStatus.BAD_REQUEST,"email_content_required");
            require(repository.recentSendCount(actor,account)<30,HttpStatus.TOO_MANY_REQUESTS,"email_send_rate_limited");
            String lease=access.lease(actor,account),attempt=UUID.randomUUID().toString(),messageId="<"+id+"."+attempt+"@"+a.email().substring(a.email().lastIndexOf('@')+1)+">";
            var material=access.accounts.connection(actor,account,true);
            repository.submitting(actor,account,id,attempt,messageId);repository.audit(actor,account,a.version(),"SEND_REQUESTED");
            return new Submission(material,row,lease,attempt,new MailboxTransport.Outgoing(messageId,m.subject(),m.bodyText(),m.to(),m.cc(),m.bcc(),row.inReplyTo(),row.references(),m.bodyHtml(),attachments.outgoing(actor,account,id),m.replyTo().isEmpty()?null:m.replyTo().getFirst(),null,m.fromName()));
        });
        if(submission.material==null)return submission.row.view();
        MailboxTransport.Outcome outcome;
        try{outcome=transport.send(submission.material,submission.outgoing);}catch(RuntimeException ambiguous){outcome=MailboxTransport.Outcome.UNKNOWN;}
        String state=outcome.name();
        try{
            // Always persist transport truth even if access was revoked during the already-authorized operation.
            access.tx.executeWithoutResult(s->{
                repository.outcome(actor,account,id,submission.attempt,state);repository.audit(actor,account,submission.material.account().version(),"SEND_"+state);
            });
            access.read(actor,account);return repository.get(actor,account,id).view();
        }finally{access.release(actor,account,submission.lease);}
    }
}
