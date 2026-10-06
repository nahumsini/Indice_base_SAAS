package com.indice.erp.ai.inventory;
import static com.indice.erp.ai.inventory.AiInventoryContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.sales.InventoryAssistantContracts.Prepared;
import com.indice.erp.sales.InventoryAssistantService;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
@Service
public class AiInventoryExecutionService {
    private final AiActionRepository repository;private final InventoryAssistantService owner;private final AiInventoryAccess access;private final ObjectMapper mapper;private final Clock clock;
    public AiInventoryExecutionService(AiActionRepository repository,InventoryAssistantService owner,AiInventoryAccess access,ObjectMapper mapper,Clock clock){this.repository=repository;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation){
        var prepared=mapper.convertValue(confirmation.normalizedArgs(),Prepared.class);access.require(token,prepared.action());
        if(!AiInventoryActionService.internal(prepared.action()).equals(confirmation.tool()))throw new Conflict("confirmation_tool_mismatch");
        long execution=repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1)throw new Conflict("confirmation_unavailable");
        var result=owner.execute(token.user(),prepared,correlation);
        Map<String,Object> stored=mapper.convertValue(result,new TypeReference<>(){});
        if(repository.completeExecution(execution,stored,clock.instant())!=1)throw new IllegalStateException("Inventory workflow execution could not be saved.");
        repository.insertAudit(token,prepared.action(),confirmation.id(),"COMMIT","SUCCESS",correlation,key,Map.of("action",prepared.action()),Map.of("balanceCount",result.records().balances().size(),"movementCount",result.records().movements().size()),null,null);
        return new Committed(prepared.action(),false,correlation,result);
    }
}
