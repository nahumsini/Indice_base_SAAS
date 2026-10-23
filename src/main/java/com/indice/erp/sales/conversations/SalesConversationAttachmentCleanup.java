package com.indice.erp.sales.conversations;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import com.indice.erp.sales.conversations.whatsapp.WhatsAppProperties;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Only expired staging keys; immutable ready/sent objects and business records are never purged. */
@Service
public class SalesConversationAttachmentCleanup {
    private final JdbcTemplate db;private final SalesConversationRepository conversations;private final SalesConversationAttachmentRepository attachments;
    private final ObjectStorageService storage;private final ObjectStorageProperties storageProperties;private final CompanyStorageMeter meter;private final WhatsAppProperties flags;private final TransactionTemplate tx;
    public SalesConversationAttachmentCleanup(JdbcTemplate db,SalesConversationRepository conversations,SalesConversationAttachmentRepository attachments,ObjectStorageService storage,ObjectStorageProperties storageProperties,CompanyStorageMeter meter,WhatsAppProperties flags,PlatformTransactionManager manager){this.db=db;this.conversations=conversations;this.attachments=attachments;this.storage=storage;this.storageProperties=storageProperties;this.meter=meter;this.flags=flags;this.tx=new TransactionTemplate(manager);}
    @Scheduled(fixedDelayString="${app.sales-conversations.cleanup-ms:60000}",initialDelayString="${app.sales-conversations.initial-delay-ms:30000}")
    public void poll(){if(flags.workerEnabled()&&storage.isEnabled())cleanup();}
    public void cleanup(){for(var row:db.query("SELECT company_id,id FROM sales_conversation_attachments WHERE upload_key IS NOT NULL AND expires_at<TIMESTAMPADD(SECOND,-60,CURRENT_TIMESTAMP(6)) AND cleanup_at IS NULL AND state IN ('STAGING','READY','EXPIRED') ORDER BY expires_at LIMIT 50",(r,n)->java.util.Map.entry(r.getLong(1),r.getString(2)))){
        try{tx.executeWithoutResult(s->{conversations.lock(row.getKey());var a=attachments.find(row.getKey(),row.getValue()).orElseThrow();if(a.expires()==null||a.expires().isAfter(Instant.now().minusSeconds(60)))return;
            storage.deleteObject(storageProperties.getMinio().getBucketSalesDocuments(),a.uploadKey());if(!a.state().equals("READY"))meter.release(a.company(),a.uploadKey(),"sales_conversation_staging_expired");
            db.update("UPDATE sales_conversation_attachments SET state=IF(state='STAGING','EXPIRED',state),cleanup_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",a.company(),a.id());
        });}catch(RuntimeException deferred){/* Durable row keeps cleanup pending; no secrets or object URL in logs. */}
    }}
}
