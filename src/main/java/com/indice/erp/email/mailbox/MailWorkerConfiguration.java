package com.indice.erp.email.mailbox;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
@Configuration
public class MailWorkerConfiguration {
    /** Qualified scheduler keeps provider waits out of the application's default scheduling thread. */
    @Bean(name="mailWorkerScheduler",defaultCandidate=false)
    ThreadPoolTaskScheduler mailWorkerScheduler(){var scheduler=new ThreadPoolTaskScheduler();scheduler.setPoolSize(2);scheduler.setThreadNamePrefix("mail-worker-");scheduler.setRemoveOnCancelPolicy(true);return scheduler;}
}
