package com.indice.erp.ai.posoperations;
import static com.indice.erp.ai.posoperations.AiPosOperationsContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.pos.assistant.PosOperationsContracts.Prepared;
import com.indice.erp.pos.assistant.PosOperationsService;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
@Service
public class AiPosOperationsExecutionService {
    private final AiActionRepository repository;private final PosOperationsService owner;private final AiPosOperationsAccess access;private final ObjectMapper mapper;private final Clock clock;
    public AiPosOperationsExecutionService(AiActionRepository repository,PosOperationsService owner,AiPosOperationsAccess access,ObjectMapper mapper,Clock clock){this.repository=repository;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation){
        var prepared=repository.readConfirmationArgs(confirmation,Prepared.class);access.require(token,prepared.action());
        if(!AiPosOperationsActionService.internal(prepared.action()).equals(confirmation.tool()))throw new Conflict("confirmation_tool_mismatch");
        long execution=repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1)throw new Conflict("confirmation_unavailable");
        var result=owner.execute(token.user(),prepared);
        Map<String,Object> stored=mapper.convertValue(result,new TypeReference<>(){});
        if(repository.completeExecution(execution,stored,clock.instant())!=1)throw new IllegalStateException("POS operations execution could not be saved.");
        repository.insertAudit(token,prepared.action(),confirmation.id(),"COMMIT","SUCCESS",correlation,key,Map.of("action",prepared.action()),Map.of("settlementCount",result.records().settlements().size(),"sourceCount",result.records().sources().size()),null,null);
        return new Committed(prepared.action(),false,correlation,result);
    }
}
