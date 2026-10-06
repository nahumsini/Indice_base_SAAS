package com.indice.erp.ai.hr;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AiHrAccess {
    public static final Set<String> READS = java.util.stream.Stream.concat(java.util.stream.Stream.concat(com.indice.erp.hr.assistant.HrAssistantPayrollService.READS.stream(),com.indice.erp.hr.assistant.HrAssistantAttendanceService.READS.stream()), Set.of("get_hr_asset_history","get_announcement_receipts","list_hr_incentives","get_hr_incentive","list_my_hr_permissions","get_my_hr_permission","list_hr_permissions","get_hr_permission","list_announcement_audience", "list_hr_records", "get_hr_record_detail", "list_hr_organization", "get_employee_file", "list_hr_assets", "get_hr_asset_detail", "list_announcements", "get_announcement_detail").stream()).collect(java.util.stream.Collectors.toUnmodifiableSet());
    private final AiToolAuthorizationService authorization;
    private final HrAccessService hr;
    public AiHrAccess(AiToolAuthorizationService authorization, HrAccessService hr) { this.authorization=authorization; this.hr=hr; }
    public static String scope(String tool) {
        return switch(tool) {
            case "get_my_attendance_calendar","get_my_attendance_events" -> "hr.attendance:read";
            case "get_hr_attendance_events" -> "hr.control.read";
            case "assign_hr_rest_days" -> "hr.attendance.correct";
            case "list_hr_payroll_runs","get_hr_payroll_run" -> "hr.payroll.read";
            case "prepare_hr_payroll","adjust_hr_payroll_line","recalculate_hr_payroll","cancel_hr_payroll" -> "hr.payroll.prepare";
            case "approve_hr_payroll" -> "hr.payroll.approve";
            case "register_hr_payroll_paid" -> "hr.payroll.pay";
            case "list_hr_schedules","get_hr_schedule","list_hr_locations","get_hr_location","get_hr_attendance_calendar","list_hr_schedule_candidates" -> "hr.control.read";
            case "create_hr_schedule","update_hr_schedule","assign_hr_schedule","create_hr_location","update_hr_location","set_hr_allowed_locations","assign_hr_work_site","clear_hr_work_assignments" -> "hr.control.manage";
            case "correct_hr_attendance","record_hr_attendance_event" -> "hr.attendance.correct";
            case "list_hr_incentives","get_hr_incentive" -> "hr.incentives.read";
            case "create_hr_incentive","cancel_hr_incentive" -> "hr.incentives.manage";
            case "list_my_hr_permissions","get_my_hr_permission" -> "hr.permissions.self:read";
            case "list_hr_permissions","get_hr_permission" -> "hr.permissions.read";
            case "create_my_hr_permission","withdraw_my_hr_permission" -> "hr.permissions.request";
            case "approve_hr_permission","reject_hr_permission" -> "hr.permissions.review";
            case "get_employee_file" -> "hr.people.details:read";
            case "list_hr_records", "get_hr_record_detail" -> "hr.records.read";
            case "list_hr_organization" -> "hr.people.manage";
            case "create_employee", "update_employee", "inactivate_employee" -> "hr.people.manage";
            case "terminate_employee" -> "hr.people.terminate";
            case "import_employees" -> "hr.people.import";
            case "list_hr_assets", "get_hr_asset_detail", "get_hr_asset_history" -> "hr.assets.read";
            case "get_announcement_receipts" -> "hr.announcements.receipts:read";
            case "create_hr_asset", "update_hr_asset", "reassign_hr_asset", "change_hr_asset_status" -> "hr.assets.manage";
            case "create_hr_record", "update_hr_record" -> "hr.records.manage";
            case "list_announcements", "get_announcement_detail" -> "hr.announcements.read";
            case "list_announcement_audience", "create_announcement", "update_announcement" -> "hr.announcements.manage";
            case "mark_announcement_read", "mark_announcement_unread" -> "hr.announcements.respond";
            default -> throw new IllegalArgumentException("Unsupported HR tool.");
        };
    }
    public boolean allowed(StoredToken token, String tool) {
        if (!token.scopes().contains(scope(tool))) return false;
        var tab = tool.startsWith("get_my_attendance_")?HrTab.ATTENDANCE:tool.contains("payroll")?HrTab.PAYROLL: com.indice.erp.hr.assistant.HrAssistantAttendanceService.READS.contains(tool)||com.indice.erp.hr.assistant.HrAssistantAttendanceService.ACTIONS.contains(tool)
            ?HrTab.CONTROL
            :tool.contains("incentive")?HrTab.INCENTIVES:tool.contains("permission")?HrTab.PERMISSIONS:tool.contains("announcement") ? HrTab.ANNOUNCEMENTS : tool.contains("asset") ? HrTab.ASSETS : tool.contains("record") ? HrTab.RECORDS : HrTab.COLLABORATORS;
        boolean management = !tool.contains("_my_")&&!Set.of("list_announcements", "get_announcement_detail", "mark_announcement_read", "mark_announcement_unread").contains(tool);
        var payrollAction=tool.equals("approve_hr_payroll")?com.indice.erp.hr.payroll.HrPayrollAuthorizationService.Action.APPROVE:tool.equals("register_hr_payroll_paid")?com.indice.erp.hr.payroll.HrPayrollAuthorizationService.Action.PAY:com.indice.erp.hr.payroll.HrPayrollAuthorizationService.Action.PREPARE;
        if(tool.contains("payroll")&&!READS.contains(tool)&&!new com.indice.erp.hr.payroll.HrPayrollAuthorizationService().can(token.user(),payrollAction))return false;
        return authorization.canReadGuideTab(token.user(), "human_resources", tab.name().toLowerCase(java.util.Locale.ROOT))
            && (management ? hr.canAccessManagementTab(token.user(), tab) : hr.canAccessReadableTab(token.user(), tab));
    }
    public void require(StoredToken token, String tool) {
        if (!allowed(token, tool)) throw new SecurityException("Current HR scope, module and tab permissions required.");
    }
}
