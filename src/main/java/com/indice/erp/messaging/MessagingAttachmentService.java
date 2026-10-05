package com.indice.erp.messaging;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.messaging.MessagingContracts.*;

@Service
public class MessagingAttachmentService {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(MessagingAttachmentService.class);
    static final long MAX_BYTES=8L*1024*1024;
    static final int MAX_PHOTOS=5;
    private final MessagingRepository conversations;
    private final MessagingAccess access;
    private final MessagingAttachmentRepository repository;
    private final ObjectStorageService storage;
    private final ObjectStorageProperties properties;
    private final CompanyStorageMeter meter;
    public MessagingAttachmentService(MessagingRepository conversations,MessagingAccess access,MessagingAttachmentRepository repository,
        ObjectStorageService storage,ObjectStorageProperties properties,CompanyStorageMeter meter) {
        this.conversations=conversations; this.access=access; this.repository=repository; this.storage=storage; this.properties=properties; this.meter=meter;
    }
    @Transactional
    public PhotoUploadResult presign(Actor a,long conversationId,PhotoUpload raw) {
        var c=authorized(a,conversationId,true);
        requireStorage();
        if(raw==null || raw.sizeBytes()<=0 || raw.sizeBytes()>MAX_BYTES) throw MessagingService.invalid();
        if("DIRECT".equals(c.kind()) && conversations.hasRevokedParticipant(c.id(),c.companyId())) throw MessagingAccess.forbidden();
        var r=new PhotoUpload(MessagingService.text(raw.fileName(),255,true).replaceAll("[\\r\\n\\t]"," "),
            MessagingService.allowed(raw.contentType(),Set.of("image/jpeg","image/png","image/webp")),raw.sizeBytes(),MessagingService.uuid(raw.requestKey()));
        var existing=repository.retry(a,c,r.requestKey());
        if(existing!=null) {
            if(!existing.fileName().equals(r.fileName()) || !existing.contentType().equals(r.contentType()) || existing.size()!=r.sizeBytes()
                || existing.messageId()!=null || !existing.expiresAt().isAfter(Instant.now())) throw MessagingService.conflict();
            var upload=storage.presignUpload(bucket(),existing.uploadKey(),r.contentType(),r.sizeBytes(),remainingSeconds(existing.expiresAt()));
            return new PhotoUploadResult(existing.id(),upload.uploadUrl(),upload.uploadHeaders(),existing.expiresAt());
        }
        repository.capacity(a);
        var id=UUID.randomUUID().toString();
        var key="messaging/"+c.companyId()+"/"+c.id()+"/pending/"+id;
        var expires=Instant.now().plusSeconds(Math.min(900,meter.reservationTtl().toSeconds()));
        var upload=meter.presign(c.companyId(),"MESSAGING",bucket(),key,r.contentType(),r.sizeBytes(),remainingSeconds(expires));
        repository.insert(a,c,r,id,key,expires);
        return new PhotoUploadResult(id,upload.uploadUrl(),upload.uploadHeaders(),expires);
    }
    static List<String> ids(List<String> ids) {
        if(ids==null) return List.of();
        if(ids.size()>MAX_PHOTOS || ids.stream().distinct().count()!=ids.size()) throw MessagingService.invalid();
        return ids.stream().map(MessagingService::uuid).sorted().toList();
    }
    // Called inside the send transaction after locking the conversation. Never expose staging objects.
    void bind(Actor a,Conversation c,Message message,List<String> ids) {
        for(var id:ids) {
            requireStorage();
            var row=repository.find(c,id);
            if(row.senderId()!=a.userId() || !row.senderScope().equals(a.scope())) throw MessagingAccess.forbidden();
            if(row.messageId()!=null || !row.expiresAt().isAfter(Instant.now())) throw MessagingService.conflict();
            var target="messaging/"+c.companyId()+"/"+c.id()+"/photos/"+id;
            var storageBucket=bucket();
            // Copy first, then inspect the immutable object: a still-valid PUT URL cannot replace sent photos.
            storage.copyObject(bucket(),row.uploadKey(),target);
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if(status==STATUS_ROLLED_BACK) try { storage.deleteObject(storageBucket,target); }
                    catch(RuntimeException failure) { log.warn("Messaging photo rollback cleanup deferred: {}",failure.getClass().getSimpleName()); }
                }
            });
            var metadata=storage.objectMetadata(bucket(),target);
            if(metadata.sizeBytes()!=row.size() || !row.contentType().equalsIgnoreCase(metadata.contentType())
                || !isImage(row.contentType(),storage.readObjectPrefix(bucket(),target,32))) throw MessagingService.invalid();
            meter.commitMoved(c.companyId(),bucket(),row.uploadKey(),target,row.size());
            repository.bind(c,row,message.id(),target);
        }
    }
    List<Message> decorate(Conversation c,List<Message> messages) {
        var grouped=repository.forMessages(c,messages.stream().map(Message::id).toList()).stream()
            .collect(Collectors.groupingBy(MessagingAttachmentRepository.Row::messageId));
        return messages.stream().map(m->new Message(m.id(),m.conversationId(),m.senderUserId(),m.senderName(),m.senderScope(),m.visibility(),m.requestKey(),m.body(),m.createdAt(),
            grouped.getOrDefault(m.id(),List.of()).stream().map(MessagingAttachmentRepository.Row::metadata).toList())).toList();
    }
    @Transactional(readOnly=true)
    public PhotoDownload download(Actor a,long conversationId,String id) {
        var c=authorized(a,conversationId,false);
        var row=repository.find(c,MessagingService.uuid(id));
        if(!repository.visible(a,c,row)) throw MessagingAccess.notFound();
        requireStorage();
        return new PhotoDownload(storage.presignDownload(bucket(),row.storedKey(),60));
    }
    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString="${app.messaging.photo-cleanup-delay-ms:60000}",initialDelayString="${app.messaging.photo-cleanup-initial-delay-ms:60000}")
    @Transactional
    public void cleanupStaging() {
        if(!storage.isEnabled()) return;
        for(var row:repository.expiredStaging()) {
            try {
                storage.deleteObject(bucket(),row.uploadKey());
                if(row.messageId()==null) {
                    storage.deleteObject(bucket(),"messaging/"+row.companyId()+"/"+row.conversationId()+"/photos/"+row.id());
                    meter.release(row.companyId(),row.uploadKey(),"messaging_photo_expired");
                }
                repository.cleaned(row);
            } catch(RuntimeException failure) { log.warn("Messaging photo staging cleanup deferred: {}",failure.getClass().getSimpleName()); }
        }
    }
    private Conversation authorized(Actor a,long id,boolean lock) { var c=conversations.find(a,id,lock); access.conversation(a,c); return c; }
    private void requireStorage() { if(!storage.isEnabled()) throw new ObjectStorageDisabledException("Photo storage is unavailable."); }
    private String bucket() { return properties.getMinio().getBucketDocuments(); }
    private int remainingSeconds(Instant expires) { return (int)Math.max(1,java.time.Duration.between(Instant.now(),expires).toSeconds()); }
    static boolean isImage(String type,byte[] b) {
        if(b==null) return false;
        return switch(type) {
            case "image/jpeg" -> b.length>=3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255;
            case "image/png" -> b.length>=8 && java.util.Arrays.equals(java.util.Arrays.copyOf(b,8),new byte[]{(byte)137,80,78,71,13,10,26,10});
            case "image/webp" -> b.length>=12 && new String(b,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(b,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
    }
}
