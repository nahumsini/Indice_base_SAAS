package com.indice.erp.hr.attendance.kiosk.api;

import com.indice.erp.face.FaceVerificationIntegrationException;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskCapabilities;
import com.indice.erp.hr.attendance.kiosk.AttendancePublicKioskEngineGateway;
import com.indice.erp.hr.attendance.kiosk.KioskPinThrottleException;
import com.indice.erp.storage.ObjectStorageDisabledException;
import java.util.Map;
import java.util.NoSuchElementException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.RequestHeader;
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

    private final AttendancePublicKioskEngineGateway gateway;

    public PublicKioskAttendanceApiController(AttendancePublicKioskEngineGateway gateway) {
        this.gateway = gateway;
    }

    @GetMapping("/bootstrap")
    public ResponseEntity<?> bootstrap(
            @PathVariable String deviceToken,
            HttpServletRequest request,
            HttpSession session) {
        try {
            return ResponseEntity.ok(gateway.bootstrap(deviceToken, request, session));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/identify")
    public ResponseEntity<?> identify(
            @PathVariable String deviceToken,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        try {
            return ResponseEntity.ok(gateway.identify(
                deviceToken, csrfToken, payload, request, session));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (KioskPinThrottleException ex) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (SecurityException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/media/presign-upload")
    public ResponseEntity<?> presignUpload(
            @PathVariable String deviceToken,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        try {
            return ResponseEntity.ok(gateway.executeMutation(
                deviceToken, csrfToken, idempotencyKey, AttendanceKioskCapabilities.PHOTO_PRESIGN,
                null, payload, request, session));
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
    public ResponseEntity<?> createFaceVerificationSession(
            @PathVariable String deviceToken,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                gateway.executeMutation(
                    deviceToken, csrfToken, idempotencyKey,
                    AttendanceKioskCapabilities.FACE_VERIFICATION_BEGIN,
                    null, payload, request, session)
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
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody Map<String, Object> payload,
        HttpServletRequest request,
        HttpSession session
    ) {
        try {
            return ResponseEntity.ok(
                gateway.executeMutation(
                    deviceToken, csrfToken, idempotencyKey,
                    AttendanceKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN,
                    sessionId, payload, request, session)
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
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @RequestBody Map<String, Object> payload,
        HttpServletRequest request,
        HttpSession session
    ) {
        try {
            return ResponseEntity.ok(
                gateway.executeMutation(
                    deviceToken, csrfToken, idempotencyKey,
                    AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE,
                    sessionId, payload, request, session)
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
    public ResponseEntity<?> punch(
            @PathVariable String deviceToken,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request,
            HttpSession session) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(gateway.executeMutation(
                deviceToken, csrfToken, idempotencyKey, AttendanceKioskCapabilities.PUNCH_CREATE,
                null, payload, request, session));
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
