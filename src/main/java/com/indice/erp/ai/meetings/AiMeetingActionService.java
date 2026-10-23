package com.indice.erp.ai.meetings;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.meetings.MeetingAssistantService;
import com.indice.erp.meetings.MeetingAssistantService.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AiMeetingActionService {
    private final AiActionRepository repository;private final MeetingAssistantService owner;private final AiMeetingAccess access;
    private final ObjectMapper mapper;private final Clock clock;private final TransactionTemplate transaction;private final SecureRandom random=new SecureRandom();
    public AiMeetingActionService(AiActionRepository repository,MeetingAssistantService owner,AiMeetingAccess access,ObjectMapper mapper,Clock clock,PlatformTransactionManager manager){this.repository=repository;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;transaction=new TransactionTemplate(manager);transaction.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_READ_COMMITTED);}
    public record Preview(String tool,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,Prepared prepared,List<String> consequences){@Override public String toString(){return "MeetingPreview[protected]";}}
    public record Commit(String confirmationToken,String idempotencyKey){
        @com.fasterxml.jackson.annotation.JsonAnySetter public void reject(String field,com.fasterxml.jackson.databind.JsonNode value){throw new IllegalArgumentException("Commit accepts only confirmation and idempotency key.");}
        @Override public String toString(){return "MeetingCommit[protected]";}
    }
    public record Committed(String tool,boolean replayed,Result result,Object record){@Override public String toString(){return "CommittedMeetingChange[protected]";}}
    @org.springframework.transaction.annotation.Transactional
    public Preview preview(StoredToken token,String action,Change change){
        access.require(token,action);var prepared=owner.prepare(token.user(),action,change);
        byte[] bytes=new byte[32];random.nextBytes(bytes);String raw="idx_confirm_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires=clock.instant().plus(Duration.ofMinutes(5));Map<String,Object> args=mapper.convertValue(prepared.change(),new TypeReference<>(){});
        long id=repository.insertConfirmation(token,internal(action),hash(raw),hash(json(args)),args,expires);
        repository.insertAudit(token,action,id,"PREVIEW","SUCCESS",UUID.randomUUID().toString(),null,Map.of("action",action),null,null,null);
        return new Preview(action,raw,expires,true,prepared,List.of("Guarda únicamente los cambios mostrados después de tu confirmación.","La asistencia, los votos, el cierre y el cumplimiento de acuerdos requieren sus acciones independientes.","Las tareas conservan los permisos y la asignación autorizada de Procesos."));
    }
    public Committed commit(StoredToken token,String action,Commit request){
        access.require(token,action);
        if(request==null||request.confirmationToken()==null||!request.confirmationToken().matches("idx_confirm_[A-Za-z0-9_-]{43}")||request.idempotencyKey()==null||!request.idempotencyKey().matches("[A-Za-z0-9_-]{16,80}"))throw new IllegalArgumentException("Valid confirmation and idempotency key required.");
        var c=repository.findConfirmation(hash(request.confirmationToken())).orElseThrow(()->new IllegalStateException("confirmation_invalid"));
        if(!internal(action).equals(c.tool())||c.accessTokenId()!=token.id()||c.companyId()!=token.user().companyId()||c.userId()!=token.user().userId()||c.userCompanyId()!=token.user().userCompanyId())throw new IllegalStateException("confirmation_identity_mismatch");
        var key=hash(request.idempotencyKey());var existing=repository.findExecution(c.companyId(),c.userId(),c.tool(),key);
        if(existing.isPresent())return replay(token,action,c,existing.get());
        if(c.consumedAt()!=null||!c.expiresAt().isAfter(clock.instant()))throw new IllegalStateException("confirmation_unavailable");
        try{return transaction.execute(status->{
            access.require(token,action);var correlation=UUID.randomUUID().toString();long id=repository.insertPendingExecution(token,c,key,correlation);
            if(repository.consumeConfirmation(c.id(),clock.instant())!=1)throw new IllegalStateException("confirmation_unavailable");
            var change=repository.readConfirmationArgs(c,Change.class);var saved=owner.execute(token.user(),action,change,request.idempotencyKey());
            if(repository.completeExecution(id,mapper.convertValue(saved,new TypeReference<Map<String,Object>>(){}),clock.instant())!=1)throw new IllegalStateException();
            repository.insertAudit(token,action,c.id(),"COMMIT","SUCCESS",correlation,key,Map.of("action",action),null,null,null);
            return new Committed(action,false,saved,owner.result(token.user(),action,saved));
        });}catch(DuplicateKeyException failure){return replay(token,action,c,repository.findExecution(c.companyId(),c.userId(),c.tool(),key).orElseThrow(()->failure));}
    }
    private Committed replay(StoredToken token,String action,AiActionRepository.Confirmation c,AiActionRepository.Execution execution){
        if(c.id()!=execution.confirmationId()||!c.fingerprint().equals(execution.fingerprint())||!execution.status().equals("COMPLETED"))throw new IllegalStateException("idempotency_key_conflict");
        access.require(token,action);var saved=mapper.convertValue(execution.result(),Result.class);var current=owner.result(token.user(),action,saved);
        repository.insertAudit(token,action,c.id(),"REPLAY","SUCCESS",UUID.randomUUID().toString(),null,Map.of("action",action),null,null,null);
        return new Committed(action,true,saved,current);
    }
    private static String internal(String action){if(!MeetingAssistantService.ACTIONS.contains(action))throw new IllegalArgumentException();return "meeting_v1:"+action;}
    private String json(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalArgumentException("Invalid meeting change.",e);}}
    private static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
