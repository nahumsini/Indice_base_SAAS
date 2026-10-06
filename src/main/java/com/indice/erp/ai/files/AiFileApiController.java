package com.indice.erp.ai.files;

import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.storage.*;
import java.util.*;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import static com.indice.erp.ai.files.AiFileContracts.*;

@RestController
@RequestMapping("/api/v1/ai/tools/files")
public class AiFileApiController {
    private final AiAccessTokenService tokens;private final AiFileAccess access;private final AiFileOwnerService owner;
    private final AiFileIntakeService intake;private final AiFileActionService actions;private final AiToolUsageAuditService audit;private final AiCommerceReportService reports;
    public AiFileApiController(AiAccessTokenService tokens,AiFileAccess access,AiFileOwnerService owner,AiFileIntakeService intake,AiFileActionService actions,AiToolUsageAuditService audit,AiCommerceReportService reports){this.tokens=tokens;this.access=access;this.owner=owner;this.intake=intake;this.actions=actions;this.audit=audit;this.reports=reports;}
    @PostMapping("/stage_operational_file")
    public ResponseEntity<?> stage(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody StageRequest request){return invoke(bearer,"stage_operational_file","files.attach",t->intake.stage(t,request),false);}
    @PostMapping("/list_operational_files")
    public ResponseEntity<?> list(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody ReadRequest request){return invoke(bearer,"list_operational_files","files.read",t->{requireTarget(request);access.require(t,request.purpose(),false);if(request.attachmentId()!=null)throw new IllegalArgumentException("List does not accept an attachment ID.");return owner.list(t.user(),request.purpose(),request.targetId());},true);}
    @PostMapping("/get_operational_file")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody ReadRequest request){return invoke(bearer,"get_operational_file","files.read",t->{requireTarget(request);access.require(t,request.purpose(),false);return owner.read(t.user(),request);},true);}
    @PostMapping("/export_hr_payroll")
    public ResponseEntity<?> export(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody ExportRequest request){return invoke(bearer,"export_hr_payroll","files.read",t->{if(!access.exportAllowed(t))throw new SecurityException("Current payroll and private file read consent required.");return owner.export(t.user(),request);},true);}
    @PostMapping("/export_commerce_report")
    public ResponseEntity<?> exportCommerce(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@RequestBody AiCommerceReportContracts.Request request){return invoke(bearer,"export_commerce_report","files.read",t->reports.export(t,request),true);}
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody AttachRequest request){if(!AiFileAccess.ACTIONS.containsKey(action))return ResponseEntity.notFound().build();return invoke(bearer,action,"files.attach",t->actions.preview(t,action,request),false);}
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false)String bearer,@PathVariable String action,@RequestBody CommitRequest request){if(!AiFileAccess.ACTIONS.containsKey(action))return ResponseEntity.notFound().build();return invoke(bearer,action,"files.attach",t->actions.commit(t,action,request),false);}
    private ResponseEntity<?> invoke(String bearer,String tool,String scope,Function<StoredToken,Object> operation,boolean read) {
        var token=tokens.authenticate(bearer,scope);
        if(token.isEmpty())return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"").body(error("invalid_token","Valid delegated file consent required."));
        try {var result=operation.apply(token.get());if(read)audit.recordRead(token.get(),tool,"SUCCESS",200);return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL,"no-store").body(result);}
        catch(SecurityException|com.indice.erp.hr.HrAccessDeniedException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",403);return ResponseEntity.status(403).body(error("file_permission_required","Current domain and private file permissions required."));}
        catch(NoSuchElementException e){if(read)audit.recordRead(token.get(),tool,"FAILURE",404);return ResponseEntity.status(404).body(error("file_not_found","File or target not found in the authorized scope."));}
        catch(Conflict e){return ResponseEntity.status(409).body(error(e.code(),e.getMessage()));}
        catch(ObjectStorageDisabledException e){return ResponseEntity.status(409).body(error("file_storage_unavailable","Private file storage is not enabled."));}
        catch(ObjectStorageException e){return ResponseEntity.status(503).body(error("file_storage_unavailable","Private file storage is temporarily unavailable."));}
        catch(com.indice.erp.pos.PosApiException e){return ResponseEntity.status(e.status()).body(error("file_owner_rejected","The current domain owner rejected the file operation."));}
        catch(com.indice.erp.hr.announcements.HrAnnouncementApiException e){return ResponseEntity.status(e.status()).body(error("file_permission_required","Announcement owner rejected the file operation."));}
        catch(com.indice.erp.hr.permissions.HrPermissionApiException e){return ResponseEntity.status(e.status()).body(error("file_permission_required","Permission owner rejected the file operation."));}
        catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(error("invalid_file_request",e.getMessage()));}
    }
    private static void requireTarget(ReadRequest request){if(request==null||request.purpose()==null||request.targetId()==null||request.targetId()<1)throw new IllegalArgumentException("File purpose and positive target required.");}
    private static Map<String,String> error(String code,String message){return Map.of("code",code,"message",message);}
}
