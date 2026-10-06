package com.indice.erp.ai.terminal;

import static com.indice.erp.ai.terminal.AiTerminalContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.pos.assistant.PosTerminalContracts.*;
import com.indice.erp.pos.assistant.PosTerminalPreparation;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
public class AiTerminalActionService {
    private final AiActionRepository repository;
    private final AiTerminalExecutionService execution;
    private final com.indice.erp.pos.assistant.PosTerminalDispatch dispatch;private final com.indice.erp.pos.assistant.PosTerminalReadService reads;
    private final PosTerminalPreparation owner;
    private final AiTerminalAccess access;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final SecureRandom random=new SecureRandom();
    public AiTerminalActionService(AiActionRepository repository,AiTerminalExecutionService execution,com.indice.erp.pos.assistant.PosTerminalDispatch dispatch,com.indice.erp.pos.assistant.PosTerminalReadService reads,PosTerminalPreparation owner,AiTerminalAccess access,ObjectMapper mapper,Clock clock){
        this.dispatch=dispatch;this.reads=reads;this.repository=repository;this.execution=execution;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;
    }
    public Preview preview(StoredToken token,String action,Change request){
        access.require(token,action);var prepared=owner.prepare(token.user(),action,request);
        byte[] bytes=new byte[32];random.nextBytes(bytes);var raw="idx_confirm_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires=clock.instant().plus(Duration.ofMinutes(5));
        Map<String,Object> normalized=mapper.convertValue(prepared,new TypeReference<>(){});
        long id=repository.insertConfirmation(token,internal(action),hash(raw),hash(json(prepared)),normalized,expires);
        repository.insertAudit(token,action,id,"PREVIEW","SUCCESS",UUID.randomUUID().toString(),null,Map.of("action",action),null,null,null);
        var effects=new ArrayList<String>(List.of("Revisa terminal asignada, moneda nativa, pedido, total y efectos en existencias.","La terminal confirma el pago; una respuesta incierta conserva el intento original y requiere recuperación.","Un reembolso de pago no confirma recepción de mercancía; la devolución de inventario utiliza el propietario de devoluciones.","Las operaciones externas conservan una reserva durable antes de contactar al proveedor."));
        if(prepared.versions().containsKey("refundRemaining"))effects.add("Reembolso acumulado: "+prepared.versions().get("refundConfirmed")+" "+prepared.currency()+"; saldo reembolsable: "+prepared.versions().get("refundRemaining")+" "+prepared.currency());
        return new Preview(action,raw,expires,true,prepared.before(),prepared.change(),prepared.checkout(),prepared.refundAmount(),prepared.currency(),effects);
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
        try{var reserved=execution.reserve(token,c,key,UUID.randomUUID().toString());return resume(token,action,c,reserved,key,false);}
        catch(DuplicateKeyException e){return replay(token,action,c,repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key).orElseThrow(()->e),key);}
        catch(RuntimeException e){repository.insertAudit(token,action,c.id(),"COMMIT","FAILURE",UUID.randomUUID().toString(),key,Map.of("action",action),null,"action_failed","The Terminal operations owner rejected this operation.");throw e;}
    }
    private Committed replay(StoredToken token,String action,AiActionRepository.Confirmation c,AiActionRepository.Execution e,String key){
        if(e.confirmationId()!=c.id()||!e.fingerprint().equals(c.fingerprint()))throw new Conflict("idempotency_key_conflict");
        if(!e.status().equals("COMPLETED"))return resume(token,action,c,e,key,true);
        var result=repository.readExecutionResult(token.user().companyId(),token.user().userId(),internal(action),e,Result.class);result=reads.refresh(token.user(),result);
        repository.insertAudit(token,action,c.id(),"COMMIT","REPLAY",e.correlationId(),key,Map.of("action",action),null,null,null);
        return new Committed(action,true,e.correlationId(),result);
    }
    private Committed resume(StoredToken token,String action,AiActionRepository.Confirmation confirmation,AiActionRepository.Execution reserved,String key,boolean replayed){
        access.require(token,action);var saved=repository.readConfirmationArgs(confirmation,Prepared.class);
        var result=dispatch.dispatch(token.user(),saved,reserved.correlationId());
        execution.finish(token,confirmation,reserved,key,result);
        return new Committed(action,replayed,reserved.correlationId(),reads.refresh(token.user(),result));
    }
    static String internal(String action){if(!PosTerminalPreparation.ACTIONS.contains(action))throw new IllegalArgumentException("Unsupported Terminal operations action.");return "terminal_v1:"+action;}
    private String json(Object v){try{return mapper.writeValueAsString(v);}catch(Exception e){throw new IllegalStateException("Invalid Terminal operations confirmation.",e);}}
    private static String hash(String v){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(v.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("SHA-256 unavailable.",e);}}
}
