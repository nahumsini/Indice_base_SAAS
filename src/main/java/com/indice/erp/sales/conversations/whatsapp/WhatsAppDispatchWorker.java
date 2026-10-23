package com.indice.erp.sales.conversations.whatsapp;

import com.indice.erp.sales.conversations.*;
import com.indice.erp.sales.conversations.SalesConversationDtos.Capability;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Optional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class WhatsAppDispatchWorker {
    private final com.indice.erp.sales.whatsapping.WhatsAppSuppressionContract suppression;
    private final SalesConversationAttachmentService attachments;
    private final TransactionTemplate tx;private final WhatsAppOutboxRepository outbox;private final WhatsAppCloudTransport cloud;
    private final WhatsAppConnectionService connections;private final WhatsAppCredentialCodec codec;private final SalesConversationAccess access;
    private final SalesConversationRepository repository;private final WhatsAppProperties flags;private final Clock clock;
    public WhatsAppDispatchWorker(PlatformTransactionManager manager,WhatsAppOutboxRepository outbox,WhatsAppCloudTransport cloud,WhatsAppConnectionService connections,WhatsAppCredentialCodec codec,SalesConversationAccess access,SalesConversationRepository repository,WhatsAppProperties flags,Clock clock,SalesConversationAttachmentService attachments,com.indice.erp.sales.whatsapping.WhatsAppSuppressionContract suppression){this.suppression=suppression;this.attachments=attachments;this.tx=new TransactionTemplate(manager);this.outbox=outbox;this.cloud=cloud;this.connections=connections;this.codec=codec;this.access=access;this.repository=repository;this.flags=flags;this.clock=clock;}
    @Scheduled(fixedDelayString="${app.sales-conversations.poll-ms:3000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void poll(){if(flags.workerEnabled()&&flags.outboundEnabled()){recover();for(int i=0;i<25&&processOne();i++){} }}
    public void recover(){for(var j:outbox.uncertain())finish(j,new WhatsAppCloudTransport.Outcome("UNKNOWN",null,"SUBMISSION_INTERRUPTED"));}
    public boolean processOne(){
        if(!flags.outboundEnabled())return false;
        var job=tx.execute(s->outbox.claim());if(job==null||job.isEmpty())return false;var j=job.get();
        var submission=prepare(j);if(submission.isEmpty())return true;
        WhatsAppCloudTransport.Outcome outcome;
        try{outcome=cloud.send(submission.get());}catch(RuntimeException e){outcome=new WhatsAppCloudTransport.Outcome("UNKNOWN",null,"PROVIDER_OUTCOME_UNCONFIRMED");}
        finish(j,outcome);return true;
    }
    public Optional<WhatsAppCloudTransport.Submission> prepare(WhatsAppOutboxRepository.Job j){
        return tx.execute(s->{repository.lock(j.company());var pending=outbox.pending(j);if(pending.isEmpty())return Optional.empty();var p=pending.get();
            try{
                var actor=connections.resolveMember(j.company(),p.author());var c=repository.find(j.company(),p.conversation()).orElseThrow();
                access.current(actor,true);access.operate(actor,c,Capability.REPLY,true);
                if(c.outboundBlocked()||suppression.blocked(j.company(),c.phone())||!c.status().equals("OPEN")||!p.connectionState().equals("CONNECTED")||!SalesConversationService.inWindow(c.lastInboundAt(),clock.instant()))throw new IllegalArgumentException();
                var conn=repository.connection(j.company(),j.connection()).orElseThrow();if(conn.verifiedAt()==null||!repository.providerPhone(j.company(),j.connection()).equals(p.sender())||!p.recipient().equals(c.phone().substring(1)))throw new IllegalArgumentException();
                String token=new String(codec.decrypt(j.company(),j.connection(),"token",p.cipher()),StandardCharsets.UTF_8);
                var media=attachments.forDispatch(j.company(),p.conversation(),j.message());outbox.submitting(j,p.conversation());return Optional.of(new WhatsAppCloudTransport.Submission(p.sender(),p.recipient(),p.body(),token,j.attempt(),media));
            }catch(org.springframework.web.server.ResponseStatusException|java.util.NoSuchElementException|IllegalArgumentException|IllegalStateException invalid){outbox.cancel(j,p.conversation(),"DISPATCH_AUTHORITY_OR_WINDOW_CHANGED");return Optional.empty();}
        });
    }
    public void finish(WhatsAppOutboxRepository.Job j,WhatsAppCloudTransport.Outcome outcome){
        if(!java.util.Set.of("ACCEPTED","FAILED","UNKNOWN").contains(outcome.state())||outcome.state().equals("ACCEPTED")&&(outcome.providerMessageId()==null||outcome.providerMessageId().isBlank()))throw new IllegalArgumentException("Invalid transport outcome");
        tx.executeWithoutResult(s->{repository.lock(j.company());outbox.evidence(j,outcome);});
    }
}
