package com.indice.erp.hr.attendance.api;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.face.FaceVerificationIntegrationException;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/attendance")
public class AttendanceFaceVerificationApiController {

    private final SessionAuthService sessionAuthService;
    private final HrAttendanceService hrAttendanceService;
    private final HrFaceService hrFaceService;

    public AttendanceFaceVerificationApiController(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService,
        HrFaceService hrFaceService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrAttendanceService = hrAttendanceService;
        this.hrFaceService = hrFaceService;
    }

    @PostMapping("/face-verification-sessions")
    public ResponseEntity<?> createFaceVerificationSession(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrFaceService.createVerificationSession(currentUser.get().companyId(), currentUser.get().userId(), payload)
            );
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FaceVerificationIntegrationException ex) {
            return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/me/face-verification-sessions")
    public ResponseEntity<?> createMyFaceVerificationSession(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrFaceService.createVerificationSession(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    Map.of(
                        "user_company_id",
                        hrAttendanceService.resolveSelfUserCompanyId(
                            currentUser.get().companyId(),
                            currentUser.get().userId()
                        )
                    )
                )
            );
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FaceVerificationIntegrationException ex) {
            return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/face-verification-sessions/{sessionId}/captures/presign-upload")
    public ResponseEntity<?> presignFaceVerificationCapture(
        HttpSession session,
        @PathVariable long sessionId,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrFaceService.createVerificationCaptureUpload(currentUser.get().companyId(), sessionId, payload)
            );
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (FaceVerificationIntegrationException ex) {
            return ResponseEntity.status(ex.statusCode()).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/face-verification-sessions/{sessionId}/complete")
    public ResponseEntity<?> completeFaceVerificationSession(HttpSession session, @PathVariable long sessionId) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrFaceService.completeVerificationSession(currentUser.get().companyId(), currentUser.get().userId(), sessionId)
            );
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
