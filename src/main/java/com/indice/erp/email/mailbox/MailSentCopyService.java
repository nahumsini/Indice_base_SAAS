package com.indice.erp.email.mailbox;
import com.indice.erp.auth.AuthSessionUser;
import org.springframework.stereotype.Service;
import static com.indice.erp.email.mailbox.MailboxAccess.*;
import static org.springframework.http.HttpStatus.*;
@Service
public class MailSentCopyService {
    private final MailboxAccess access;private final MailOperationsRepository operations;private final MailboxTransport transport;private final MailAttachmentService attachments;
    public MailSentCopyService(MailboxAccess access,MailOperationsRepository operations,MailboxTransport transport,MailAttachmentService attachments){this.access=access;this.operations=operations;this.transport=transport;this.attachments=attachments;}
    public MailboxContracts.Message copy(AuthSessionUser actor,String account,String id){
        var row=access.repository.get(actor,account,id);var a=access.read(actor,account);
        require(row.view().state().equals("ACCEPTED"),CONFLICT,"email_message_changed");access.sameVersion(a,row.accountVersion());
        if(row.view().sentCopyState().equals("COPIED"))return row.view();
        if(!a.receiveProtocol().equals("IMAP")){operations.copyState(actor,account,id,"UNAVAILABLE");return access.repository.get(actor,account,id).view();}
        var material=access.accounts.connection(actor,account,false);access.sameVersion(material.account(),a.version());
        String lease=access.tx.execute(s->{access.sameVersion(access.mutation(actor,account),a.version());return access.lease(actor,account);});
        try{
            row=access.repository.get(actor,account,id);if(row.view().sentCopyState().equals("COPIED"))return row.view();
            String name=operations.preferences(actor,account).sentFolder();
            if(name==null)name=transport.folders(material).stream().filter(f->f.kind().equals("SENT")).map(MailboxTransport.FolderInfo::name).findFirst().orElse(null);
            if(name==null){operations.copyState(actor,account,id,"UNAVAILABLE");return access.repository.get(actor,account,id).view();}
            boolean append=!java.util.Set.of("COPYING","UNKNOWN").contains(row.view().sentCopyState());
            var m=row.view();var outgoing=new MailboxTransport.Outgoing(row.messageId(),m.subject(),m.bodyText(),m.to(),m.cc(),m.bcc(),row.inReplyTo(),row.references(),m.bodyHtml(),attachments.outgoing(actor,account,id),m.replyTo().isEmpty()?null:m.replyTo().getFirst(),null,m.fromName());
            access.tx.executeWithoutResult(s->{access.sameVersion(access.mutation(actor,account),a.version());operations.copyState(actor,account,id,"COPYING");});
            MailboxTransport.CopyOutcome result;
            try{result=transport.copySent(material,outgoing,name,append);}catch(RuntimeException e){result=MailboxTransport.CopyOutcome.UNKNOWN;}
            operations.copyState(actor,account,id,result==null||!append&&result!=MailboxTransport.CopyOutcome.COPIED?"UNKNOWN":result.name());
            access.sameVersion(access.read(actor,account),a.version());return access.repository.get(actor,account,id).view();
        }finally{access.release(actor,account,lease);}
    }
}
