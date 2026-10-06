package com.indice.erp.ai.hr;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.hr.assistant.HrAssistantContracts.Prepared;
import com.indice.erp.hr.assistant.HrAssistantService;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.ai.hr.AiHrContracts.*;

@Service
public class AiHrExecutionService {
    private final AiActionRepository repository;
    private final HrAssistantService owner;
    private final AiHrAccess access;
    private final ObjectMapper mapper;
    private final Clock clock;
    public AiHrExecutionService(AiActionRepository repository,HrAssistantService owner,AiHrAccess access,ObjectMapper mapper,Clock clock) {
        this.repository=repository;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation) {
        var prepared=mapper.convertValue(confirmation.normalizedArgs(),Prepared.class);
        access.require(token,prepared.action());
        if(!AiHrActionService.internal(prepared.action()).equals(confirmation.tool())) throw new Conflict("confirmation_tool_mismatch");
        long execution=repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1) throw new Conflict("confirmation_unavailable");
        var result=owner.execute(token.user(),prepared);
        Map<String,Object> stored=mapper.convertValue(result,new TypeReference<>(){});
        if(repository.completeExecution(execution,stored,clock.instant())!=1) throw new IllegalStateException("HR execution was not completed.");
        repository.insertAudit(token,prepared.action(),confirmation.id(),"COMMIT","SUCCESS",correlation,key,Map.of("action",prepared.action()),Map.of("employeeCount",result.employees().size()),null,null);
        return new Committed(prepared.action(),false,correlation,result);
    }
}
