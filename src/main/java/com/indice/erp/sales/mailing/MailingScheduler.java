package com.indice.erp.sales.mailing;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
@Component
@ConditionalOnProperty(name="app.mailing.worker-enabled",havingValue="true",matchIfMissing=true)
public class MailingScheduler {
    private final MailingDeliveryService service;public MailingScheduler(MailingDeliveryService service){this.service=service;}
    @Scheduled(scheduler="mailWorkerScheduler",fixedDelayString="${app.mailing.worker-delay-ms:10000}",initialDelayString="${app.mailing.worker-initial-delay-ms:60000}") public void tick(){service.tick();}
}
