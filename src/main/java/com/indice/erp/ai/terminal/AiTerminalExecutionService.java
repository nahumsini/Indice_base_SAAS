package com.indice.erp.ai.terminal;
import static com.indice.erp.ai.terminal.AiTerminalContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.pos.assistant.*;
import com.indice.erp.pos.assistant.PosTerminalContracts.*;
import java.time.Clock;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
@Service
@RequiredArgsConstructor
public class AiTerminalExecutionService {
    private final AiActionRepository repository;private final PosTerminalPreparation owner;private final AiTerminalAccess access;
    private final ObjectMapper mapper;private final Clock clock;
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public AiActionRepository.Execution reserve(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation){
        var saved=repository.readConfirmationArgs(confirmation,Prepared.class);access.require(token,saved.action());
        if(!AiTerminalActionService.internal(saved.action()).equals(confirmation.tool()))throw new Conflict("confirmation_tool_mismatch");
        repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1)throw new Conflict("confirmation_unavailable");
        var current=owner.prepare(token.user(),saved.action(),saved.change(),true);
        if(!PosTerminalSnapshots.canonical(saved).equals(PosTerminalSnapshots.canonical(current)))throw new IllegalStateException("Terminal effects changed. Prepare and confirm again.");
        repository.insertAudit(token,saved.action(),confirmation.id(),"RESERVATION","SUCCESS",correlation,key,Map.of("action",saved.action()),null,null,null);
        return repository.findExecution(token.user().companyId(),token.user().userId(),confirmation.tool(),key).orElseThrow();
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public void finish(StoredToken token,AiActionRepository.Confirmation confirmation,AiActionRepository.Execution execution,String key,Result result){
        access.require(token,result.action());Map<String,Object> stored=mapper.convertValue(result,new TypeReference<>(){});
        if(repository.completeExecution(execution.id(),stored,clock.instant())==1)
            repository.insertAudit(token,result.action(),confirmation.id(),"COMMIT","SUCCESS",execution.correlationId(),key,Map.of("action",result.action()),Map.of("paymentCount",result.records().payments().size(),"refundCount",result.records().refunds().size(),"returnCount",result.records().returns().size()),null,null);
    }
}
