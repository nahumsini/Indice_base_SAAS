package com.indice.erp.ai.learning;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.learning.*;
import static com.indice.erp.learning.LearningProgressContracts.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AiLearningProgressActionService {
    private static final String TOOL="learning_progress_v1:update_learning_progress";
    private final AiActionRepository repository;
    private final LearningProgressService learning;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final TransactionTemplate transaction;
    private final SecureRandom random=new SecureRandom();
    public AiLearningProgressActionService(AiActionRepository repository,LearningProgressService learning,ObjectMapper mapper,Clock clock,PlatformTransactionManager manager) {
        this.repository=repository;this.learning=learning;this.mapper=mapper;this.clock=clock;this.transaction=new TransactionTemplate(manager);
        this.transaction.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_READ_COMMITTED);
    }
    @org.springframework.transaction.annotation.Transactional
    public Preview preview(StoredToken token,Change change) {
        requireConsent(token);
        learning.validate(token.user(),change);
        var before=learning.get(token.user(),change.learningLocale());
        byte[] bytes=new byte[32];random.nextBytes(bytes);
        var raw="idx_confirm_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires=clock.instant().plus(Duration.ofMinutes(5));
        Map<String,Object> args=mapper.convertValue(change,new TypeReference<>(){});
        long id=repository.insertConfirmation(token,TOOL,hash(raw),hash(json(args)),args,expires);
        repository.insertAudit(token,"update_learning_progress",id,"PREVIEW","SUCCESS",UUID.randomUUID().toString(),null,Map.of("operation",change.operation()),null,null,null);
        return new Preview("update_learning_progress",raw,expires,true,before.currentChapterId(),change,
            change.learningLocale().equals("en-CA")
                ? List.of("Saves only your private progress in the current company.","Understood is your declaration; Applied requires a real operation confirmed by its owner.","Does not change business data or certify compliance.")
                : List.of("Guarda únicamente tu avance privado en la empresa actual.","Entendido es una declaración personal; Aplicado requiere una operación real confirmada por su propietario.","No modifica datos empresariales ni certifica cumplimiento."));
    }
    public Committed commit(StoredToken token,Commit request) {
        requireConsent(token);
        if(request==null||request.confirmationToken()==null||!request.confirmationToken().matches("idx_confirm_[A-Za-z0-9_-]{43}")
            ||request.idempotencyKey()==null||request.idempotencyKey().isBlank()||request.idempotencyKey().length()<8||request.idempotencyKey().length()>128)
            throw new IllegalArgumentException("Valid confirmation and idempotency key required.");
        var c=repository.findConfirmation(hash(request.confirmationToken())).orElseThrow(()->new IllegalStateException("confirmation_invalid"));
        if(!TOOL.equals(c.tool())||c.accessTokenId()!=token.id()||c.companyId()!=token.user().companyId()||c.userId()!=token.user().userId()
            ||c.userCompanyId()!=token.user().userCompanyId()) throw new IllegalStateException("confirmation_identity_mismatch");
        var change=mapper.convertValue(c.normalizedArgs(),Change.class);
        learning.validate(token.user(),change);
        var key=hash(request.idempotencyKey());
        var existing=repository.findExecution(c.companyId(),c.userId(),TOOL,key);
        if(existing.isPresent()) return replay(token,c,existing.get());
        if(c.consumedAt()!=null||!c.expiresAt().isAfter(clock.instant())) throw new IllegalStateException("confirmation_unavailable");
        try {
            return transaction.execute(status->{
                learning.validate(token.user(),change);
                var correlation=UUID.randomUUID().toString();
                long id=repository.insertPendingExecution(token,c,key,correlation);
                if(repository.consumeConfirmation(c.id(),clock.instant())!=1) throw new IllegalStateException("confirmation_unavailable");
                var result=learning.update(token.user(),change,change.learningLocale());
                Map<String,Object> stored=mapper.convertValue(result,new TypeReference<>(){});
                if(repository.completeExecution(id,stored,clock.instant())!=1) throw new IllegalStateException("execution_incomplete");
                repository.insertAudit(token,"update_learning_progress",c.id(),"COMMIT","SUCCESS",correlation,key,Map.of("operation",change.operation()),null,null,null);
                return new Committed("update_learning_progress",false,result);
            });
        } catch(DuplicateKeyException failure) {
            return replay(token,c,repository.findExecution(c.companyId(),c.userId(),TOOL,key).orElseThrow(()->failure));
        }
    }
    private Committed replay(StoredToken token,AiActionRepository.Confirmation c,AiActionRepository.Execution e) {
        if(e.confirmationId()!=c.id()||!e.fingerprint().equals(c.fingerprint())||!e.status().equals("COMPLETED")) throw new IllegalStateException("idempotency_key_conflict");
        // Re-project current permissions instead of replaying a stale authorized-content snapshot.
        repository.insertAudit(token,"update_learning_progress",c.id(),"REPLAY","SUCCESS",UUID.randomUUID().toString(),null,Map.of(),null,null,null);
        var change=mapper.convertValue(c.normalizedArgs(),Change.class);
        return new Committed("update_learning_progress",true,learning.get(token.user(),change.learningLocale()));
    }
    public void recordFailure(StoredToken token,String event,int status) {
        repository.insertAudit(token,"update_learning_progress",null,event,"DENIED",UUID.randomUUID().toString(),null,Map.of("status",status),null,null,null);
    }
    private void requireConsent(StoredToken token) {
        if(!token.scopes().contains(com.indice.erp.ai.access.AiAccessTokenService.LEARNING_MANAGE))throw new SecurityException("Explicit learning.manage consent is required.");
    }
    private String json(Object value) { try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalArgumentException("Invalid learning change.",e);} }
    private static String hash(String text) { try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);} }
    public record Preview(String tool,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,String previousChapterId,Change change,List<String> consequences) { }
    public record Commit(String confirmationToken,String idempotencyKey) {
        @com.fasterxml.jackson.annotation.JsonAnySetter public void reject(String field,com.fasterxml.jackson.databind.JsonNode value) { throw new IllegalArgumentException("Unknown commit field: "+field); }
    }
    public record Committed(String tool,boolean replayed,Snapshot progress) { }
}
