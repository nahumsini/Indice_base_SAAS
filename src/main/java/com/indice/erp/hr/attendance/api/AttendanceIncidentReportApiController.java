package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.attendance.reports.AttendanceIncidentReportService;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/hr/attendance/incidents")
public class AttendanceIncidentReportApiController {
    private final SessionAuthService auth;
    private final HrAccessService access;
    private final AttendanceIncidentReportService reports;

    public AttendanceIncidentReportApiController(SessionAuthService auth, HrAccessService access,
        AttendanceIncidentReportService reports) {
        this.auth = auth; this.access = access; this.reports = reports;
    }

    @GetMapping
    public ResponseEntity<?> report(HttpSession session, @RequestParam String from, @RequestParam String to,
        @RequestParam(required = false) Long unitId, @RequestParam(required = false) Long businessId,
        @RequestParam(required = false) Long employeeId) {
        var user = auth.currentUser(session);
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        if (!access.canAccessManagementTab(user.get(), HrAccessService.HrTab.CONTROL))
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        try {
            return ResponseEntity.ok(reports.report(user.get(), LocalDate.parse(from), LocalDate.parse(to),
                unitId, businessId, employeeId));
        } catch (HrAccessDeniedException ex) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(404).body(Map.of("message", "Collaborator not found in this period."));
        } catch (IllegalArgumentException | java.time.format.DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Review the selected period and filters. Reports support up to 93 days and 200 collaborators."));
        }
    }
}
