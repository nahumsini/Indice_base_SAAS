package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/attendance")
public class AttendanceDailyRecordApiController extends AttendanceApiControllerSupport {

    public AttendanceDailyRecordApiController(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService
    ) {
        super(sessionAuthService, hrAttendanceService);
    }

    @PutMapping("/daily-records/{userCompanyId}/{date}")
    public ResponseEntity<?> updateDailyRecord(
        HttpSession session,
        @PathVariable long userCompanyId,
        @PathVariable String date,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var targetDate = HrAttendanceService.parseDate(date);
            return ResponseEntity.ok(
                hrAttendanceService.updateDailyRecord(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    userCompanyId,
                    targetDate,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/daily-records/{userCompanyId}/{date}/manual-events")
    public ResponseEntity<?> recordManualDailyEvent(
        HttpSession session,
        @PathVariable long userCompanyId,
        @PathVariable String date,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var targetDate = HrAttendanceService.parseDate(date);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.recordManualAttendanceEvent(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    userCompanyId,
                    targetDate,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/me/daily-records/{date}")
    public ResponseEntity<?> updateMyDailyRecord(
        HttpSession session,
        @PathVariable String date,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            var targetDate = HrAttendanceService.parseDate(date);
            return ResponseEntity.ok(
                hrAttendanceService.updateSelfDailyRecord(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    targetDate,
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
