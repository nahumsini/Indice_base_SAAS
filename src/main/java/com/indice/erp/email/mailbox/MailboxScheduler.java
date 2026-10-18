package com.indice.erp.email.mailbox;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
@Component
@ConditionalOnProperty(name="app.mail-accounts.worker-enabled",havingValue="true",matchIfMissing=true)
public class MailboxScheduler {
    private final MailOperationsRepository repository;private final MailboxService mailbox;private final MailSentCopyService sent;
    public MailboxScheduler(MailOperationsRepository repository,MailboxService mailbox,MailSentCopyService sent){this.repository=repository;this.mailbox=mailbox;this.sent=sent;}
    @Scheduled(scheduler="mailWorkerScheduler",fixedDelayString="${app.mail-accounts.worker-delay-ms:30000}",initialDelayString="${app.mail-accounts.worker-initial-delay-ms:60000}")
    public void tick(){
        for(var job:repository.syncJobs())if(repository.claimJob(job)){
            boolean ok=false;try{var actor=repository.current(job.company(),job.owner());mailbox.sync(actor,job.account(),new MailboxContracts.SyncInput(null,false));ok=true;}catch(RuntimeException ignored){ }finally{repository.syncResult(job,ok);}
        }
        for(var job:repository.copyJobs())try{sent.copy(repository.current(job.company(),job.owner()),job.account(),job.message());}catch(RuntimeException ignored){ }
    }
}
