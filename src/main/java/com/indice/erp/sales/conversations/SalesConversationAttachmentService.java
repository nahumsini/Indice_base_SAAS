package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static com.indice.erp.sales.conversations.SalesConversationDtos.*;
import static org.springframework.http.HttpStatus.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import com.indice.erp.sales.conversations.whatsapp.*;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SalesConversationAttachmentService {
    public record Upload(@NotBlank String requestKey,@NotBlank @Size(max=180)String fileName,@NotBlank String contentType,@Positive long sizeBytes) { @Override public String toString(){return "Upload[redacted]";} }
    public record UploadResult(String id,String uploadUrl,Map<String,String> headers,Instant expiresAt,Attachment attachment) { @Override public String toString(){return "UploadResult[redacted]";} }
    public record Download(String fileName,String contentType,byte[] bytes){@Override public String toString(){return "Download[redacted]";}}
    private final SalesConversationRepository conversations;private final SalesConversationAccess access;private final SalesConversationAttachmentRepository repository;
    private final ObjectStorageService storage;private final ObjectStorageProperties properties;private final CompanyStorageMeter meter;private final WhatsAppProperties flags;private final Clock clock;
    public SalesConversationAttachmentService(SalesConversationRepository conversations,SalesConversationAccess access,SalesConversationAttachmentRepository repository,ObjectStorageService storage,ObjectStorageProperties properties,CompanyStorageMeter meter,WhatsAppProperties flags,Clock clock){this.conversations=conversations;this.access=access;this.repository=repository;this.storage=storage;this.properties=properties;this.meter=meter;this.flags=flags;this.clock=clock;}
    private String bucket(){return properties.getMinio().getBucketSalesDocuments();}
    private Conversation authorize(AuthSessionUser actor,String conversation,boolean write){require(flags.enabled(),SERVICE_UNAVAILABLE,"conversations_disabled");var a=access.current(actor,write);var c=conversations.find(a.companyId(),conversation).orElseThrow(()->new ResponseStatusException(NOT_FOUND));if(write)access.operate(a,c,Capability.REPLY,true);else access.read(a,c);return c;}
    private void enabled(){require(storage.isEnabled(),SERVICE_UNAVAILABLE,"conversation_storage_unavailable");}
    @Transactional
    public UploadResult prepare(AuthSessionUser actor,String conversation,Upload input){
        enabled();SalesConversationService.uuid(input.requestKey());SalesConversationFilePolicy.metadata(input.fileName().toLowerCase(Locale.ROOT),input.contentType(),input.sizeBytes());
        conversations.lock(actor.companyId());var a=access.current(actor,true);authorize(a,conversation,true);
        var existing=repository.retry(a.companyId(),a.userCompanyId(),input.requestKey());
        if(existing.isPresent()){
            var row=existing.get();require(row.conversation().equals(conversation)&&row.name().equals(input.fileName())&&row.mime().equals(input.contentType())&&row.size()==input.sizeBytes(),CONFLICT,"conversation_attachment_conflict");
            if(row.state().equals("READY"))return new UploadResult(row.id(),null,Map.of(),null,row.view());
            require(row.message()==null&&Set.of("STAGING","EXPIRED").contains(row.state()),CONFLICT,"conversation_attachment_conflict");
            if(row.expires()==null||!row.expires().isAfter(clock.instant().plusSeconds(15))){storage.deleteObject(bucket(),row.uploadKey());meter.release(a.companyId(),row.uploadKey(),"sales_conversation_upload_renewed");var key=staging(a.companyId(),row.id());var expiry=expiry();repository.renew(row,key,expiry);meter.reserveExistingCapacity(a.companyId(),"SALES_CONVERSATIONS",bucket(),key,row.size());row=repository.find(a.companyId(),row.id()).orElseThrow();}
            var url=storage.presignUpload(bucket(),row.uploadKey(),row.mime(),row.size(),remaining(row.expires()));return new UploadResult(row.id(),url.uploadUrl(),url.uploadHeaders(),row.expires(),null);
        }
        repository.rate(a.companyId(),a.userCompanyId());String id=UUID.randomUUID().toString(),key=staging(a.companyId(),id);var expires=expiry();
        var url=meter.presignExistingCapacity(a.companyId(),"SALES_CONVERSATIONS",bucket(),key,input.contentType(),input.sizeBytes(),remaining(expires));
        repository.insert(a.companyId(),id,conversation,a.userCompanyId(),input.requestKey(),input.fileName(),input.contentType(),input.sizeBytes(),key,expires);
        return new UploadResult(id,url.uploadUrl(),url.uploadHeaders(),expires,null);
    }
    @Transactional
    public Attachment finalizeUpload(AuthSessionUser actor,String conversation,String id){
        enabled();conversations.lock(actor.companyId());var a=access.current(actor,true);authorize(a,conversation,true);var row=repository.find(a.companyId(),id).orElseThrow(()->new ResponseStatusException(NOT_FOUND));
        require(row.conversation().equals(conversation)&&Objects.equals(row.uploader(),a.userCompanyId()),NOT_FOUND,"conversation_attachment_unavailable");
        if(row.state().equals("READY"))return row.view();
        require(row.state().equals("STAGING")&&row.message()==null&&row.expires().isAfter(clock.instant()),CONFLICT,"conversation_attachment_expired");
        String target=finalKey(a.companyId(),conversation,id);storage.copyObject(bucket(),row.uploadKey(),target);rollbackDelete(target);
        var metadata=storage.objectMetadata(bucket(),target);require(metadata.sizeBytes()==row.size()&&metadata.contentType().equals(row.mime()),UNPROCESSABLE_ENTITY,"conversation_file_rejected");
        byte[] bytes=storage.readObject(bucket(),target,SalesConversationFilePolicy.max(row.mime()));SalesConversationFilePolicy.verify(row.name(),row.mime(),bytes);
        meter.commitExistingCapacity(a.companyId(),bucket(),row.uploadKey(),target,row.size());repository.ready(row,target,bytes.length,SalesConversationService.hash(bytes));return repository.find(a.companyId(),id).orElseThrow().view();
    }
    public List<Attachment> views(long company,String conversation,String message){return repository.forMessage(company,conversation,message).stream().map(SalesConversationAttachmentRepository.Row::view).toList();}
    public String bind(AuthSessionUser actor,Conversation c,String message,List<String> ids){
        if(ids==null||ids.isEmpty())return "TEXT";require(ids.size()==1,BAD_REQUEST,"conversation_single_attachment");var row=repository.find(actor.companyId(),ids.getFirst()).orElseThrow(()->new ResponseStatusException(NOT_FOUND));
        require(row.conversation().equals(c.id())&&Objects.equals(row.uploader(),actor.userCompanyId())&&row.state().equals("READY")&&row.message()==null,CONFLICT,"conversation_attachment_unavailable");
        repository.bind(row,message);return row.mime().startsWith("image/")?"IMAGE":"DOCUMENT";
    }
    @Transactional(readOnly=true)
    public Download download(AuthSessionUser actor,String conversation,String id){
        enabled();authorize(actor,conversation,false);var row=repository.find(actor.companyId(),id).orElseThrow(()->new ResponseStatusException(NOT_FOUND));require(row.conversation().equals(conversation)&&row.message()!=null&&row.state().equals("READY"),NOT_FOUND,"conversation_attachment_unavailable");
        byte[] bytes=storage.readObject(bucket(),row.objectKey(),SalesConversationFilePolicy.max(row.mime()));require(SalesConversationService.hash(bytes).equals(row.sha()),UNPROCESSABLE_ENTITY,"conversation_file_changed");authorize(actor,conversation,false);return new Download(row.name(),row.mime(),bytes);
    }
    public WhatsAppCloudTransport.Media forDispatch(long company,String conversation,String message){var rows=repository.forMessage(company,conversation,message);if(rows.isEmpty())return null;enabled();var a=rows.getFirst();require(a.state().equals("READY"),CONFLICT,"conversation_attachment_unavailable");byte[] bytes=storage.readObject(bucket(),a.objectKey(),SalesConversationFilePolicy.max(a.mime()));require(SalesConversationService.hash(bytes).equals(a.sha()),UNPROCESSABLE_ENTITY,"conversation_file_changed");SalesConversationFilePolicy.verify(a.name(),a.mime(),bytes);return new WhatsAppCloudTransport.Media(a.name(),a.mime(),bytes);}
    public void storeInbound(SalesConversationAttachmentRepository.Row a,byte[] bytes,String mime){
        enabled();require(a.mime().equals(mime),UNPROCESSABLE_ENTITY,"conversation_file_rejected");SalesConversationFilePolicy.verify(a.name(),mime,bytes);
        String hash=SalesConversationService.hash(bytes);if(a.expectedHash()!=null&&!a.expectedHash().isBlank()){
            String expected=a.expectedHash();if(!expected.matches("[0-9a-fA-F]{64}")){try{expected=HexFormat.of().formatHex(Base64.getDecoder().decode(expected));}catch(IllegalArgumentException e){throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"conversation_file_hash");}}
            require(hash.equalsIgnoreCase(expected),UNPROCESSABLE_ENTITY,"conversation_file_hash");
        }
        String key=finalKey(a.company(),a.conversation(),a.id());meter.reserveExistingCapacity(a.company(),"SALES_CONVERSATIONS",bucket(),key,bytes.length);storage.writeObject(bucket(),key,mime,bytes);rollbackDelete(key);meter.commitExistingCapacity(a.company(),bucket(),key,key,bytes.length);repository.ready(a,key,bytes.length,hash);
    }
    private String staging(long company,String id){return "sales-conversations/"+company+"/staging/"+id+"/"+UUID.randomUUID();}
    private String finalKey(long company,String conversation,String id){return "sales-conversations/"+company+"/"+conversation+"/files/"+id+"/"+UUID.randomUUID();}
    private Instant expiry(){return clock.instant().plusSeconds(Math.min(900,meter.reservationTtl().toSeconds()));}
    private int remaining(Instant expiry){return (int)Math.max(1,Duration.between(clock.instant(),expiry).toSeconds());}
    private void rollbackDelete(String key){if(TransactionSynchronizationManager.isSynchronizationActive())TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){public void afterCompletion(int state){if(state==STATUS_ROLLED_BACK)try{storage.deleteObject(bucket(),key);}catch(RuntimeException ignored){/* Orphan reservation remains visible to the native storage owner. */}}});}
}
