package com.indice.erp.ai.meetings;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.meetings.MeetingAssistantService;
import org.springframework.stereotype.Service;
@Service
public class AiMeetingAccess {
    private final MeetingAssistantService owner;
    public AiMeetingAccess(MeetingAssistantService owner){this.owner=owner;}
    public static String scope(String tool){return (MeetingAssistantService.tab(tool).equals("agreements")?"meeting_agreements":"meetings")+(MeetingAssistantService.ACTIONS.contains(tool)?".manage":".read");}
    public boolean allowed(StoredToken token,String tool){try{require(token,tool);return true;}catch(SecurityException|IllegalArgumentException e){return false;}}
    public void require(StoredToken token,String tool){
        if(!token.scopes().contains(scope(tool)))throw new SecurityException();
        if(tool.equals("delegate_meeting_agreement_task")&&(!token.scopes().contains("tasks.create")||!token.scopes().contains("tasks.delegate")))throw new SecurityException();
        owner.require(token.user(),tool);
    }
}
