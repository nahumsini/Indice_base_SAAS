package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/attendance")
public class HrAttendanceApiController extends AttendanceApiControllerSupport {

    public HrAttendanceApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        HrAttendanceService hrAttendanceService,
        HrAccessService hrAccessService
    ) {
        super(sessionAuthService, sessionCsrfService, hrAttendanceService, hrAccessService);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(
        HttpSession session,
        @RequestParam(required = false) String date
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
            return ResponseEntity.ok(hrAttendanceService.listDashboard(currentUser.get(), targetDate));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/me/dashboard")
    public ResponseEntity<?> myDashboard(
        HttpSession session,
        @RequestParam(required = false) String date
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canReadAttendance(currentUser.get())) {
            return forbidden();
        }

        try {
            var targetDate = date == null || date.isBlank() ? LocalDate.now() : HrAttendanceService.parseDate(date);
            return ResponseEntity.ok(
                hrAttendanceService.selfDashboard(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    targetDate
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/control-overview")
    public ResponseEntity<?> controlOverview(
        HttpSession session,
        @RequestParam(required = false) String date
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
            return ResponseEntity.ok(hrAttendanceService.controlOverview(currentUser.get(), targetDate));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
