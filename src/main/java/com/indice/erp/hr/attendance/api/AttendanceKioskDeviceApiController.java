package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/v1/hr/attendance")
public class AttendanceKioskDeviceApiController extends AttendanceApiControllerSupport {

    public AttendanceKioskDeviceApiController(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService,
        HrAccessService hrAccessService
    ) {
        super(sessionAuthService, hrAttendanceService, hrAccessService);
    }

    @GetMapping("/kiosk-devices")
    public ResponseEntity<?> kioskDevices(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        return ResponseEntity.ok(hrAttendanceService.listKioskDevices(currentUser.get()));
    }

    @PostMapping("/kiosk-devices")
    public ResponseEntity<?> createKioskDevice(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.saveKioskDevice(
                    currentUser.get(),
                    null,
                    payload
                )
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/kiosk-devices/{kioskDeviceId}")
    public ResponseEntity<?> updateKioskDevice(
        HttpSession session,
        @PathVariable long kioskDeviceId,
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
                hrAttendanceService.saveKioskDevice(
                    currentUser.get(),
                    kioskDeviceId,
                    payload
                )
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/kiosk-devices/{kioskDeviceId}")
    public ResponseEntity<?> deleteKioskDevice(HttpSession session, @PathVariable long kioskDeviceId) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            hrAttendanceService.deleteKioskDevice(currentUser.get(), kioskDeviceId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/kiosk-devices/{kioskDeviceId}/rotate-public-access-token")
    public ResponseEntity<?> rotateKioskPublicAccessToken(HttpSession session, @PathVariable long kioskDeviceId) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canAccessControl(currentUser.get())) {
            return forbidden();
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.rotateKioskPublicAccessToken(
                    currentUser.get(),
                    kioskDeviceId
                )
            );
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }
}
