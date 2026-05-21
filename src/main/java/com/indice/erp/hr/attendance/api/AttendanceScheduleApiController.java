package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/attendance")
public class AttendanceScheduleApiController extends AttendanceApiControllerSupport {

    public AttendanceScheduleApiController(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService,
        HrAccessService hrAccessService
    ) {
        super(sessionAuthService, hrAttendanceService, hrAccessService);
    }

    @GetMapping("/schedule-templates")
    public ResponseEntity<?> scheduleTemplates(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        return ResponseEntity.ok(hrAttendanceService.listScheduleTemplates(currentUser.get().companyId()));
    }

    @GetMapping("/schedule-candidates")
    public ResponseEntity<?> scheduleCandidates(
        HttpSession session,
        @RequestParam(required = false) String date,
        @RequestParam(name = "effective_end_date", required = false) String effectiveEndDate,
        @RequestParam(name = "end_date", required = false) String endDate,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search,
        @RequestParam(name = "unit_id", required = false) Long unitId,
        @RequestParam(name = "business_id", required = false) Long businessId,
        @RequestParam(name = "available_only", defaultValue = "false") boolean availableOnly
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            var targetDate = date == null || date.isBlank() ? LocalDate.now() : HrAttendanceService.parseDate(date);
            var targetEndDate = effectiveEndDate != null && !effectiveEndDate.isBlank()
                ? HrAttendanceService.parseDate(effectiveEndDate)
                : endDate == null || endDate.isBlank() ? null : HrAttendanceService.parseDate(endDate);
            return ResponseEntity.ok(
                hrAttendanceService.scheduleCandidates(
                    currentUser.get().companyId(),
                    targetDate,
                    targetEndDate,
                    page,
                    size,
                    search,
                    unitId,
                    businessId,
                    availableOnly
                )
            );
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/schedule-templates")
    public ResponseEntity<?> createScheduleTemplate(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.saveScheduleTemplate(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    null,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/schedule-templates/{templateId}")
    public ResponseEntity<?> updateScheduleTemplate(
        HttpSession session,
        @PathVariable long templateId,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.saveScheduleTemplate(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    templateId,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/schedule-assignments/bulk")
    public ResponseEntity<?> bulkAssignScheduleTemplate(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.bulkAssignScheduleTemplate(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
