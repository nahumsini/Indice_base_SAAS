package com.indice.erp.ai.hr;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.hr.assistant.HrAssistantService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.announcements.HrAnnouncementApiException;
import com.indice.erp.billing.seats.SeatCapacityExceededException;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Function;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/tools/hr")
public class AiHrApiController {
    private final AiAccessTokenService tokens;
    private final AiHrAccess access;
    private final HrAssistantService owner;
    private final AiHrActionService actions;
    private final AiToolUsageAuditService audit;
    private final com.indice.erp.hr.assistant.HrAssistantRecordsService records;
    private final com.indice.erp.hr.assistant.HrAssistantPermissionsService permissions;
    private final com.indice.erp.hr.assistant.HrAssistantIncentivesService incentives;
    private final com.indice.erp.hr.assistant.HrAssistantAttendanceService attendance;
    private final com.indice.erp.hr.assistant.HrAssistantPayrollService payroll;
    public AiHrApiController(AiAccessTokenService tokens,AiHrAccess access,HrAssistantService owner,AiHrActionService actions,AiToolUsageAuditService audit,com.indice.erp.hr.assistant.HrAssistantRecordsService records,com.indice.erp.hr.assistant.HrAssistantPermissionsService permissions,com.indice.erp.hr.assistant.HrAssistantIncentivesService incentives,com.indice.erp.hr.assistant.HrAssistantAttendanceService attendance,com.indice.erp.hr.assistant.HrAssistantPayrollService payroll) {
        this.tokens=tokens;this.access=access;this.owner=owner;this.actions=actions;this.audit=audit;
        this.records=records;
        this.permissions=permissions;
        this.incentives=incentives;
        this.attendance=attendance;this.payroll=payroll;
    }
    public record ReadRequest(Long id, PageRequest page, String month, String startDate, String endDate, Boolean availableOnly) {
        public ReadRequest(Long id,PageRequest page) { this(id,page,null,null,null,null); }
    }
    @PostMapping("/{tool}")
    public ResponseEntity<?> read(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false) String authorization,@PathVariable String tool,@RequestBody(required=false) ReadRequest request) {
        if(!AiHrAccess.READS.contains(tool)) return ResponseEntity.notFound().build();
        return invoke(authorization,tool,token->{
            var args=request==null?new ReadRequest(null,null):request;
            return switch(tool) {
                case "get_my_attendance_calendar" -> {if(args.id()!=null)throw new IllegalArgumentException("Own calendar does not accept a caller-selected member.");yield attendance.selfCalendar(token.user(),month(args.month()));}
                case "get_my_attendance_events" -> {if(args.id()!=null)throw new IllegalArgumentException("Own events do not accept a caller-selected member.");yield attendance.events(token.user(),null,date(args.startDate()),args.page());}
                case "get_hr_attendance_events" -> attendance.events(token.user(),id(args.id()),date(args.startDate()),args.page());
                case "list_hr_payroll_runs" -> payroll.list(token.user(),args.page());
                case "get_hr_payroll_run" -> payroll.detail(token.user(),id(args.id()));
                case "list_hr_schedule_candidates" -> attendance.candidates(token.user(),date(args.startDate()),args.endDate()==null?null:date(args.endDate()),args.availableOnly(),args.page());
                case "list_hr_schedules" -> attendance.schedules(token.user(),args.page());
                case "get_hr_schedule" -> attendance.schedule(token.user(),id(args.id()));
                case "list_hr_locations" -> attendance.locations(token.user(),args.page());
                case "get_hr_location" -> attendance.location(token.user(),id(args.id()));
                case "get_hr_attendance_calendar" -> attendance.calendar(token.user(),id(args.id()),month(args.month()));
                case "list_hr_incentives" -> incentives.list(token.user(),args.page());
                case "get_hr_incentive" -> incentives.detail(token.user(),id(args.id()));
                case "get_hr_asset_history" -> owner.assetHistory(token.user(),id(args.id()),args.page());
                case "get_announcement_receipts" -> owner.announcementReceipts(token.user(),id(args.id()),args.page());
                case "list_my_hr_permissions","list_hr_permissions" -> permissions.list(token.user(),tool,args.page());
                case "get_my_hr_permission","get_hr_permission" -> permissions.detail(token.user(),id(args.id()),tool.equals("get_hr_permission"));
                case "get_employee_file" -> owner.employee(token.user(),id(args.id()));
                case "list_announcement_audience" -> owner.announcementAudience(token.user(),args.page());
                case "list_hr_organization" -> owner.organization(token.user(),args.page());
                case "list_hr_records" -> records.list(token.user(),args.page());
                case "get_hr_record_detail" -> records.detail(token.user(),id(args.id()));
                case "list_hr_assets" -> owner.assets(token.user(),args.page());
                case "get_hr_asset_detail" -> owner.asset(token.user(),id(args.id()));
                case "list_announcements" -> owner.announcements(token.user(),args.page());
                case "get_announcement_detail" -> owner.announcement(token.user(),id(args.id()));
                default -> throw new IllegalArgumentException("Unsupported HR tool.");
            };
        },true);
    }
    private static java.time.YearMonth month(String value) {
        if(value==null||!value.matches("[0-9]{4}-[0-9]{2}"))throw new IllegalArgumentException("An explicit YYYY-MM month required.");
        try{return java.time.YearMonth.parse(value);}catch(java.time.DateTimeException error){throw new IllegalArgumentException("A valid YYYY-MM month required.");}
    }
    private static java.time.LocalDate date(String value) {
        if(value==null||!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}"))throw new IllegalArgumentException("An explicit YYYY-MM-DD date required.");
        try{return java.time.LocalDate.parse(value);}catch(java.time.DateTimeException error){throw new IllegalArgumentException("A valid YYYY-MM-DD date required.");}
    }
    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false) String authorization,@PathVariable String action,@RequestBody(required=false) Change request) {
        if(!HrAssistantService.ACTIONS.contains(action)) return ResponseEntity.notFound().build();
        return invoke(authorization,action,token->actions.preview(token,action,request),false);
    }
    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false) String authorization,@PathVariable String action,@RequestBody(required=false) AiHrContracts.CommitRequest request) {
        if(!HrAssistantService.ACTIONS.contains(action)) return ResponseEntity.notFound().build();
        return invoke(authorization,action,token->actions.commit(token,action,request),false);
    }
    private ResponseEntity<?> invoke(String authorization,String tool,Function<StoredToken,Object> operation,boolean read) {
        var token=tokens.authenticate(authorization,AiHrAccess.scope(tool));
        if(token.isEmpty()) return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"")
            .body(error("invalid_token","Invalid or insufficiently scoped access token."));
        try {
            access.require(token.get(),tool);
            var result=operation.apply(token.get());
            if(read) audit.recordRead(token.get(),tool,"SUCCESS",200);
            return ResponseEntity.ok(result);
        } catch(SecurityException|HrAccessDeniedException exception) {
            if(read) audit.recordRead(token.get(),tool,"FAILURE",403);
            return ResponseEntity.status(403).body(error("ai_tool_permission_required","Current HR permissions do not allow this operation."));
        } catch(NoSuchElementException exception) {
            if(read) audit.recordRead(token.get(),tool,"FAILURE",404);
            return ResponseEntity.status(404).body(error("not_found","HR object not found in the authorized scope."));
        } catch(AiHrContracts.Conflict exception) {
            return ResponseEntity.status(409).body(error(exception.code(),exception.getMessage()));
        } catch(HrAssistantService.Changed exception) {
            return ResponseEntity.status(409).body(error("hr_record_changed",exception.getMessage()));
        } catch(SeatCapacityExceededException exception) {
            return ResponseEntity.status(409).body(error("seat_capacity_exceeded","There are not enough places available for this employee operation."));
        } catch(HrAnnouncementApiException exception) {
            return ResponseEntity.status(exception.status()).body(error("announcement_access_required","Announcement operation rejected by its owner."));
        } catch(com.indice.erp.hr.permissions.HrPermissionApiException exception) {
            return ResponseEntity.status(exception.status()).body(error("permission_access_required","Permission operation rejected by its owner."));
        } catch(IllegalArgumentException exception) {
            if(read) audit.recordRead(token.get(),tool,"FAILURE",400);
            return ResponseEntity.badRequest().body(error("invalid_request",exception.getMessage()));
        }
    }
    private static long id(Long value) { if(value==null||value<=0) throw new IllegalArgumentException("Positive HR object identifier required.");return value; }
    private static Map<String,String> error(String code,String message) { return Map.of("code",code,"message",message); }
}
