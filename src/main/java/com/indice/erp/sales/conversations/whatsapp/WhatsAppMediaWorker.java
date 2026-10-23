package com.indice.erp.sales.conversations.whatsapp;

import com.indice.erp.sales.conversations.*;
import com.indice.erp.access.module.ModuleAccessService;
import java.nio.charset.StandardCharsets;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class WhatsAppMediaWorker {
    private record Credential(String cipher,String status){@Override public String toString(){return "Credential[redacted]";}}
    private final SalesConversationAttachmentRepository repository;private final SalesConversationAttachmentService attachments;
    private final SalesConversationRepository conversations;private final WhatsAppMediaTransport transport;private final WhatsAppCredentialCodec codec;
    private final JdbcTemplate db;private final WhatsAppProperties flags;private final ModuleAccessService modules;private final TransactionTemplate tx;
    public WhatsAppMediaWorker(SalesConversationAttachmentRepository repository,SalesConversationAttachmentService attachments,SalesConversationRepository conversations,WhatsAppMediaTransport transport,WhatsAppCredentialCodec codec,JdbcTemplate db,WhatsAppProperties flags,ModuleAccessService modules,PlatformTransactionManager manager){this.repository=repository;this.attachments=attachments;this.conversations=conversations;this.transport=transport;this.codec=codec;this.db=db;this.flags=flags;this.modules=modules;this.tx=new TransactionTemplate(manager);}
    @Scheduled(fixedDelayString="${app.sales-conversations.media-poll-ms:5000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void poll(){if(flags.workerEnabled()&&flags.ingressEnabled())for(int i=0;i<10&&processOne();i++){} }
    public boolean processOne(){var claimed=tx.execute(s->repository.claim());if(claimed==null||claimed.isEmpty())return false;var a=claimed.get();
        try{
            String token=tx.execute(s->{conversations.lock(a.company());var credential=credential(a);var c=conversations.find(a.company(),a.conversation()).orElseThrow();return new String(codec.decrypt(a.company(),c.connectionId(),"token",credential.cipher()),StandardCharsets.UTF_8);});
            var content=transport.download(a.providerId(),token,SalesConversationFilePolicy.max(a.mime()));
            tx.executeWithoutResult(s->{conversations.lock(a.company());if(!repository.owns(a))return;credential(a);attachments.storeInbound(a,content.bytes(),content.mime());changed(a,"MEDIA_READY");});
        }catch(org.springframework.web.server.ResponseStatusException blocked){tx.executeWithoutResult(s->{conversations.lock(a.company());if(repository.owns(a)){repository.reject(a,"MEDIA_REJECTED");changed(a,"MEDIA_REJECTED");}});}
        catch(RuntimeException temporary){tx.executeWithoutResult(s->{conversations.lock(a.company());if(repository.owns(a)){repository.retry(a);if(a.attempts()>=8)changed(a,"MEDIA_REJECTED");}});}
        return true;
    }
    private Credential credential(SalesConversationAttachmentRepository.Row a){
        var credentials=db.query("SELECT c.credential_ciphertext,c.status FROM sales_wa_connections c JOIN sales_conversations v ON v.company_id=c.company_id AND v.connection_id=c.id WHERE v.company_id=? AND v.id=?",(r,n)->new Credential(r.getString(1),r.getString(2)),a.company(),a.conversation());
        if(credentials.isEmpty()||!java.util.Set.of("CONNECTED","DEGRADED").contains(credentials.getFirst().status())||!modules.companyCanAccessForMutation(a.company(),"crm"))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        return credentials.getFirst();
    }
    private void changed(SalesConversationAttachmentRepository.Row a,String type){var c=conversations.find(a.company(),a.conversation()).orElseThrow();long seq=conversations.event(a.company(),c.connectionId(),c.id(),null,type,null,null);db.update("UPDATE sales_conversation_messages SET change_seq=? WHERE company_id=? AND id=?",seq,a.company(),a.message());}
}
