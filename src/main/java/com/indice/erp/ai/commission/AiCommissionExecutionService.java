package com.indice.erp.ai.commission;
import static com.indice.erp.ai.commission.AiCommissionContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.sales.SalesCommissionAssistantContracts.Prepared;
import com.indice.erp.sales.SalesCommissionAssistantService;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
@Service
public class AiCommissionExecutionService {
    private final AiActionRepository repository;private final SalesCommissionAssistantService owner;private final AiCommissionAccess access;private final ObjectMapper mapper;private final Clock clock;
    public AiCommissionExecutionService(AiActionRepository repository,SalesCommissionAssistantService owner,AiCommissionAccess access,ObjectMapper mapper,Clock clock){this.repository=repository;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation){
        var prepared=repository.readConfirmationArgs(confirmation,Prepared.class);access.require(token,prepared.action());
        if(!AiCommissionActionService.internal(prepared.action()).equals(confirmation.tool()))throw new Conflict("confirmation_tool_mismatch");
        long execution=repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1)throw new Conflict("confirmation_unavailable");
        var result=owner.execute(token.user(),prepared);
        Map<String,Object> stored=mapper.convertValue(result,new TypeReference<>(){});
        if(repository.completeExecution(execution,stored,clock.instant())!=1)throw new IllegalStateException("Sales commissions execution could not be saved.");
        repository.insertAudit(token,prepared.action(),confirmation.id(),"COMMIT","SUCCESS",correlation,key,Map.of("action",prepared.action()),Map.of("cutCount",result.records().cuts().size(),"scheduleCount",result.records().schedules().size()),null,null);
        return new Committed(prepared.action(),false,correlation,result);
    }
}
