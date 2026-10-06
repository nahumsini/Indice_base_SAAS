package com.indice.erp.ai.files;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import java.time.*;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import static com.indice.erp.ai.files.AiFileContracts.*;

/** Durable staging metadata precedes object writes so interrupted intake can be cleaned up. */
@Service
public class AiFileIntakeService {
    private final AiFileAccess access;private final AiFileOwnerService owner;private final AiStagedFileRepository files;
    private final ObjectStorageService storage;private final CompanyStorageMeter meter;private final AiActionRepository audit;private final Clock clock;private final org.springframework.transaction.support.TransactionTemplate transaction;
    public AiFileIntakeService(AiFileAccess access,AiFileOwnerService owner,AiStagedFileRepository files,ObjectStorageService storage,CompanyStorageMeter meter,AiActionRepository audit,Clock clock,org.springframework.transaction.PlatformTransactionManager manager) {
        this.access=access;this.owner=owner;this.files=files;this.storage=storage;this.meter=meter;this.audit=audit;this.clock=clock;this.transaction=new org.springframework.transaction.support.TransactionTemplate(manager);
    }
    public Staged stage(StoredToken token,StageRequest request) {
        if(request==null)throw new IllegalArgumentException("File intake details required.");
        access.require(token,request.purpose(),true);
        if(!storage.isEnabled())throw new ObjectStorageDisabledException("Private storage is not enabled.");
        byte[] bytes=AiFileValidation.decode(request);var sha=AiFileValidation.hash(bytes);var name=AiFileValidation.fileName(request.fileName());
        var fingerprint=AiFileValidation.hash(request.purpose()+"\n"+request.targetId()+"\n"+request.documentType()+"\n"+name+"\n"+request.mimeType()+"\n"+sha);
        var idempotency=AiFileValidation.hash(request.idempotencyKey());
        var existing=files.byKey(token,idempotency);
        if(existing.isPresent())return replay(token,existing.get(),fingerprint);
        String key=owner.reserve(token.user(),request,bytes.length),id=UUID.randomUUID().toString();
        var ttl=meter.reservationTtl();var lifetime=ttl.compareTo(Duration.ofMinutes(15))<0?ttl:Duration.ofMinutes(15);
        var staged=new Staged(id,request.purpose(),request.targetId(),request.documentType(),name,request.mimeType(),bytes.length,sha,clock.instant().plus(lifetime).truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        try { files.insert(token,staged,key,owner.bucket(request.purpose()),idempotency,fingerprint); }
        catch(DuplicateKeyException e) { meter.release(token.user().companyId(),key,"ai_file_intake_race");return replay(token,files.byKey(token,idempotency).orElseThrow(()->e),fingerprint); }
        catch(RuntimeException e) { meter.release(token.user().companyId(),key,"ai_file_intake_failed");throw e; }
        try {
            storage.writeObject(owner.bucket(request.purpose()),key,request.mimeType(),bytes);
            verify(files.require(token,id,false));
            transaction.executeWithoutResult(status->{
                files.ready(id);
                audit.insertAudit(token,"stage_operational_file",null,"STAGE","SUCCESS",UUID.randomUUID().toString(),idempotency,
                    Map.of("purpose",request.purpose().name(),"targetId",request.targetId()),Map.of("sizeBytes",bytes.length),null,null);
            });
            return staged;
        } catch(RuntimeException e) {
            try{storage.deleteObject(owner.bucket(request.purpose()),key);}catch(RuntimeException ignored){/* Expired metadata remains for cleanup retry. */}
            meter.release(token.user().companyId(),key,"ai_file_intake_failed");
            // Keep an expired UPLOADING row until the cleanup can prove deletion.
            throw e;
        }
    }
    private Staged replay(StoredToken token,AiStagedFileRepository.Stored stored,String fingerprint) {
        if(!stored.fingerprint().equals(fingerprint))throw new Conflict("file_idempotency_conflict");
        access.require(token,stored.view().purpose(),true);owner.target(token.user(),stored.view().purpose(),stored.view().targetId());
        if(!Set.of("STAGED","ATTACHED").contains(stored.state()))throw new Conflict("file_intake_in_progress");
        if(stored.state().equals("STAGED")&&!stored.view().expiresAt().isAfter(clock.instant()))throw new Conflict("file_intake_expired");
        return stored.view();
    }
    public byte[] verify(AiStagedFileRepository.Stored stored) {
        var f=stored.view();var metadata=storage.objectMetadata(stored.bucket(),stored.objectKey());
        if(metadata.sizeBytes()!=f.sizeBytes()||!Objects.equals(metadata.contentType(),f.mimeType()))throw new Conflict("file_integrity_changed");
        var bytes=storage.readObject(stored.bucket(),stored.objectKey(),Math.toIntExact(f.sizeBytes()));
        if(bytes.length!=f.sizeBytes()||!AiFileValidation.hash(bytes).equals(f.sha256()))throw new Conflict("file_integrity_changed");
        AiFileValidation.validateMime(f.mimeType(),bytes);return bytes;
    }
}
