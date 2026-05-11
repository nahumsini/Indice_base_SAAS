package com.indice.erp.hr.attendance.api;

import com.indice.erp.face.FaceVerificationIntegrationException;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.attendance.KioskPinThrottleException;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/attendance/public-kiosk/{deviceToken}")
public class PublicKioskAttendanceApiController {

    private final HrAttendanceService hrAttendanceService;

    public PublicKioskAttendanceApiController(HrAttendanceService hrAttendanceService) {
        this.hrAttendanceService = hrAttendanceService;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(@PathVariable String deviceToken) {
        try {
            return ResponseEntity.ok(hrAttendanceService.publicKioskBootstrap(deviceToken));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/identify")
    public ResponseEntity<?> identify(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(hrAttendanceService.publicKioskIdentify(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (KioskPinThrottleException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/media/presign-upload")
    public ResponseEntity<?> presignUpload(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(hrAttendanceService.createPublicKioskPhotoUpload(deviceToken, payload));
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

    @PostMapping("/face-verification-sessions")
    public ResponseEntity<?> createFaceVerificationSession(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.createPublicKioskFaceVerificationSession(deviceToken, payload)
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
        @PathVariable String deviceToken,
        @PathVariable long sessionId,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.ok(
                hrAttendanceService.createPublicKioskFaceVerificationCaptureUpload(deviceToken, sessionId, payload)
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
    public ResponseEntity<?> completeFaceVerificationSession(
        @PathVariable String deviceToken,
        @PathVariable long sessionId,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            return ResponseEntity.ok(
                hrAttendanceService.completePublicKioskFaceVerificationSession(deviceToken, sessionId, payload)
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

    @PostMapping("/punch")
    public ResponseEntity<?> punch(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(hrAttendanceService.publicKioskPunch(deviceToken, payload));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
