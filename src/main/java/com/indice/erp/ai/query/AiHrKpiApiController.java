package com.indice.erp.ai.query;
import com.indice.erp.ai.access.*;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.kpis.HrKpiService;
import com.indice.erp.hr.kpis.HrKpiContracts.*;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/ai/tools/kpis")
public class AiHrKpiApiController {
    private final AiAccessTokenService tokens;private final AiToolAuthorizationService authorization;private final HrAccessService hr;private final HrKpiService owner;private final AiToolUsageAuditService audit;
    public AiHrKpiApiController(AiAccessTokenService tokens,AiToolAuthorizationService authorization,HrAccessService hr,HrKpiService owner,AiToolUsageAuditService audit){this.tokens=tokens;this.authorization=authorization;this.hr=hr;this.owner=owner;this.audit=audit;}
    @PostMapping("/get_hr_kpis")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody Request request){
        var token=tokens.authenticate(bearer,"hr.kpis:read");if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(Map.of("code","invalid_token"));
        var t=token.get();try{
            if(!allowed(t,HrTab.KPIS))throw new SecurityException();
            var access=new Availability(allowed(t,HrTab.COLLABORATORS),allowed(t,HrTab.CONTROL),allowed(t,HrTab.ASSETS),allowed(t,HrTab.RECORDS),allowed(t,HrTab.PERMISSIONS));
            var result=owner.measure(t.user(),request,access);audit.recordRead(t,"get_hr_kpis","SUCCESS",200);return ResponseEntity.ok(result);
        }catch(SecurityException|com.indice.erp.hr.HrAccessDeniedException e){audit.recordRead(t,"get_hr_kpis","FAILURE",403);return ResponseEntity.status(403).body(Map.of("code","hr_kpi_permission_required"));}
        catch(IllegalArgumentException e){audit.recordRead(t,"get_hr_kpis","FAILURE",400);return ResponseEntity.badRequest().body(Map.of("code","invalid_request","message",e.getMessage()));}
        catch(IllegalStateException e){audit.recordRead(t,"get_hr_kpis","FAILURE",409);return ResponseEntity.status(409).body(Map.of("code","incomplete_hr_kpi_source","message","Repeat this KPI query using complete current sources."));}
    }
    private boolean allowed(AiAccessTokenRepository.StoredToken t,HrTab tab){return authorization.canReadGuideTab(t.user(),"human_resources",tab.name().toLowerCase(java.util.Locale.ROOT))&&hr.canAccessManagementTab(t.user(),tab);}
}
