package com.indice.erp.ai.files;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.action.AiActionRepository;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.indice.erp.ai.files.AiFileContracts.*;

@Service
public class AiFileExecutionService {
    private final AiFileAccess access;private final AiFileOwnerService owner;private final AiStagedFileRepository files;
    private final AiFileIntakeService intake;private final AiActionRepository repository;private final ObjectMapper mapper;private final Clock clock;
    public AiFileExecutionService(AiFileAccess access,AiFileOwnerService owner,AiStagedFileRepository files,AiFileIntakeService intake,AiActionRepository repository,ObjectMapper mapper,Clock clock) {
        this.access=access;this.owner=owner;this.files=files;this.intake=intake;this.repository=repository;this.mapper=mapper;this.clock=clock;
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Committed execute(StoredToken token,AiActionRepository.Confirmation confirmation,String key,String correlation) {
        var prepared=mapper.convertValue(confirmation.normalizedArgs(),Prepared.class);var purpose=AiFileActionService.purpose(prepared.action());access.require(token,purpose,true);
        if(!AiFileActionService.internal(prepared.action()).equals(confirmation.tool()))throw new Conflict("confirmation_tool_mismatch");
        var file=files.require(token,prepared.file().stagedFileId(),true);AiFileActionService.requireReady(file,purpose,clock.instant());
        if(!file.view().equals(prepared.file()))throw new Conflict("staged_file_changed");
        owner.lock(token.user(),purpose,file.view().targetId());
        var current=owner.target(token.user(),purpose,file.view().targetId());
        if(!current.version().equals(prepared.targetVersion())||!current.name().equals(prepared.targetName()))throw new Conflict("file_target_changed");
        var bytes=intake.verify(file);
        long execution=repository.insertPendingExecution(token,confirmation,key,correlation);
        if(repository.consumeConfirmation(confirmation.id(),clock.instant())!=1)throw new Conflict("confirmation_unavailable");
        long id=owner.register(token.user(),file,bytes);files.attached(file.view().stagedFileId(),id);
        var f=file.view();var result=new Attached(purpose,f.targetId(),id,f.fileName(),f.mimeType(),f.sizeBytes(),f.sha256());
        if(repository.completeExecution(execution,mapper.convertValue(result,new TypeReference<>(){}),clock.instant())!=1)throw new IllegalStateException("File execution was not completed.");
        repository.insertAudit(token,prepared.action(),confirmation.id(),"COMMIT","SUCCESS",correlation,key,Map.of("purpose",purpose.name(),"targetId",f.targetId()),Map.of("attachmentId",id,"sizeBytes",f.sizeBytes()),null,null);
        return new Committed(prepared.action(),false,correlation,result);
    }
}
