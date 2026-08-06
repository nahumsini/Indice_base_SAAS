package com.indice.erp.hr.incentives;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/incentives")
public class HrIncentiveApiController {

    private final SessionAuthService sessionAuthService;
    private final SessionCsrfService sessionCsrfService;
    private final HrAccessService hrAccessService;
    private final HrIncentiveService hrIncentiveService;

    public HrIncentiveApiController(
        SessionAuthService sessionAuthService,
        SessionCsrfService sessionCsrfService,
        HrAccessService hrAccessService,
        HrIncentiveService hrIncentiveService
    ) {
        this.sessionAuthService = sessionAuthService;
        this.sessionCsrfService = sessionCsrfService;
        this.hrAccessService = hrAccessService;
        this.hrIncentiveService = hrIncentiveService;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpSession session, @RequestParam Map<String, String> requestParams) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canManageIncentives(user.get())) {
            return forbidden();
        }

        try {
            var result = hrIncentiveService.listIncentives(user.get(), requestParams);
            var body = new LinkedHashMap<String, Object>();
            body.put("items", result.get("rows"));
            body.put("count", ((java.util.List<?>) result.get("rows")).size());
            body.put("summary", result.get("summary"));
            return ResponseEntity.ok(body);
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @RequestBody Map<String, Object> payload
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canManageIncentives(user.get())) {
            return forbidden();
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(hrIncentiveService.createIncentive(user.get(), payload));
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @DeleteMapping("/{incentiveId}")
    public ResponseEntity<?> delete(
        HttpSession session,
        @RequestHeader(name = "X-CSRF-Token", required = false) String csrfToken,
        @PathVariable long incentiveId
    ) {
        var user = sessionAuthService.currentUser(session);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Unauthorized"));
        }
        if (!canManageIncentives(user.get())) {
            return forbidden();
        }
        var csrfFailure = requireCsrf(session, csrfToken);
        if (csrfFailure != null) {
            return csrfFailure;
        }

        try {
            hrIncentiveService.cancelIncentive(user.get(), incentiveId);
            return ResponseEntity.noContent().build();
        } catch (HrAccessDeniedException ex) {
            return forbidden();
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
        }
    }

    private boolean canManageIncentives(com.indice.erp.auth.AuthSessionUser currentUser) {
        return hrAccessService.canAccessManagementTab(currentUser, HrTab.INCENTIVES);
    }

    private ResponseEntity<?> requireCsrf(HttpSession session, String csrfToken) {
        try {
            sessionCsrfService.requireCsrf(session, csrfToken);
            return null;
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", ex.getMessage()));
        }
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
    }
}
