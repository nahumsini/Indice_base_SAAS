package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.processTasks.ProcessTasksRequestGuard;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/process-tasks/kiosks")
public class ProcessTaskKioskApiController {

    private final ProcessTasksRequestGuard guard;
    private final ProcessTaskKioskService kioskService;

    public ProcessTaskKioskApiController(ProcessTasksRequestGuard guard, ProcessTaskKioskService kioskService) {
        this.guard = guard;
        this.kioskService = kioskService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session) {
        var access = guard.requireRead(session);
        if (access.denied()) {
            return access.error();
        }
        return ResponseEntity.ok(kioskService.listKiosks(access.user().companyId()));
    }

    @PostMapping
    public ResponseEntity<?> create(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    kioskService.saveKiosk(access.user().companyId(), access.user().userId(), null, payload));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{kioskId}")
    public ResponseEntity<?> update(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId,
            @RequestBody Map<String, Object> payload) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(kioskService.saveKiosk(
                    access.user().companyId(), access.user().userId(), kioskId, payload));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{kioskId}")
    public ResponseEntity<?> delete(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            kioskService.deleteKiosk(access.user().companyId(), access.user().userId(), kioskId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{kioskId}/rotate-public-access-token")
    public ResponseEntity<?> rotatePublicAccessToken(
            HttpSession session,
            @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
            @PathVariable long kioskId) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            return ResponseEntity.ok(kioskService.rotatePublicAccessToken(
                access.user().companyId(), access.user().userId(), kioskId));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
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

    private ResponseEntity<?> transition(
            HttpSession session,
            String csrfToken,
            long kioskId,
            Map<String, Object> payload,
            KioskDefinitionStatus target) {
        var access = guard.requireWrite(session, csrfToken);
        if (access.denied()) {
            return access.error();
        }
        try {
            var reason = payload == null ? null : String.valueOf(payload.getOrDefault("reason", ""));
            return ResponseEntity.ok(kioskService.transitionKiosk(
                access.user().companyId(), access.user().userId(), kioskId, target, reason));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
