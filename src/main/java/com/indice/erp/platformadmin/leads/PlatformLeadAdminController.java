package com.indice.erp.platformadmin.leads;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Update;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-admin/leads")
public class PlatformLeadAdminController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final PlatformLeadService leads;

    public PlatformLeadAdminController(SessionAuthService auth, SessionCsrfService csrf, PlatformLeadService leads) {
        this.auth = auth;
        this.csrf = csrf;
        this.leads = leads;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session,
                                  @RequestParam(name = "q", defaultValue = "") String query,
                                  @RequestParam(name = "status", defaultValue = "") String status) {
        return handle(session, false, null, userId -> leads.list(userId, query, status));
    }

    @GetMapping("/assignees")
    public ResponseEntity<?> assignees(HttpSession session) {
        return handle(session, false, null, leads::assignees);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(HttpSession session, @PathVariable long id) {
        return handle(session, false, null, userId -> leads.detail(userId, id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(HttpSession session, @PathVariable long id,
                                    @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
                                    @RequestBody Update request) {
        return handle(session, true, csrfToken, userId -> leads.update(userId, id, request));
    }

    private ResponseEntity<?> handle(HttpSession session, boolean mutation, String csrfToken,
                                     java.util.function.Function<Long, ?> action) {
        var actor = auth.currentUser(session).orElse(null);
        if (actor == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        if (mutation) {
            try {
                csrf.requireCsrf(session, csrfToken);
            } catch (IllegalArgumentException invalidToken) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Invalid CSRF token."));
            }
        }
        try {
            return ResponseEntity.ok(action.apply(actor.userId()));
        } catch (PlatformAdminForbiddenException | SecurityException denied) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Platform lead access is required."));
        } catch (NoSuchElementException missing) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Lead not found."));
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Map.of("message", invalid.getMessage()));
        } catch (IllegalStateException conflict) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", conflict.getMessage()));
        }
    }
}
