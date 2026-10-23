package com.indice.erp.finance.attachments;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.PresignedUpload;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Finance-owned upload intake: browser write capabilities never address durable evidence. */
@Service
public class FinanceAttachmentSealer {
    private static final int MAX_BYTES = 10 * 1024 * 1024;
    private final JdbcTemplate db;
    private final ObjectStorageService storage;
    private final CompanyStorageMeter meter;
    private final Clock clock;
    private final TransactionTemplate transactions;

    public FinanceAttachmentSealer(JdbcTemplate db, ObjectStorageService storage, CompanyStorageMeter meter,
                                   Clock clock, PlatformTransactionManager manager) {
        this.db=db; this.storage=storage; this.meter=meter; this.clock=clock;
        this.transactions=new TransactionTemplate(manager);
        this.transactions.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @org.springframework.transaction.annotation.Transactional
    public PresignedUpload presign(long company, String owner, long ownerId, String bucket,
                                   String key, String type, long size, int expiry) {
        require(size>0 && size<=MAX_BYTES, "Invalid attachment size.");
        int boundedExpiry=(int)Math.min(expiry,Math.max(1,meter.reservationTtl().toSeconds()-60));
        var upload=meter.presign(company,owner.equals("PETTY_CASH")?"PETTY_CASH":"EXPENSES",bucket,key,type,size,boundedExpiry);
        db.update("""
            INSERT INTO finance_attachment_uploads
             (company_id,staging_key,bucket_name,owner_type,owner_id,size_bytes,content_type,upload_expires_at,registration_expires_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            """,company,key,bucket,owner,ownerId,size,type,Timestamp.from(upload.expiresAt()),
            Timestamp.from(clock.instant().plus(meter.reservationTtl())));
        return upload;
    }

    @org.springframework.transaction.annotation.Transactional
    public Sealed seal(long company, String owner, long ownerId, String bucket,
                       String source, String type, long size) {
        var rows=db.query("""
            SELECT * FROM finance_attachment_uploads
            WHERE company_id=? AND staging_key=? AND bucket_name=? AND owner_type=? AND owner_id=? FOR UPDATE
            """,(r,n)->new Upload(r.getString("state"),r.getLong("size_bytes"),r.getString("content_type"),
                r.getString("final_key"),r.getString("content_sha256"),r.getTimestamp("registration_expires_at")),
            company,source,bucket,owner,ownerId);
        require(!rows.isEmpty(),"A new authorized attachment upload is required.");
        var upload=rows.getFirst();
        require(size>0 && size<=MAX_BYTES && size==upload.size() && type.equals(upload.type()),"Attachment does not match its upload authorization.");
        if(upload.state().equals("SEALED")) {
            require(storage.objectExists(bucket,upload.key()),"Registered evidence is unavailable; request a new upload.");
            return new Sealed(upload.key(),upload.digest());
        }
        require(upload.state().equals("PENDING") && upload.expires().toInstant().isAfter(clock.instant()),"Attachment upload has expired.");
        String target=source.substring(0,source.lastIndexOf('/')+1)+"sealed/"+UUID.randomUUID();
        try {
            storage.copyObject(bucket,source,target);
            var metadata=storage.objectMetadata(bucket,target);
            require(metadata.sizeBytes()==size && type.equals(metadata.contentType()),"Uploaded attachment metadata does not match.");
            var bytes=storage.readObject(bucket,target,MAX_BYTES);
            require(bytes.length==size,"Uploaded attachment size does not match.");
            String digest=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
            meter.commitMoved(company,bucket,source,target,size);
            db.update("UPDATE finance_attachment_uploads SET state='SEALED',final_key=?,content_sha256=? WHERE company_id=? AND staging_key=?",
                target,digest,company,source);
            if(TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
                    @Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)deleteQuietly(bucket,target);}
                });
            }
            return new Sealed(target,digest);
        } catch(RuntimeException failure) {deleteQuietly(bucket,target);throw failure;}
        catch(java.security.NoSuchAlgorithmException impossible){deleteQuietly(bucket,target);throw new IllegalStateException(impossible);}
    }

    @Scheduled(fixedDelayString="${app.finance.attachments.cleanup-delay-ms:300000}")
    public void cleanupExpiredUploads() {
        var pending=db.query("""
            SELECT company_id,staging_key FROM finance_attachment_uploads
            WHERE cleaned_at IS NULL AND ((state='SEALED' AND upload_expires_at<CURRENT_TIMESTAMP(6))
             OR (state='PENDING' AND registration_expires_at<CURRENT_TIMESTAMP(6)))
            ORDER BY registration_expires_at LIMIT 100
            """,(r,n)->new Cleanup(r.getLong(1),r.getString(2)));
        for(var item:pending) {
            try {transactions.executeWithoutResult(tx->cleanup(item));}
            catch(RuntimeException failure){org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "finance_upload_cleanup_failed companyId={}",item.company());}
        }
    }
    private void cleanup(Cleanup item) {
        var rows=db.query("""
            SELECT bucket_name,state,upload_expires_at,registration_expires_at,cleaned_at
            FROM finance_attachment_uploads WHERE company_id=? AND staging_key=? FOR UPDATE
            """,(r,n)->new CleanupState(r.getString(1),r.getString(2),r.getTimestamp(3),r.getTimestamp(4),r.getTimestamp(5)),item.company(),item.key());
        if(rows.isEmpty())return;
        var value=rows.getFirst();
        if(value.cleaned()!=null || !(value.state().equals("SEALED")?value.uploadExpiry():value.registrationExpiry()).toInstant().isBefore(clock.instant()))return;
        storage.deleteObject(value.bucket(),item.key());
        if(value.state().equals("PENDING"))meter.release(item.company(),item.key(),"finance_upload_abandoned");
        db.update("UPDATE finance_attachment_uploads SET cleaned_at=CURRENT_TIMESTAMP(6),state=IF(state='PENDING','EXPIRED',state) WHERE company_id=? AND staging_key=?",item.company(),item.key());
    }
    private void deleteQuietly(String bucket,String key){try{storage.deleteObject(bucket,key);}catch(RuntimeException ignored){/* Rollback leaves no registered evidence reference. */}}
    private static void require(boolean valid,String message){if(!valid)throw new IllegalArgumentException(message);}
    public record Sealed(String key,String sha256){}
    private record Upload(String state,long size,String type,String key,String digest,Timestamp expires){}
    private record Cleanup(long company,String key){}
    private record CleanupState(String bucket,String state,Timestamp uploadExpiry,Timestamp registrationExpiry,Timestamp cleaned){}
}
