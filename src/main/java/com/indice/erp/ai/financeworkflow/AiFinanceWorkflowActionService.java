package com.indice.erp.ai.financeworkflow;

import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.indice.erp.finance.assistant.FinanceAssistantService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class AiFinanceWorkflowActionService {
    private final AiActionRepository repository;
    private final AiFinanceWorkflowExecutionService execution;
    private final FinanceAssistantService owner;
    private final AiFinanceWorkflowAccess access;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final SecureRandom random=new SecureRandom();
    public AiFinanceWorkflowActionService(AiActionRepository repository,AiFinanceWorkflowExecutionService execution,FinanceAssistantService owner,AiFinanceWorkflowAccess access,ObjectMapper mapper,Clock clock){
        this.repository=repository;this.execution=execution;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;
    }
    public Preview preview(StoredToken token,String action,Change request){
        access.requireRequest(token,action,request);var prepared=owner.prepare(token.user(),action,request);
        byte[] bytes=new byte[32];random.nextBytes(bytes);var raw="idx_confirm_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires=clock.instant().plus(Duration.ofMinutes(5));
        Map<String,Object> normalized=decimalMap(prepared);
        long id=repository.insertConfirmation(token,internal(action),hash(raw),hash(json(prepared)),normalized,expires);
        repository.insertAudit(token,action,id,"PREVIEW","SUCCESS",UUID.randomUUID().toString(),null,Map.of("action",action),null,null,null);
        return new Preview(action,raw,expires,true,prepared.before(),prepared.change(),prepared.effects());
    }
    public Committed commit(StoredToken token,String action,CommitRequest request){
        access.require(token,action);
        if(request==null||request.confirmationToken()==null||!request.confirmationToken().matches("idx_confirm_[A-Za-z0-9_-]{43}")||request.idempotencyKey()==null||request.idempotencyKey().length()<8||request.idempotencyKey().length()>128||request.idempotencyKey().isBlank())throw new IllegalArgumentException("Valid confirmation and idempotency key required.");
        var c=repository.findConfirmation(hash(request.confirmationToken())).orElseThrow(()->new Conflict("confirmation_invalid"));
        if(!internal(action).equals(c.tool())||c.accessTokenId()!=token.id()||c.companyId()!=token.user().companyId()||c.userId()!=token.user().userId()||c.userCompanyId()!=token.user().userCompanyId())throw new Conflict("confirmation_identity_mismatch");
        String key=hash(request.idempotencyKey());
        var existing=repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key);
        if(existing.isPresent())return replay(token,action,c,existing.get(),key);
        if(c.consumedAt()!=null)throw new Conflict("confirmation_used");
        if(!c.expiresAt().isAfter(clock.instant()))throw new Conflict("confirmation_expired");
        try{return execution.execute(token,c,key,UUID.randomUUID().toString());}
        catch(DuplicateKeyException e){return replay(token,action,c,repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key).orElseThrow(()->e),key);}
        catch(RuntimeException e){repository.insertAudit(token,action,c.id(),"COMMIT","FAILURE",UUID.randomUUID().toString(),key,Map.of("action",action),null,"action_failed","The finance workflow owner rejected this operation.");throw e;}
    }
    private Committed replay(StoredToken token,String action,AiActionRepository.Confirmation c,AiActionRepository.Execution e,String key){
        if(e.confirmationId()!=c.id()||!e.fingerprint().equals(c.fingerprint()))throw new Conflict("idempotency_key_conflict");
        if(!e.status().equals("COMPLETED"))throw new Conflict("action_in_progress");
        var result=repository.readExecutionResult(token.user().companyId(),token.user().userId(),internal(action),e,Result.class);var prepared=repository.readConfirmationArgs(c,Prepared.class);access.requireRequest(token,action,prepared.change());owner.requireResultAccess(token.user(),prepared,result);
        repository.insertAudit(token,action,c.id(),"COMMIT","REPLAY",e.correlationId(),key,Map.of("action",action),null,null,null);
        return new Committed(action,true,e.correlationId(),access.project(token,result));
    }
    static String internal(String action){if(!com.indice.erp.finance.assistant.FinanceAssistantTools.ACTIONS.contains(action))throw new IllegalArgumentException("Unsupported finance workflow action.");return "finance_workflow_v1:"+action;}
    private String json(Object v){try{return mapper.writeValueAsString(v);}catch(Exception e){throw new IllegalStateException("Invalid finance workflow confirmation.",e);}}
    private static String hash(String v){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(v.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("SHA-256 unavailable.",e);}}
    private Map<String,Object> decimalMap(Object value){try{return mapper.readerFor(new TypeReference<Map<String,Object>>(){}).with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readValue(mapper.writeValueAsString(value));}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Invalid finance state.",e);}}
}
