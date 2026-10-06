package com.indice.erp.ai.process;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.processTasks.assistant.ProcessAssistantService;
import org.springframework.stereotype.Service;

@Service
public class AiProcessAccess {
    private final AiToolAuthorizationService authorization;
    public AiProcessAccess(AiToolAuthorizationService authorization){this.authorization=authorization;}
    public static String scope(String tool){
        if(ProcessAssistantService.READS.contains(tool))return tool.equals("list_projects")||tool.equals("get_project")?"projects.read":"processes.read";
        if(!ProcessAssistantService.ACTIONS.contains(tool))throw new IllegalArgumentException("Unsupported workflow tool.");
        return tool.endsWith("_project")?"projects.manage":tool.equals("create_process_run")||tool.equals("generate_process_tasks")?"processes.run":"processes.manage";
    }
    public void require(StoredToken token,String tool){if(!token.scopes().contains(scope(tool))||!authorization.canUseProcessWorkflowTool(token.user(),tool))throw new SecurityException("Current workflow consent, subscription, capability and tab required.");}
}
