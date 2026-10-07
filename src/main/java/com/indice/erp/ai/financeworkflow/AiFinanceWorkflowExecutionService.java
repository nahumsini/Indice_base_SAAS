package com.indice.erp.ai.financeworkflow;
import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.finance.assistant.FinanceAssistantContracts.Prepared;
import com.indice.erp.finance.assistant.FinanceAssistantService;
import java.time.Clock;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
@Service
public class AiFinanceWorkflowExecutionService {
    private final AiActionRepository repository;private final FinanceAssistantService owner;private final AiFinanceWorkflowAccess access;private final ObjectMapper mapper;private final Clock clock;
    public AiFinanceWorkflowExecutionService(AiActionRepository repository,FinanceAssistantService owner,AiFinanceWorkflowAccess access,ObjectMapper mapper,Clock clock){this.repository=repository;this.owner=owner;this.access=access;this.mapper=mapper;this.clock=clock;}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation){
        var prepared=repository.readConfirmationArgs(confirmation,Prepared.class);access.requireRequest(token,prepared.action(),prepared.change());
        if(!AiFinanceWorkflowActionService.internal(prepared.action()).equals(confirmation.tool()))throw new Conflict("confirmation_tool_mismatch");
        long execution=repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1)throw new Conflict("confirmation_unavailable");
        var result=owner.execute(token.user(),prepared,"mcp:"+correlation);
        Map<String,Object> stored=decimalMap(result);
        if(repository.completeExecution(execution,stored,clock.instant())!=1)throw new IllegalStateException("Finance workflow execution could not be saved.");
        repository.insertAudit(token,prepared.action(),confirmation.id(),"COMMIT","SUCCESS",correlation,key,Map.of("action",prepared.action()),Map.of("action",prepared.action()),null,null);
        return new Committed(prepared.action(),false,correlation,access.project(token,result));
    }
    private Map<String,Object> decimalMap(Object value){try{return mapper.readerFor(new TypeReference<Map<String,Object>>(){}).with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readValue(mapper.writeValueAsString(value));}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Invalid finance state.",e);}}
}
