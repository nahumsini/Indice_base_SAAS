package com.indice.erp.ai.files;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import static com.indice.erp.ai.files.AiFileContracts.*;

@Service
public class AiFileActionService {
    private final AiFileAccess access;private final AiFileOwnerService owner;private final AiStagedFileRepository files;
    private final AiFileIntakeService intake;private final AiFileExecutionService execution;private final AiActionRepository repository;private final ObjectMapper mapper;private final Clock clock;
    private final SecureRandom random=new SecureRandom();
    public AiFileActionService(AiFileAccess access,AiFileOwnerService owner,AiStagedFileRepository files,AiFileIntakeService intake,AiFileExecutionService execution,AiActionRepository repository,ObjectMapper mapper,Clock clock) {
        this.access=access;this.owner=owner;this.files=files;this.intake=intake;this.execution=execution;this.repository=repository;this.mapper=mapper;this.clock=clock;
    }
    public Preview preview(StoredToken token,String action,AttachRequest request) {
        var purpose=purpose(action);access.require(token,purpose,true);
        if(request==null)throw new IllegalArgumentException("Staged file required.");
        var file=files.require(token,request.stagedFileId(),false);requireReady(file,purpose,clock.instant());intake.verify(file);
        owner.validateWrite(token.user(),purpose,file.view().targetId());var target=owner.target(token.user(),purpose,file.view().targetId());var previous=owner.previous(token.user(),file.view());
        var prepared=new Prepared(action,file.view(),target.name(),previous,target.version());
        byte[] bytes=new byte[32];random.nextBytes(bytes);var raw="idx_confirm_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expiry=clock.instant().plus(Duration.ofMinutes(5));if(expiry.isAfter(file.view().expiresAt()))expiry=file.view().expiresAt();
        var id=repository.insertConfirmation(token,internal(action),AiFileValidation.hash(raw),AiFileValidation.hash(json(prepared)),mapper.convertValue(prepared,new TypeReference<>(){}),expiry);
        repository.insertAudit(token,action,id,"PREVIEW","SUCCESS",UUID.randomUUID().toString(),null,Map.of("purpose",purpose.name(),"targetId",file.view().targetId()),null,null,null);
        var effects=new ArrayList<String>(List.of(
            previous==null?"Adjunta exclusivamente el archivo y destino mostrados; conserva los archivos anteriores.":"Reemplaza el documento del mismo tipo mostrado. Conserva el archivo anterior si falla la transacción.",
            "Comprueba contenido, tamaño, permisos y destino de nuevo al confirmar. Los archivos privados requieren permiso separado para descargarlos."));
        if(purpose==Purpose.sale_payment_evidence)effects.add("Adjunta evidencia sin registrar cobros. Si la venta ya tiene aprobación financiera, la conserva y agrega el comprobante como documento complementario; en otro caso, envía la evidencia a revisión.");
        return new Preview(action,raw,expiry,true,file.view(),target.name(),previous,List.copyOf(effects));
    }
    public Committed commit(StoredToken token,String action,CommitRequest request) {
        access.require(token,purpose(action),true);
        if(request==null||request.confirmationToken()==null||!request.confirmationToken().matches("idx_confirm_[A-Za-z0-9_-]{43}"))throw new IllegalArgumentException("Valid confirmation token required.");
        AiFileValidation.key(request.idempotencyKey());
        var confirmation=repository.findConfirmation(AiFileValidation.hash(request.confirmationToken())).orElseThrow(()->new Conflict("confirmation_invalid"));
        if(!internal(action).equals(confirmation.tool())||confirmation.accessTokenId()!=token.id()||confirmation.companyId()!=token.user().companyId()||confirmation.userId()!=token.user().userId()||confirmation.userCompanyId()!=token.user().userCompanyId())throw new Conflict("confirmation_identity_mismatch");
        String key=AiFileValidation.hash(request.idempotencyKey());
        var previous=repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key);
        if(previous.isPresent())return replay(token,action,confirmation,previous.get(),key);
        if(confirmation.consumedAt()!=null)throw new Conflict("confirmation_used");
        if(!confirmation.expiresAt().isAfter(clock.instant()))throw new Conflict("confirmation_expired");
        try{return execution.execute(token,confirmation,key,UUID.randomUUID().toString());}
        catch(DuplicateKeyException e){return replay(token,action,confirmation,repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key).orElseThrow(()->e),key);}
        catch(RuntimeException e){repository.insertAudit(token,action,confirmation.id(),"COMMIT","FAILURE",UUID.randomUUID().toString(),key,Map.of("action",action),null,"file_operation_rejected","The file owner rejected registration.");throw e;}
    }
    private Committed replay(StoredToken token,String action,AiActionRepository.Confirmation confirmation,AiActionRepository.Execution result,String key) {
        if(result.confirmationId()!=confirmation.id()||!result.fingerprint().equals(confirmation.fingerprint()))throw new Conflict("idempotency_key_conflict");
        if(!result.status().equals("COMPLETED"))throw new Conflict("action_in_progress");
        var saved=mapper.convertValue(result.result(),Attached.class);owner.target(token.user(),saved.purpose(),saved.targetId());
        if(owner.list(token.user(),saved.purpose(),saved.targetId()).items().stream().noneMatch(r->r.attachmentId()==saved.attachmentId()&&r.fileName().equals(saved.fileName())&&r.sizeBytes()==saved.sizeBytes()))throw new Conflict("registered_file_changed");
        repository.insertAudit(token,action,confirmation.id(),"COMMIT","REPLAY",result.correlationId(),key,Map.of("action",action),null,null,null);
        return new Committed(action,true,result.correlationId(),saved);
    }
    static Purpose purpose(String action){var purpose=AiFileAccess.ACTIONS.get(action);if(purpose==null)throw new IllegalArgumentException("Unsupported file action.");return purpose;}
    static String internal(String action){purpose(action);return "file_attachment_v1:"+action;}
    static void requireReady(AiStagedFileRepository.Stored file,Purpose purpose,Instant now) {
        if(file.view().purpose()!=purpose)throw new Conflict("file_purpose_mismatch");
        if(!file.state().equals("STAGED"))throw new Conflict("file_intake_unavailable");
        if(!file.view().expiresAt().isAfter(now))throw new Conflict("file_intake_expired");
    }
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Invalid file confirmation.",e);}}
}
