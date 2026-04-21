package com.indice.erp.hr;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.face.FaceVerificationIntegrationException;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/attendance")
public class HrAttendanceApiController {

    private final SessionAuthService sessionAuthService;
    private final HrAttendanceService hrAttendanceService;
    private final HrFaceService hrFaceService;

    public HrAttendanceApiController(
        SessionAuthService sessionAuthService,
        HrAttendanceService hrAttendanceService,
        HrFaceService hrFaceService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.hrAttendanceService = hrAttendanceService;
        this.hrFaceService = hrFaceService;
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

        try {
            var targetDate = date == null || date.isBlank() ? LocalDate.now() : HrAttendanceService.parseDate(date);
            return ResponseEntity.ok(hrAttendanceService.listDashboard(currentUser.get().companyId(), targetDate));
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

        try {
            var targetDate = date == null || date.isBlank() ? LocalDate.now() : HrAttendanceService.parseDate(date);
            return ResponseEntity.ok(hrAttendanceService.controlOverview(currentUser.get().companyId(), targetDate));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/locations")
    public ResponseEntity<?> locations(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrAttendanceService.listControlLocations(currentUser.get().companyId()));
    }

    @PostMapping("/locations")
    public ResponseEntity<?> createLocation(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.saveLocation(
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

    @PutMapping("/locations/{locationId}")
    public ResponseEntity<?> updateLocation(
        HttpSession session,
        @PathVariable long locationId,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.saveLocation(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    locationId,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/locations/{locationId}")
    public ResponseEntity<?> deleteLocation(HttpSession session, @PathVariable long locationId) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            hrAttendanceService.deleteLocation(currentUser.get().companyId(), locationId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/schedule-templates")
    public ResponseEntity<?> scheduleTemplates(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrAttendanceService.listScheduleTemplates(currentUser.get().companyId()));
    }

    @PostMapping("/schedule-templates")
    public ResponseEntity<?> createScheduleTemplate(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
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

    @GetMapping("/kiosk-devices")
    public ResponseEntity<?> kioskDevices(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrAttendanceService.listKioskDevices(currentUser.get().companyId()));
    }

    @PostMapping("/kiosk-devices")
    public ResponseEntity<?> createKioskDevice(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.saveKioskDevice(
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

        try {
            return ResponseEntity.ok(
                hrAttendanceService.saveKioskDevice(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    kioskDeviceId,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/kiosk-devices/{kioskDeviceId}/rotate-public-access-token")
    public ResponseEntity<?> rotateKioskPublicAccessToken(HttpSession session, @PathVariable long kioskDeviceId) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.rotateKioskPublicAccessToken(
                    currentUser.get().companyId(),
                    kioskDeviceId
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/public-kiosk/{deviceToken}/bootstrap")
    public ResponseEntity<?> publicKioskBootstrap(@PathVariable String deviceToken) {
        try {
            return ResponseEntity.ok(hrAttendanceService.publicKioskBootstrap(deviceToken));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/public-kiosk/{deviceToken}/identify")
    public ResponseEntity<?> publicKioskIdentify(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.ok(hrAttendanceService.publicKioskIdentify(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/public-kiosk/{deviceToken}/punch")
    public ResponseEntity<?> publicKioskPunch(@PathVariable String deviceToken, @RequestBody Map<String, Object> payload) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(hrAttendanceService.publicKioskPunch(deviceToken, payload));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/access-profiles")
    public ResponseEntity<?> accessProfiles(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrAttendanceService.listAccessProfiles(currentUser.get().companyId()));
    }

    @PostMapping("/access-profiles")
    public ResponseEntity<?> createAccessProfile(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.saveAccessProfile(
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

    @PutMapping("/access-profiles/{profileId}")
    public ResponseEntity<?> updateAccessProfile(
        HttpSession session,
        @PathVariable long profileId,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.saveAccessProfile(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    profileId,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/access-methods")
    public ResponseEntity<?> accessMethods(HttpSession session) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        return ResponseEntity.ok(hrAttendanceService.listAccessMethods(currentUser.get().companyId()));
    }

    @PostMapping("/access-methods")
    public ResponseEntity<?> createAccessMethod(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.saveAccessMethod(
                    currentUser.get().companyId(),
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

    @PutMapping("/access-methods/{methodId}")
    public ResponseEntity<?> updateAccessMethod(
        HttpSession session,
        @PathVariable long methodId,
        @RequestBody Map<String, Object> payload
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.saveAccessMethod(
                    currentUser.get().companyId(),
                    methodId,
                    payload
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/employees/{employeeId}/calendar")
    public ResponseEntity<?> employeeCalendar(
        HttpSession session,
        @PathVariable long employeeId,
        @RequestParam String month
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            YearMonth targetMonth = HrAttendanceService.parseMonth(month);
            return ResponseEntity.ok(hrAttendanceService.employeeCalendar(currentUser.get().companyId(), employeeId, targetMonth));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/me/calendar")
    public ResponseEntity<?> myCalendar(
        HttpSession session,
        @RequestParam String month
    ) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            YearMonth targetMonth = HrAttendanceService.parseMonth(month);
            return ResponseEntity.ok(
                hrAttendanceService.selfCalendar(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    targetMonth
                )
            );
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/media/presign-upload")
    public ResponseEntity<?> presignUpload(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(hrAttendanceService.createPhotoUpload(currentUser.get().companyId(), payload));
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

    @PostMapping("/me/media/presign-upload")
    public ResponseEntity<?> presignMyUpload(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.ok(
                hrAttendanceService.createSelfPhotoUpload(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    payload
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
                        "employee_id",
                        hrAttendanceService.resolveSelfEmployeeId(
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

    @PostMapping("/kiosk-events")
    public ResponseEntity<?> kioskEvent(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.recordKioskEvent(currentUser.get().companyId(), currentUser.get().userId(), payload)
            );
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/me/kiosk-events")
    public ResponseEntity<?> myKioskEvent(HttpSession session, @RequestBody Map<String, Object> payload) {
        var currentUser = sessionAuthService.currentUser(session);
        if (currentUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                hrAttendanceService.recordSelfKioskEvent(
                    currentUser.get().companyId(),
                    currentUser.get().userId(),
                    payload
                )
            );
        } catch (ObjectStorageDisabledException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/daily-records/{employeeId}/{date}")
    public ResponseEntity<?> updateDailyRecord(
        HttpSession session,
        @PathVariable long employeeId,
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
                    employeeId,
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
