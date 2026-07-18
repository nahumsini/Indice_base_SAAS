package com.indice.erp.kiosk.api;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskCapabilities;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskModuleAuditService;
import com.indice.erp.kiosk.engine.KioskCenterService;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/hr/attendance/kiosks")
public class AttendanceKioskAdminV2Controller {

    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final HrAccessService access;
    private final HrAttendanceService attendance;
    private final KioskRegistryService registry;
    private final KioskGrantService grants;
    private final KioskCenterService center;
    private final AttendanceKioskModuleAuditService moduleAudit;
    private final KioskV2ResponseFactory responses;

    public AttendanceKioskAdminV2Controller(
            SessionAuthService auth,
            SessionCsrfService csrf,
            HrAccessService access,
            HrAttendanceService attendance,
            KioskRegistryService registry,
            KioskGrantService grants,
            KioskCenterService center,
            AttendanceKioskModuleAuditService moduleAudit,
            KioskV2ResponseFactory responses) {
        this.auth = auth;
        this.csrf = csrf;
        this.access = access;
        this.attendance = attendance;
        this.registry = registry;
        this.grants = grants;
        this.center = center;
        this.moduleAudit = moduleAudit;
        this.responses = responses;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var user = requireControl(session);
        return ResponseEntity.ok(responses.success(attendance.listKioskDevices(user), null, null));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        var user = requireWrite(session, csrfToken);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(
            attendance.saveKioskDevice(user, null, payload), null, null));
    }

    @GetMapping("/{kioskId}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long kioskId) {
        var user = requireControl(session);
        requireVisible(user, kioskId);
        var definition = definition(user.companyId(), kioskId);
        return ResponseEntity.ok(responses.success(center.detail(user.companyId(), definition.id()), null, null));
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var user = requireWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            attendance.saveKioskDevice(user, kioskId, payload), null, null));
    }

    @PostMapping("/{kioskId}/rotate-public-access-token")
    public ResponseEntity<?> rotate(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var user = requireWrite(session, csrfToken);
        return ResponseEntity.ok(responses.success(
            attendance.rotateKioskPublicAccessToken(user, kioskId), null, null));
    }

    @PostMapping("/{kioskId}/disable")
    public ResponseEntity<?> disable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.DISABLED);
    }

    @PostMapping("/{kioskId}/enable")
    public ResponseEntity<?> enable(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.ACTIVE);
    }

    @PostMapping("/{kioskId}/revoke")
    public ResponseEntity<?> revoke(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody(required = false) Map<String, Object> payload) {
        return transition(session, csrfToken, kioskId, payload, KioskDefinitionStatus.REVOKED);
    }

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var user = requireWrite(session, csrfToken);
        attendance.deleteKioskDevice(user, kioskId);
        return ResponseEntity.ok(responses.success(Map.of("deleted", true), null, null));
    }

    @GetMapping("/{kioskId}/grants")
    public ResponseEntity<?> listGrants(HttpSession session, @PathVariable long kioskId) {
        var user = requireControl(session);
        requireVisible(user, kioskId);
        return ResponseEntity.ok(responses.success(Map.of(
            "items", grants.list(definition(user.companyId(), kioskId))), null, null));
    }

    @PostMapping("/{kioskId}/grants")
    public ResponseEntity<?> grant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var user = requireWrite(session, csrfToken);
        requireVisible(user, kioskId);
        var result = grants.grant(
            definition(user.companyId(), kioskId),
            String.valueOf(payload.getOrDefault("identity_type", "EMPLOYEE")),
            number(payload.get("identity_id")),
            String.valueOf(payload.getOrDefault("capability_key", "*")),
            user.userId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(responses.success(result, null, null));
    }

    @DeleteMapping("/{kioskId}/grants/{grantId}")
    public ResponseEntity<?> revokeGrant(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @PathVariable long grantId) {
        var user = requireWrite(session, csrfToken);
        requireVisible(user, kioskId);
        grants.revoke(definition(user.companyId(), kioskId), grantId, user.userId());
        return ResponseEntity.ok(responses.success(Map.of("revoked", true), null, null));
    }

    @GetMapping("/{kioskId}/audit")
    public ResponseEntity<?> audit(HttpSession session, @PathVariable long kioskId) {
        var user = requireControl(session);
        requireVisible(user, kioskId);
        var definition = definition(user.companyId(), kioskId);
        var items = new ArrayList<Map<String, Object>>();
        items.addAll(center.audit(user.companyId(), definition.id()));
        items.addAll(moduleAudit.list(user.companyId(), kioskId));
        items.sort(Comparator.comparing(
            item -> String.valueOf(item.getOrDefault("created_at", "")), Comparator.reverseOrder()));
        return ResponseEntity.ok(responses.success(Map.of("items", items), null, null));
    }

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            KioskDefinitionStatus status) {
        var user = requireWrite(session, csrfToken);
        var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
        return ResponseEntity.ok(responses.success(
            attendance.transitionKioskDevice(user, kioskId, status, reason), null, null));
    }

    private AuthSessionUser requireControl(HttpSession session) {
        var user = auth.currentUser(session)
            .orElseThrow(() -> new KioskInternalAccessException(false));
        if (!access.canAccessManagementTab(user, HrTab.CONTROL)) {
            throw new KioskInternalAccessException(true);
        }
        return user;
    }

    private AuthSessionUser requireWrite(HttpSession session, String csrfToken) {
        var user = requireControl(session);
        try {
            csrf.requireCsrf(session, csrfToken);
        } catch (IllegalArgumentException failure) {
            throw new SecurityException("Invalid CSRF token.");
        }
        return user;
    }

    @SuppressWarnings("unchecked")
    private void requireVisible(AuthSessionUser user, long kioskId) {
        var payload = attendance.listKioskDevices(user);
        var items = payload.get("items") instanceof Iterable<?> iterable ? iterable : java.util.List.of();
        for (var candidate : items) {
            if (candidate instanceof Map<?, ?> map && numberOrNull(map.get("id")) != null
                    && numberOrNull(map.get("id")) == kioskId) {
                return;
            }
        }
        throw new com.indice.erp.kiosk.engine.KioskUnavailableException();
    }

    private com.indice.erp.kiosk.engine.KioskResolvedDefinition definition(long companyId, long kioskId) {
        return registry.requireByLegacyReference(
            companyId, AttendanceKioskCapabilities.OWNER_MODULE, kioskId);
    }

    private long number(Object value) {
        var result = numberOrNull(value);
        if (result == null || result <= 0) {
            throw new IllegalArgumentException("identity_id must be numeric.");
        }
        return result;
    }

    private Long numberOrNull(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
